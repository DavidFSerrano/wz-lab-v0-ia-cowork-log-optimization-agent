/**
 * EKS Log Compressor
 *
 * A zero-dependency utility that normalizes and compresses raw EKS / Kubernetes
 * log lines before they are sent to an LLM. The goal is maximum signal-to-noise
 * at minimum token cost.
 *
 * Pipeline:
 *   1. Parse each line (plain text or JSON from the Fluent Bit / CloudWatch
 *      Logs Insights format used in EKS).
 *   2. Filter health-check noise (/healthz, /readyz, /livez, kube-probe).
 *   3. Deduplicate consecutive identical messages (collapse with repeat counter).
 *   4. Truncate long stack traces (keep first 3 lines + summary).
 *   5. Emit each entry as a compact `[TIME|LEVEL|COMP] MSG` single line.
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

/** Health-check paths and probe user-agents to discard entirely. */
const NOISE_PATTERNS = [
  /\/healthz/i,
  /\/readyz/i,
  /\/livez/i,
  /kube-probe/i,
  /liveness_check/i,
  /health_check/i,
  /ELB-HealthChecker/i,
]

/** Strings that indicate the start of a Java / Python / Node stack trace. */
const STACK_TRACE_HEADERS = [
  /^\s+at\s/,         // Java / Node "  at ..."
  /^\s+File\s"/,      // Python "  File "..."
  /Traceback \(most recent call last\)/i,
  /^\s+\.\.\./,       // truncated frames
]

const MAX_STACK_LINES = 3

/** Regex to extract a leading ISO-8601 timestamp from a line. */
const ISO_TS_RE = /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/

/** Known log level keywords (ordered most → least specific). */
const LEVEL_RE =
  /\b(CRITICAL|FATAL|ALERT|EMERG|ERROR|ERR|WARNING|WARN|NOTICE|INFO|DEBUG|TRACE)\b/i

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNoise(line: string): boolean {
  return NOISE_PATTERNS.some((re) => re.test(line))
}

function normaliseLevel(raw: string): string {
  const u = raw.toUpperCase()
  if (u === "CRITICAL" || u === "FATAL" || u === "ALERT" || u === "EMERG") return "ERROR"
  if (u === "WARNING" || u === "NOTICE") return "WARN"
  if (u === "ERR") return "ERROR"
  if (u === "TRACE") return "DEBUG"
  return u // INFO | WARN | ERROR | DEBUG
}

function extractTimestamp(text: string): string {
  const m = text.match(ISO_TS_RE)
  if (!m) return "?"
  const raw = m[1].replace(" ", "T")
  const d = new Date(raw.endsWith("Z") ? raw : raw + "Z")
  if (Number.isNaN(d.getTime())) return m[1]
  // Compact: drop date if same day context is implicit; keep HH:MM:SS
  return d.toISOString().slice(11, 19) + "Z"
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a single raw EKS log entry (plain text or JSON) into a CompressedEntry.
 * Returns null for lines that should be discarded (noise, empty).
 */
export function parseEksLog(raw: EksRawLog): CompressedEntry | null {
  if (typeof raw === "string") {
    const line = raw.trim()
    if (!line || isNoise(line)) return null

    // Try to parse as JSON first (Fluent Bit JSON output).
    if (line.startsWith("{")) {
      try {
        return parseEksLog(JSON.parse(line) as Record<string, unknown>)
      } catch {
        // fall through to text parsing
      }
    }

    // Plain text log line.
    const levelMatch = line.match(LEVEL_RE)
    const level = levelMatch ? normaliseLevel(levelMatch[1]) : "INFO"
    const timestamp = extractTimestamp(line)

    // Strip the timestamp and level token from the message to avoid repetition.
    let message = line
      .replace(ISO_TS_RE, "")
      .replace(LEVEL_RE, "")
      .replace(/^\s*[\[\(]?\s*[\]\)]?\s*[-:]\s*/, "") // strip leading punctuation
      .trim()

    if (!message) return null

    return { timestamp, level, component: "", message }
  }

  // ── JSON object (Fluent Bit / CloudWatch Logs Insights format) ────────────
  const obj = raw as Record<string, unknown>

  // Discard if it's a health-check request.
  const rawStr = JSON.stringify(obj)
  if (isNoise(rawStr)) return null

  // Timestamp: common field names used by EKS log shippers.
  const tsRaw =
    (obj.time as string | undefined) ??
    (obj.timestamp as string | undefined) ??
    (obj["@timestamp"] as string | undefined) ??
    ((obj.log as Record<string, unknown> | undefined)?.time as string | undefined) ??
    ""
  const timestamp = tsRaw ? extractTimestamp(tsRaw) : "?"

  // Level
  const levelRaw =
    (obj.level as string | undefined) ??
    (obj.severity as string | undefined) ??
    (obj.log_level as string | undefined) ??
    ""
  const level = levelRaw ? normaliseLevel(levelRaw) : (() => {
    const m = rawStr.match(LEVEL_RE)
    return m ? normaliseLevel(m[1]) : "INFO"
  })()

  // Component / logger name
  const component =
    (obj.logger as string | undefined) ??
    (obj.component as string | undefined) ??
    ((obj.kubernetes as Record<string, unknown> | undefined)?.container_name as string | undefined) ??
    (obj.source as string | undefined) ??
    ""

  // Message
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

// ─── Stack trace truncation ───────────────────────────────────────────────────

/**
 * Given a multi-line message that may contain a stack trace, keep the first
 * MAX_STACK_LINES stack frames and replace the rest with a summary.
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
  if (stackStart === -1) return message // no stack trace found

  const prefix = lines.slice(0, stackStart)
  const stack = lines.slice(stackStart)
  const kept = stack.slice(0, MAX_STACK_LINES)
  const dropped = stack.length - MAX_STACK_LINES
  if (dropped > 0) {
    kept.push(`  [...${dropped} more lines truncated]`)
  }
  return [...prefix, ...kept].join("\n")
}

// ─── Serialiser ───────────────────────────────────────────────────────────────

/** Emit a CompressedEntry as a compact single line. */
function serialise(entry: CompressedEntry, count: number): string {
  const countSuffix = count > 1 ? ` [x${count}]` : ""
  const comp = entry.component ? `${entry.component}|` : ""
  const msg = truncateStackTrace(entry.message)
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

  // 2. Consecutive deduplication
  type Run = { entry: CompressedEntry; count: number }
  const runs: Run[] = []
  for (const entry of parsed) {
    const key = `${entry.level}|${entry.component}|${entry.message}`
    if (runs.length > 0 && `${runs[runs.length - 1].entry.level}|${runs[runs.length - 1].entry.component}|${runs[runs.length - 1].entry.message}` === key) {
      runs[runs.length - 1].count++
    } else {
      runs.push({ entry, count: 1 })
    }
  }

  // 3. Serialise
  const lines = runs.map(({ entry, count }) => serialise(entry, count))
  const compressed = lines.join("\n")
  const compressedChars = compressed.length

  const reductionPct =
    originalChars === 0
      ? 0
      : Math.round(((originalChars - compressedChars) / originalChars) * 100)

  return { compressed, originalChars, compressedChars, reductionPct }
}
