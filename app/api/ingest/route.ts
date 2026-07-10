import { ingestDocument, type LogDocument } from "@/lib/logs-pipeline"
import { detectIncidents } from "@/lib/incidents"
import { optimizeRaw, mergeStats, type OptimizeStats } from "@/lib/log-optimizer"

export const maxDuration = 60

// POST /api/ingest
//
// A wide-open ingestion endpoint: anything can ship logs here and it will be
// chunked, embedded, and stored in Neon (pgvector), which feeds the RAG chat.
//
// Accepted payloads (auto-detected):
//   1. Raw text / plain logs        — Content-Type: text/plain (or anything)
//   2. NDJSON (one JSON per line)    — each line stored as a record
//   3. Arbitrary JSON object/array   — e.g. CloudTrail { Records: [...] }
//   4. Envelope { document } / { documents } with { source, raw, ... }
//
// Metadata (source/service/environment) can be provided via the envelope, or
// as query params (?source=k8s&service=orders-api&environment=prod), or via
// x-log-* headers. Sensible defaults are applied so a bare `curl --data` works.

type Envelope = {
  documents?: LogDocument[]
  document?: LogDocument
}

function meta(req: Request) {
  const url = new URL(req.url)
  const h = req.headers
  return {
    source: url.searchParams.get("source") ?? h.get("x-log-source") ?? "ingest",
    service: url.searchParams.get("service") ?? h.get("x-log-service") ?? undefined,
    environment: url.searchParams.get("environment") ?? h.get("x-log-environment") ?? undefined,
  }
}

function isEnvelope(v: unknown): v is Envelope {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return Array.isArray(o.documents) || (typeof o.document === "object" && o.document !== null)
}

// Turn any request body into a list of LogDocuments ready for the pipeline.
async function parseDocuments(req: Request): Promise<LogDocument[]> {
  const defaults = meta(req)
  const bodyText = (await req.text()).trim()
  if (!bodyText) return []

  const contentType = req.headers.get("content-type") ?? ""

  // JSON-ish bodies: try to parse and inspect the shape.
  if (contentType.includes("json") || bodyText.startsWith("{") || bodyText.startsWith("[")) {
    try {
      const parsed = JSON.parse(bodyText)

      // Envelope form — pass documents straight through (with metadata defaults).
      if (isEnvelope(parsed)) {
        const docs = parsed.documents ?? (parsed.document ? [parsed.document] : [])
        return docs.map((d) => ({
          source: d.source ?? defaults.source,
          service: d.service ?? defaults.service,
          environment: d.environment ?? defaults.environment,
          raw: typeof d.raw === "string" ? d.raw : JSON.stringify(d.raw ?? d, null, 2),
        }))
      }

      // Any other JSON (object or array) — hand the raw JSON to the chunker,
      // which knows how to split CloudTrail-style records.
      return [{ ...defaults, raw: JSON.stringify(parsed, null, 2) }]
    } catch {
      // Not a single JSON doc — fall through to NDJSON / text handling.
    }
  }

  // NDJSON: every non-empty line parses as JSON -> one doc per line.
  const lines = bodyText.split("\n").filter((l) => l.trim() !== "")
  const looksNdjson =
    lines.length > 1 && lines.every((l) => l.trim().startsWith("{") || l.trim().startsWith("["))
  if (looksNdjson) {
    const docs: LogDocument[] = []
    let ok = true
    for (const line of lines) {
      try {
        docs.push({ ...defaults, raw: JSON.stringify(JSON.parse(line)) })
      } catch {
        ok = false
        break
      }
    }
    if (ok) return docs
  }

  // Fallback: raw text log blob.
  return [{ ...defaults, raw: bodyText }]
}

export async function POST(req: Request) {
  let docs: LogDocument[]
  try {
    docs = await parseDocuments(req)
  } catch {
    return Response.json({ error: "Could not read request body" }, { status: 400 })
  }

  docs = docs.filter((d) => typeof d.raw === "string" && d.raw.trim() !== "")
  if (docs.length === 0) {
    return Response.json(
      { error: "Empty payload. Send raw log text, NDJSON, JSON, or a { document } envelope." },
      { status: 400 },
    )
  }

  // Optimization pass: clean/compact/redact each raw payload BEFORE it enters
  // the frozen chunk -> embed -> store pipeline. This cuts embedding tokens and
  // noise while preserving diagnostic signal. Disable with ?optimize=false.
  const optimize = new URL(req.url).searchParams.get("optimize") !== "false"
  const optStats: OptimizeStats[] = []
  if (optimize) {
    docs = docs.map((doc) => {
      const { optimized, stats } = optimizeRaw(doc.raw)
      optStats.push(stats)
      return { ...doc, raw: optimized }
    })
    docs = docs.filter((d) => d.raw.trim() !== "")
  }

  try {
    let totalChunks = 0
    for (const doc of docs) {
      const { chunks } = await ingestDocument(doc)
      totalChunks += chunks
    }

    // Parallel incident detection: reads the just-ingested chunks and upserts
    // incidents. Awaited but never allowed to fail the ingest response — the
    // RAG pipeline above is the source of truth and stays untouched.
    try {
      await detectIncidents()
    } catch (err) {
      console.log("[v0] incident detection error:", err instanceof Error ? err.message : err)
    }

    return Response.json({
      ok: true,
      documents: docs.length,
      chunks: totalChunks,
      optimization: optimize ? mergeStats(optStats) : null,
    })
  } catch (err) {
    console.log("[v0] ingest error:", err instanceof Error ? err.message : err)
    return Response.json({ error: "Failed to ingest logs" }, { status: 500 })
  }
}
