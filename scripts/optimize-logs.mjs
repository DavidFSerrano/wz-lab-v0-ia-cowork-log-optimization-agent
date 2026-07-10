// Standalone CLI demo of the log optimizer that runs at the ingest boundary,
// BEFORE the frozen chunk -> embed -> store pipeline.
//
// This mirrors lib/log-optimizer.ts so it can run with plain `node` (no build
// step). It reads the sample logs in ./logs, optimizes each, and prints a
// before/after report showing bytes/lines saved, duplicates collapsed, noise
// dropped, and secrets redacted.
//
// Usage:
//   node scripts/optimize-logs.mjs                 # run on ./logs/*
//   node scripts/optimize-logs.mjs path/to/file    # run on one file
//   cat some.log | node scripts/optimize-logs.mjs  # run on stdin
//   node scripts/optimize-logs.mjs --write out/    # write optimized copies

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs"
import { join, basename } from "node:path"

// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g

const SECRET_PATTERNS = [
  {
    re: /(?<![:\w./-])(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|client[_-]?secret|authorization)(\s*[:=]\s*)("?)(?!arn:)([^\s"',}]+)(\3)/gi,
    replace: "$1$2$3[REDACTED]$5",
  },
  { re: /\b(Bearer\s+)[A-Za-z0-9._~+/-]{8,}=*/gi, replace: "$1[REDACTED]" },
  { re: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, replace: "[REDACTED_JWT]" },
  { re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, replace: "[REDACTED_AWS_KEY]" },
  { re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replace: "[email]" },
]

const NOISE_LINE = [
  /\bkube-probe\/\S+/i,
  /"(?:GET|HEAD)\s+\/(?:health|healthz|livez|readyz|ping|status)(?:\?\S*)?\s+HTTP\/[\d.]+"\s+2\d\d/i,
  /\bTLS handshake error\b/i,
]

const bytes = (s) => Buffer.byteLength(s, "utf8")

function redactSecrets(text) {
  let count = 0
  let out = text
  for (const { re, replace } of SECRET_PATTERNS) {
    out = out.replace(re, (...args) => {
      count++
      const groups = args.slice(0, -2)
      return replace.replace(/\$(\d)/g, (_, d) => groups[Number(d)] ?? "")
    })
  }
  return { text: out, count }
}

function scrubJson(value, ctr) {
  if (typeof value === "string") {
    const { text, count } = redactSecrets(value)
    ctr.n += count
    return text
  }
  if (Array.isArray(value)) return value.map((v) => scrubJson(v, ctr))
  if (value && typeof value === "object") {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
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

function optimizeText(raw) {
  const originalBytes = bytes(raw)
  const normalized = raw
    .replace(/\r\n?/g, "\n")
    .replace(ANSI, "")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
  const originalLines = normalized.length

  let secretsRedacted = 0
  const redacted = normalized.map((line) => {
    const { text, count } = redactSecrets(line)
    secretsRedacted += count
    return text
  })

  let noiseLinesDropped = 0
  const denoised = redacted.filter((line) => {
    if (line.trim() === "") return true
    const isNoise = NOISE_LINE.some((re) => re.test(line))
    if (isNoise) noiseLinesDropped++
    return !isNoise
  })

  let duplicatesCollapsed = 0
  const collapsed = []
  const key = (l) => l.replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/g, "<ts>").trim()
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

  const compacted = []
  for (const line of collapsed) {
    if (line.trim() === "" && compacted[compacted.length - 1]?.trim() === "") continue
    compacted.push(line)
  }
  const optimized = compacted.join("\n").trim()
  const optimizedBytes = bytes(optimized)
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

function optimizeJson(parsed, originalBytes, original) {
  const ctr = { n: 0 }
  const scrubbed = scrubJson(parsed, ctr)
  const optimized = ctr.n === 0 ? original : JSON.stringify(scrubbed, null, 2)
  const optimizedBytes = bytes(optimized)
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

function optimizeRaw(raw) {
  const originalBytes = bytes(raw)
  const trimmed = raw.trim()
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return optimizeJson(JSON.parse(trimmed), originalBytes, raw)
    } catch {
      // fall through
    }
  }
  return optimizeText(raw)
}

// ---- CLI ----

function report(name, stats) {
  const kb = (n) => (n / 1024).toFixed(1)
  console.log(`\n■ ${name}  [${stats.format}]`)
  console.log(
    `  size   ${kb(stats.originalBytes)} KB → ${kb(stats.optimizedBytes)} KB   ` +
      `saved ${kb(stats.savedBytes)} KB (${stats.savedPct}%)`,
  )
  if (stats.format === "text") {
    console.log(`  lines  ${stats.originalLines} → ${stats.optimizedLines}`)
    console.log(`  collapsed dupes: ${stats.duplicatesCollapsed}   noise dropped: ${stats.noiseLinesDropped}`)
  }
  console.log(`  secrets redacted: ${stats.secretsRedacted}`)
}

async function readStdin() {
  const chunks = []
  for await (const c of process.stdin) chunks.push(c)
  return Buffer.concat(chunks).toString("utf8")
}

async function main() {
  const args = process.argv.slice(2)
  let writeDir = null
  const wi = args.indexOf("--write")
  if (wi !== -1) {
    writeDir = args[wi + 1] || "optimized"
    args.splice(wi, 2)
  }

  const totals = []
  const emit = (name, raw) => {
    const { optimized, stats } = optimizeRaw(raw)
    report(name, stats)
    totals.push(stats)
    if (writeDir) {
      if (!existsSync(writeDir)) mkdirSync(writeDir, { recursive: true })
      writeFileSync(join(writeDir, basename(name)), optimized)
    }
  }

  if (!process.stdin.isTTY && args.length === 0) {
    emit("stdin", await readStdin())
  } else {
    const targets = args.length > 0 ? args : ["logs"]
    const files = []
    for (const t of targets) {
      if (existsSync(t) && statSync(t).isDirectory()) {
        for (const f of readdirSync(t)) files.push(join(t, f))
      } else {
        files.push(t)
      }
    }
    if (files.length === 0) {
      console.error("No input files found. Pass a file/dir or pipe via stdin.")
      process.exit(1)
    }
    for (const f of files) {
      try {
        emit(f, readFileSync(f, "utf8"))
      } catch (err) {
        console.error(`  ! skip ${f}: ${err.message}`)
      }
    }
  }

  if (totals.length > 1) {
    const o = totals.reduce((a, s) => a + s.originalBytes, 0)
    const p = totals.reduce((a, s) => a + s.optimizedBytes, 0)
    const dupes = totals.reduce((a, s) => a + s.duplicatesCollapsed, 0)
    const noise = totals.reduce((a, s) => a + s.noiseLinesDropped, 0)
    const secrets = totals.reduce((a, s) => a + s.secretsRedacted, 0)
    console.log("\n──────────── TOTAL ────────────")
    console.log(
      `  ${(o / 1024).toFixed(1)} KB → ${(p / 1024).toFixed(1)} KB   ` +
        `saved ${((o - p) / 1024).toFixed(1)} KB (${o ? (((o - p) / o) * 100).toFixed(1) : 0}%)`,
    )
    console.log(`  dupes collapsed: ${dupes}   noise dropped: ${noise}   secrets redacted: ${secrets}`)
  }
}

main()
