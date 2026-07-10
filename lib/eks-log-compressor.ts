/**
 * EKS Log Compressor — v2
 *
 * Zero-dependency utility that aggressively normalises and compresses raw EKS /
 * Kubernetes log lines before they are sent to an LLM.
 * Goal: maximum signal-to-noise at minimum token cost.
 *
 * Pipeline:
 *   1. Strip comment / annotation / header lines (# …, column headers, etc.)
 *   2. Parse each line (plain text or Fluent Bit JSON).
 *   3. Filter health-check and pure-noise lines.
 *   4. Redact tokens that add length without diagnostic value
 *      (UUIDs, full ARNs → short form, long hostnames → cluster id, request IDs).
 *   5. Truncate stack traces to the error class + first 2 frames.
 *   6. Deduplicate: consecutive identical messages AND non-consecutive
 *      same-level/same-component/same-message runs (global dedup for WARN/ERROR).
 *   7. Emit each entry as a compact `[HH:MM:SS|LEVEL|COMP] MSG [xN]` line.
 *   8. Drop pure-INFO lines that carry no anomaly keywords when errors exist.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single raw EKS log entry — either the raw text line or a parsed JSON object. */
export type EksRawLog = string | Record<string, unknown>

/** Normalised intermediate shape after parsing. */
export type CompressedEntry = {
  timestamp: string
  level: string
  component: string
  message: string
}

