import { embedMany, embed } from "ai"
import { sql, type RetrievedChunk } from "./db"

export const EMBEDDING_MODEL = "openai/text-embedding-3-small"

export type LogDocument = {
  source: string // 'k8s' | 'aws' | 'web'
  service?: string
  environment?: string
  raw: string
}

export type LogChunk = {
  content: string
  eventTime: string
  severity: string
}

const ISO_TS = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?/

// Best-effort timestamp extraction from a block of log text.
function extractEventTime(text: string, fallback: string): string {
  const match = text.match(ISO_TS)
  if (!match) return fallback
  const normalized = match[0].replace(" ", "T")
  const d = new Date(normalized.endsWith("Z") ? normalized : normalized + "Z")
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString()
}

// Assign a coarse severity by scanning for well-known keywords.
function classifySeverity(text: string): string {
  const t = text.toLowerCase()
  if (/(error|fatal|exception|accessdenied|access denied|crashloopbackoff|failed|denied|exit code [1-9])/.test(t)) {
    return "error"
  }
  if (/(warn|warning|backoff|unhealthy|retry|throttl)/.test(t)) return "warn"
  return "info"
}

// Split a raw log document into semantic chunks.
// - JSON (e.g. CloudTrail) is split into one chunk per record.
// - Text logs are grouped into blocks separated by blank lines, then
//   packed into ~700 char windows so related lines stay together.
export function chunkDocument(doc: LogDocument): LogChunk[] {
  const fallback = new Date().toISOString()
  const trimmed = doc.raw.trim()
  const chunks: LogChunk[] = []

  // Try structured JSON first (CloudTrail-style records).
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed)
      const records: unknown[] = Array.isArray(parsed)
        ? parsed
        : Array.isArray((parsed as { Records?: unknown[] }).Records)
          ? (parsed as { Records: unknown[] }).Records
          : [parsed]
      for (const rec of records) {
        const content = JSON.stringify(rec, null, 2)
        chunks.push({
          content,
          eventTime: extractEventTime(content, fallback),
          severity: classifySeverity(content),
        })
      }
      if (chunks.length > 0) return chunks
    } catch {
      // Not valid JSON — fall through to text chunking.
    }
  }

  // Text chunking: pack blank-line-separated blocks into ~700 char windows.
  const blocks = trimmed.split(/\n\s*\n/)
  const MAX = 700
  let buffer = ""
  const flush = () => {
    const content = buffer.trim()
    if (content) {
      chunks.push({
        content,
        eventTime: extractEventTime(content, fallback),
        severity: classifySeverity(content),
      })
    }
    buffer = ""
  }
  for (const block of blocks) {
    if (buffer && buffer.length + block.length > MAX) flush()
    buffer += (buffer ? "\n\n" : "") + block.trim()
  }
  flush()

  return chunks
}

// Format an embedding as a pgvector literal, e.g. "[0.1,0.2,...]".
function toVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`
}

// Full ingestion: chunk -> embed -> store. Returns counts.
export async function ingestDocument(doc: LogDocument) {
  const chunks = chunkDocument(doc)
  if (chunks.length === 0) return { chunks: 0 }

  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: chunks.map((c) => c.content),
  })

  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]
    await sql`
      insert into log_chunks
        (source, service, environment, severity, event_time, content, embedding)
      values (
        ${doc.source},
        ${doc.service ?? null},
        ${doc.environment ?? null},
        ${c.severity},
        ${c.eventTime},
        ${c.content},
        ${toVector(embeddings[i])}::vector
      )
    `
  }

  return { chunks: chunks.length }
}

// Hybrid retrieval: optional metadata/time filters + vector similarity.
export async function searchLogs(opts: {
  query: string
  source?: string
  service?: string
  startTime?: string
  endTime?: string
  limit?: number
}): Promise<RetrievedChunk[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: opts.query,
  })
  const vec = toVector(embedding)
  const limit = Math.min(opts.limit ?? 8, 20)

  const rows = (await sql`
    select
      id, source, service, environment, severity,
      event_time, content,
      (embedding <=> ${vec}::vector) as distance
    from log_chunks
    where
      (${opts.source ?? null}::text is null or source = ${opts.source ?? null})
      and (${opts.service ?? null}::text is null or service = ${opts.service ?? null})
      and (${opts.startTime ?? null}::timestamptz is null or event_time >= ${opts.startTime ?? null}::timestamptz)
      and (${opts.endTime ?? null}::timestamptz is null or event_time <= ${opts.endTime ?? null}::timestamptz)
    order by embedding <=> ${vec}::vector
    limit ${limit}
  `) as RetrievedChunk[]

  return rows
}
