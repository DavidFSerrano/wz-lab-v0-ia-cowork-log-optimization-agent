import { ingestDocument, type LogDocument } from "@/lib/logs-pipeline"

export const maxDuration = 60

type IngestBody = {
  documents?: LogDocument[]
  document?: LogDocument
}

// POST /api/ingest
// Accepts refined logs from any source, chunks + embeds them, and stores
// the vectors in Neon (pgvector). Send either a single `document` or a
// batch of `documents`.
export async function POST(req: Request) {
  let body: IngestBody
  try {
    body = (await req.json()) as IngestBody
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const docs = body.documents ?? (body.document ? [body.document] : [])
  if (docs.length === 0) {
    return Response.json(
      { error: "Provide `document` or `documents` with a `source` and `raw` text." },
      { status: 400 },
    )
  }

  for (const doc of docs) {
    if (!doc?.source || typeof doc.raw !== "string" || doc.raw.trim() === "") {
      return Response.json(
        { error: "Each document needs a `source` string and non-empty `raw` text." },
        { status: 400 },
      )
    }
  }

  try {
    let totalChunks = 0
    for (const doc of docs) {
      const { chunks } = await ingestDocument(doc)
      totalChunks += chunks
    }
    return Response.json({ ok: true, documents: docs.length, chunks: totalChunks })
  } catch (err) {
    console.log("[v0] ingest error:", err instanceof Error ? err.message : err)
    return Response.json({ error: "Failed to ingest documents" }, { status: 500 })
  }
}
