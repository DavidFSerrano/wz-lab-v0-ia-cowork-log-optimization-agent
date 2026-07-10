// Log optimizer — runs on RAW logs at the ingest boundary, BEFORE the frozen
// RAG pipeline (chunk -> embed -> store) in lib/logs-pipeline.ts.
//
// Goal: cut embedding tokens and noise WITHOUT destroying diagnostic signal.
// We deliberately KEEP timestamps, error messages, resource identifiers (ARNs,
// KMS key ids, request ids, pod names), exit codes, etc. — those are exactly
// what the SRE agent needs to reason about. We only remove pure noise and
// redact secrets/PII.
//
// Two modes, auto-detected:
//   - JSON payloads (CloudTrail-style): parsed, string values scrubbed for
//     secrets, then re-serialized so the chunker's per-record split still works.
//   - Text logs: whitespace normalized, ANSI stripped, consecutive duplicates
//     collapsed (huge win for CrashLoopBackOff spam), noise lines dropped.
//
// The transform is idempotent and safe to skip (?optimize=false on the endpoint).

export type OptimizeStats = {
  format: "json" | "text"
  originalBytes: number
  optimizedBytes: number
  savedBytes: number
  savedPct: number
  originalLines: number
  optimizedLines: number
  duplicatesCollapsed: number
  noiseLinesDropped: number
  secretsRedacted: number
}

export type OptimizeResult = {
  optimized: string
  stats: OptimizeStats
}

// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g

// Secret / credential patterns. Each replacement preserves the "shape" of the
// line (the key stays, the value becomes a redaction marker).
//
// IMPORTANT: these are deliberately conservative. We must NOT redact infra
// identifiers such as ARNs (arn:aws:...:secret:orders-db-xxxx) — those are
// diagnostic metadata, not credentials. The key match therefore refuses to
// fire when preceded by ARN separators, and the value refuses to match `arn:`.
const SECRET_PATTERNS: Array<{ re: RegExp; replace: string }> = [
  // key=value / key: value style secrets (not ARNs, not empty)
  {
    re: /(?<![:\w./-])(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|client[_-]?secret|authorization)(\s*[:=]\s*)("?)(?!arn:)([^\s"',}]+)(\3)/gi,
    replace: "$1$2$3[REDACTED]$5",
  },
  // Bearer tokens
  { re: /\b(Bearer\s+)[A-Za-z0-9._~+/-]{8,}=*/gi, replace: "$1[REDACTED]" },
  // JWTs
  { re: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, replace: "[REDACTED_JWT]" },
  // AWS long-lived / temporary access key ids
  { re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, replace: "[REDACTED_AWS_KEY]" },
  // Emails (PII)
  { re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replace: "[email]" },
]

// Low-signal lines that add tokens but almost never help a diagnosis.
// Deliberately NARROW: only unambiguous access-log pings from health/uptime
// checkers and TLS handshake chatter. We do NOT drop comment lines, debug
// lines, or failing health checks — those frequently carry diagnostic signal.
const NOISE_LINE = [
  // kubelet / load-balancer probe access-log lines
  /\bkube-probe\/\S+/i,
  // successful (2xx) health-endpoint access-log pings
  /"(?:GET|HEAD)\s+\/(?:health|healthz|livez|readyz|ping|status)(?:\?\S*)?\s+HTTP\/[\d.]+"\s+2\d\d/i,
  // TLS handshake noise from scanners / probes
  /\bTLS handshake error\b/i,
]

function redactSecrets(text: string): { text: string; count: number } {
  let count = 0
  let out = text
  for (const { re, replace } of SECRET_PATTERNS) {
    out = out.replace(re, (...args) => {
      count++
      // Rebuild using the captured groups the same way String.replace would.
      const groups = args.slice(0, -2)
      return replace.replace(/\$(\d)/g, (_, d) => groups[Number(d)] ?? "")
    })
  }
  return { text: out, count }
}

// Recursively scrub secrets inside a parsed JSON value while preserving shape.
function scrubJson(value: unknown, ctr: { n: number }): unknown {
  if (typeof value === "string") {
    const { text, count } = redactSecrets(value)
    ctr.n += count
    return text
  }
  if (Array.isArray(value)) return value.map((v) => scrubJson(v, ctr))
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Redact keys that hold a RAW secret value. Never redact ARNs / resource
      // references (arn:...) or "*Arn"/"*Id" reference keys — those are
      // diagnostic infrastructure metadata, not credentials.
      const isSecretKey = /^(password|passwd|secret|token|apikey|api_key|clientsecret|authorization|credentials?)$/i.test(k)
      if (isSecretKey && typeof v === "string" && !v.startsWith("arn:")) {
        out[k] = "[REDACTED]"
        ctr.n++
      } else {
        out[k] = scrubJson(v, ctr)
      }
    }
    return out
  }
  return value
}