/** Final output of compressEksLogs(). */
export type CompressResult = {
  /** The compressed log string ready to be sent to the LLM. */
  compressed: string
  originalChars: number
  compressedChars: number
  /** Percentage reduction, e.g. 72 means 72% fewer characters. */
  reductionPct: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Lines to discard outright before any parsing. */
const COMMENT_LINE_RE = /^\s*#/

/** Tabular / column-header lines (kubectl events header, CloudWatch metric header). */
const HEADER_LINE_RE = /^(LAST\s+SEEN|Time\s+CPU|NAMESPACE|NAME\s+READY|AGE\s+)/i

/** Health-check paths and probe user-agents — discard entirely. */
const NOISE_PATTERNS = [
  /\/healthz/i,
  /\/readyz/i,
  /\/livez/i,
  /kube-probe/i,
  /liveness_check/i,
  /health_check/i,
  /ELB-HealthChecker/i,
]

/** Purely numeric metric rows, e.g. "02:00Z    24%   191   6.0 GB  20 ms  0.5" */
const METRIC_ROW_RE = /^\d{2}:\d{2}Z\s+\d+%/

/** Strings that indicate the start of a Java / Python / Node stack trace. */
const STACK_TRACE_HEADERS = [
  /^\s{2,}at\s/,                           // Java / Node "  at ..."
  /^\s{2,}File\s"/,                        // Python '  File "..."'
  /Traceback \(most recent call last\)/i,
  /^\s{2,}\.\.\./,                         // truncated frames
]

const MAX_STACK_FRAMES = 2

/** Regex to extract a leading ISO-8601 or HH:MM timestamp from a line. */
const ISO_TS_RE = /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/
const SHORT_TS_RE = /^(\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)/

/** Known log level keywords (ordered most → least specific). */
const LEVEL_RE =
  /\b(CRITICAL|FATAL|ALERT|EMERG|ERROR|ERR|WARNING|WARN|NOTICE|INFO|DEBUG|TRACE)\b/i

/** AWS ARN — replace with just the resource segment (last two slash-separated parts). */
const ARN_RE = /arn:aws[a-z-]*:[a-z0-9-]+:[a-z0-9-]*:\d*:([^\s,'")\]]+)/g

/** Full UUIDs (request IDs, trace IDs) — replace with short hash. */
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi

/** Long AWS/RDS hostnames — keep only the cluster/instance identifier. */
const LONG_HOST_RE =
  /([a-z0-9-]+)\.cluster-[a-z0-9]+\.[a-z0-9-]+\.rds\.amazonaws\.com/gi

/** kubectl events tabular row — parse structured fields out of the fixed columns. */
const EVENTS_ROW_RE =
  /^(\d{2}:\d{2}(?::\d{2})?)\s+(Normal|Warning)\s+(\S+)\s+(\S+)\s+(.+)$/

/** Anomaly keywords: INFO lines containing any of these are kept even in noise-drop mode. */
const ANOMALY_KEYWORDS =
  /\b(error|fail|crash|panic|timeout|refused|denied|exception|unavailable|oom|killed|evict|backoff|unauthorized|forbidden|invalid|corrupt|lost|disconnect|retry|unhealthy)\b/i

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNoise(line: string): boolean {
  return NOISE_PATTERNS.some((re) => re.test(line))
}

function normaliseLevel(raw: string): string {
  const u = raw.toUpperCase()
  if (["CRITICAL", "FATAL", "ALERT", "EMERG"].includes(u)) return "ERROR"
  if (["WARNING", "NOTICE"].includes(u)) return "WARN"
  if (u === "ERR") return "ERROR"
  if (u === "TRACE") return "DEBUG"
  return u
}

function extractTimestamp(text: string): string {
  const iso = text.match(ISO_TS_RE)
  if (iso) {
    const raw = iso[1].replace(" ", "T")
    const d = new Date(raw.endsWith("Z") ? raw : raw + "Z")
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(11, 19) + "Z"
    return iso[1]
  }
  const short = text.match(SHORT_TS_RE)
  if (short) return short[1]
  return "?"
}

/**
 * Redact high-entropy, token-expensive tokens that carry no extra LLM signal:
 *  - Full AWS ARNs  → resource/name
 *  - UUIDs          → first 8 hex chars
 *  - Long RDS hosts → cluster-id:port
 */
function redactTokens(msg: string): string {
  return msg
    .replace(ARN_RE, (_match, resource) => {
      // Keep only the last two slash-separated segments: e.g. "role/orders-api-irsa"
      const parts = resource.replace(/\/$/, "").split("/")
      return parts.slice(-2).join("/")
    })
    .replace(UUID_RE, (m) => m.slice(0, 8))
    .replace(LONG_HOST_RE, (_m, id) => `${id}:rds`)
}

// ─── Stack trace truncation ───────────────────────────────────────────────────

/**
 * Keep only the exception class + first MAX_STACK_FRAMES frames.
 * Everything else is replaced with a single count summary.
 */
function truncateStackTrace(message: string): string {
  const lines = message.split("\n")
  let stackStart = -1
  for (let i = 0; i < lines.length; i++) {
    if (STACK_TRACE_HEADERS.some((re) => re.test(lines[i]))) {
      stackStart = i
      break
    }
  }
  if (stackStart === -1) return message

  const prefix = lines.slice(0, stackStart)
  const stack = lines.slice(stackStart)
  const kept = stack.slice(0, MAX_STACK_FRAMES)
  const dropped = stack.length - MAX_STACK_FRAMES
  if (dropped > 0) kept.push(`[+${dropped} frames]`)
  return [...prefix, ...kept].join("\n")
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a single raw EKS log entry (plain text or JSON) into a CompressedEntry.
 * Returns null for lines that should be discarded.
 */
export function parseEksLog(raw: EksRawLog): CompressedEntry | null {
  if (typeof raw === "string") {
    const line = raw.trim()
    if (!line) return null

    // Strip pure comment / annotation lines.
    if (COMMENT_LINE_RE.test(line)) return null
    if (HEADER_LINE_RE.test(line)) return null
    if (METRIC_ROW_RE.test(line)) return null
    if (isNoise(line)) return null

    // Try to parse as JSON first (Fluent Bit JSON output).
    if (line.startsWith("{")) {
      try {
        return parseEksLog(JSON.parse(line) as Record<string, unknown>)
      } catch {
        // fall through to text parsing
      }
    }

    // kubectl events tabular row
    const evtMatch = line.match(EVENTS_ROW_RE)
    if (evtMatch) {
      const [, ts, evtType, reason, object, evtMsg] = evtMatch
      const level = evtType === "Warning" ? "WARN" : "INFO"
      // object: "pod/orders-api-7c9f8b6d5f-nqx2p" → strip the long pod hash for brevity
      const comp = object.replace(/-[a-z0-9]{5}-[a-z0-9]{5}$/, "").replace(/-[a-z0-9]{10}$/, "")
      return {
        timestamp: ts,
        level,
        component: comp,
        message: `${reason}: ${evtMsg.trim()}`,
      }
    }

    // Plain text log line.
    const levelMatch = line.match(LEVEL_RE)
    const level = levelMatch ? normaliseLevel(levelMatch[1]) : "INFO"
    const timestamp = extractTimestamp(line)

    let message = line
      .replace(ISO_TS_RE, "")
      .replace(LEVEL_RE, "")
      .replace(/^\s*[\[\(]?\s*[\]\)]?\s*[-:]\s*/, "")
      .trim()

    if (!message) return null
    return { timestamp, level, component: "", message }
  }

  // ── JSON object (Fluent Bit / CloudWatch Logs Insights) ──────────────────
  const obj = raw as Record<string, unknown>
  const rawStr = JSON.stringify(obj)
  if (isNoise(rawStr)) return null

  const tsRaw =
    (obj.time as string | undefined) ??
    (obj.timestamp as string | undefined) ??
    (obj["@timestamp"] as string | undefined) ??
    ((obj.log as Record<string, unknown> | undefined)?.time as string | undefined) ??
    ""
  const timestamp = tsRaw ? extractTimestamp(tsRaw) : "?"

  const levelRaw =
    (obj.level as string | undefined) ??
    (obj.severity as string | undefined) ??
    (obj.log_level as string | undefined) ??
    ""
  const level = levelRaw
    ? normaliseLevel(levelRaw)
    : (() => {
        const m = rawStr.match(LEVEL_RE)
        return m ? normaliseLevel(m[1]) : "INFO"
      })()

  const component =
    (obj.logger as string | undefined) ??
    (obj.component as string | undefined) ??
    ((obj.kubernetes as Record<string, unknown> | undefined)?.container_name as string | undefined) ??
    (obj.source as string | undefined) ??
    ""

  const message =
    (obj.message as string | undefined) ??
    (obj.msg as string | undefined) ??
    (obj.log as string | undefined) ??
    ""

  if (!message.trim()) return null

  return {
    timestamp,
    level,
    component: typeof component === "string" ? component : "",
    message: message.trim(),
  }
}

// ─── Serialiser ───────────────────────────────────────────────────────────────

function serialise(entry: CompressedEntry, count: number): string {
  const countSuffix = count > 1 ? ` [x${count}]` : ""
  const comp = entry.component ? `${entry.component}|` : ""
  const msg = redactTokens(truncateStackTrace(entry.message))
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ↵ ")
  return `[${entry.timestamp}|${entry.level}|${comp}] ${msg}${countSuffix}`
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Compress an array of raw EKS log entries.
 *
 * @param logs  Array of raw log lines (string) or parsed JSON objects.
 * @returns     CompressResult with the compressed string and reduction metrics.
 */
export function compressEksLogs(logs: EksRawLog[]): CompressResult {
  const originalChars = logs.reduce(
    (n, l) => n + (typeof l === "string" ? l.length : JSON.stringify(l).length),
    0,
  )

  // 1. Parse + filter noise
  const parsed: CompressedEntry[] = []
  for (const raw of logs) {
    const entry = parseEksLog(raw)
    if (entry) parsed.push(entry)
  }

  // 2. Consecutive deduplication (run-length encoding)
  type Run = { entry: CompressedEntry; count: number }
  const runs: Run[] = []
  for (const entry of parsed) {
    const key = `${entry.level}|${entry.component}|${entry.message}`
    const last = runs[runs.length - 1]
    const lastKey = last
      ? `${last.entry.level}|${last.entry.component}|${last.entry.message}`
      : ""
    if (last && lastKey === key) {
      last.count++
    } else {
      runs.push({ entry, count: 1 })
    }
  }

  // 3. Global dedup for WARN/ERROR: collapse non-consecutive identical events
  //    into the first occurrence, accumulating count.
  const seen = new Map<string, Run>()
  const deduped: Run[] = []
  for (const run of runs) {
    if (run.entry.level === "WARN" || run.entry.level === "ERROR") {
      const key = `${run.entry.level}|${run.entry.component}|${run.entry.message}`
      const existing = seen.get(key)
      if (existing) {
        existing.count += run.count
        continue // skip — already represented by first occurrence
      }
      seen.set(key, run)
    }
    deduped.push(run)
  }

  // 4. Drop pure-INFO lines with no anomaly signal when errors/warnings exist
  const hasAnomalies = deduped.some(
    (r) => r.entry.level === "ERROR" || r.entry.level === "WARN",
  )
  const filtered = hasAnomalies
    ? deduped.filter(
        (r) =>
          r.entry.level !== "INFO" ||
          ANOMALY_KEYWORDS.test(r.entry.message) ||
          ANOMALY_KEYWORDS.test(r.entry.component),
      )
    : deduped

  // 5. Serialise
  const lines = filtered.map(({ entry, count }) => serialise(entry, count))
  const compressed = lines.join("\n")
  const compressedChars = compressed.length

  const reductionPct =
    originalChars === 0
      ? 0
      : Math.round(((originalChars - compressedChars) / originalChars) * 100)

  return { compressed, originalChars, compressedChars, reductionPct }
}