function optimizeJson(parsed: unknown, originalBytes: number, original: string): OptimizeResult {
  const ctr = { n: 0 }
  const scrubbed = scrubJson(parsed, ctr)
  // Nothing sensitive found — leave the payload byte-for-byte untouched.
  const optimized = ctr.n === 0 ? original : JSON.stringify(scrubbed, null, 2)
  const optimizedBytes = Buffer.byteLength(optimized, "utf8")
  return {
    optimized,
    stats: {
      format: "json",
      originalBytes,
      optimizedBytes,
      savedBytes: originalBytes - optimizedBytes,
      savedPct: originalBytes ? Math.round(((originalBytes - optimizedBytes) / originalBytes) * 1000) / 10 : 0,
      originalLines: 0,
      optimizedLines: 0,
      duplicatesCollapsed: 0,
      noiseLinesDropped: 0,
      secretsRedacted: ctr.n,
    },
  }
}

function optimizeText(raw: string): OptimizeResult {
  const originalBytes = Buffer.byteLength(raw, "utf8")

  // 1. Normalize line endings, strip ANSI, trim trailing whitespace per line.
  const normalized = raw
    .replace(/\r\n?/g, "\n")
    .replace(ANSI, "")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))

  const originalLines = normalized.length

  // 2. Redact secrets line-by-line.
  let secretsRedacted = 0
  const redacted = normalized.map((line) => {
    const { text, count } = redactSecrets(line)
    secretsRedacted += count
    return text
  })

  // 3. Drop noise lines.
  let noiseLinesDropped = 0
  const denoised = redacted.filter((line) => {
    if (line.trim() === "") return true // keep blanks for now; collapsed later
    const isNoise = NOISE_LINE.some((re) => re.test(line))
    if (isNoise) noiseLinesDropped++
    return !isNoise
  })

  // 4. Collapse consecutive duplicate lines -> "line  (×N)". Whitespace-only
  //    differences are treated as duplicates. Timestamp prefixes are ignored
  //    when comparing so repeated crash-loop spam collapses even if the clock
  //    ticks, but the FIRST occurrence (with its real timestamp) is kept.
  let duplicatesCollapsed = 0
  const collapsed: string[] = []
  const key = (l: string) =>
    l.replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g, "<ts>").trim()
  let i = 0
  while (i < denoised.length) {
    const line = denoised[i]
    if (line.trim() === "") {
      collapsed.push(line)
      i++
      continue
    }
    let run = 1
    while (i + run < denoised.length && key(denoised[i + run]) === key(line)) run++
    if (run > 1) {
      duplicatesCollapsed += run - 1
      collapsed.push(`${line}  (×${run})`)
    } else {
      collapsed.push(line)
    }
    i += run
  }

  // 5. Collapse 2+ blank lines into a single blank; trim ends.
  const compacted: string[] = []
  for (const line of collapsed) {
    if (line.trim() === "" && compacted[compacted.length - 1]?.trim() === "") continue
    compacted.push(line)
  }
  const optimized = compacted.join("\n").trim()

  const optimizedBytes = Buffer.byteLength(optimized, "utf8")
  return {
    optimized,
    stats: {
      format: "text",
      originalBytes,
      optimizedBytes,
      savedBytes: originalBytes - optimizedBytes,
      savedPct: originalBytes ? Math.round(((originalBytes - optimizedBytes) / originalBytes) * 1000) / 10 : 0,
      originalLines,
      optimizedLines: optimized === "" ? 0 : optimized.split("\n").length,
      duplicatesCollapsed,
      noiseLinesDropped,
      secretsRedacted,
    },
  }
}

// Public entry point: optimize a raw log payload of any shape.
export function optimizeRaw(raw: string): OptimizeResult {
  const originalBytes = Buffer.byteLength(raw, "utf8")
  const trimmed = raw.trim()

  // JSON payloads: keep them valid JSON so the chunker's per-record split works.
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return optimizeJson(JSON.parse(trimmed), originalBytes, raw)
    } catch {
      // Not valid JSON — treat as text.
    }
  }
  return optimizeText(raw)
}

// Combine per-document stats into one summary (for the ingest response).
export function mergeStats(list: OptimizeStats[]): OptimizeStats {
  const acc: OptimizeStats = {
    format: "text",
    originalBytes: 0,
    optimizedBytes: 0,
    savedBytes: 0,
    savedPct: 0,
    originalLines: 0,
    optimizedLines: 0,
    duplicatesCollapsed: 0,
    noiseLinesDropped: 0,
    secretsRedacted: 0,
  }
  for (const s of list) {
    acc.originalBytes += s.originalBytes
    acc.optimizedBytes += s.optimizedBytes
    acc.originalLines += s.originalLines
    acc.optimizedLines += s.optimizedLines
    acc.duplicatesCollapsed += s.duplicatesCollapsed
    acc.noiseLinesDropped += s.noiseLinesDropped
    acc.secretsRedacted += s.secretsRedacted
  }
  acc.savedBytes = acc.originalBytes - acc.optimizedBytes
  acc.savedPct = acc.originalBytes
    ? Math.round(((acc.originalBytes - acc.optimizedBytes) / acc.originalBytes) * 1000) / 10
    : 0
  acc.format = list.every((s) => s.format === "json") ? "json" : "text"
  return acc
}
