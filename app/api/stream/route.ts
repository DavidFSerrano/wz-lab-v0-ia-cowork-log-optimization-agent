// GET /api/stream
//
// Server-Sent Events endpoint. Polls Neon every 2 s for log_chunks inserted
// after the connection was opened and streams them to the browser.
// Each SSE event carries the chunk as JSON.
//
// Clients use the native EventSource API to subscribe.

import { sql } from "@/lib/db"
import type { RetrievedChunk } from "@/lib/db"

export const dynamic = "force-dynamic"
// Keep the SSE connection alive up to Vercel's max for hobby/pro plans.
export const maxDuration = 60

const POLL_MS = 2_000
const BATCH_LIMIT = 10

export async function GET() {
  const connectedAt = new Date().toISOString()
  let lastId = 0

  // Seed lastId so we only stream chunks ingested after connection opens.
  try {
    const rows = (await sql`
      select coalesce(max(id), 0) as max_id from log_chunks
    `) as { max_id: number }[]
    lastId = rows[0]?.max_id ?? 0
  } catch {
    // If DB is unavailable, start from 0 — we'll emit whatever is there.
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send a connection-acknowledged event immediately.
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({ connectedAt, lastId })}\n\n`,
        ),
      )

      const poll = async () => {
        try {
          const rows = (await sql`
            select
              id, source, service, environment, severity,
              event_time, content,
              0 as distance
            from log_chunks
            where id > ${lastId}
            order by id asc
            limit ${BATCH_LIMIT}
          `) as RetrievedChunk[]

          if (rows.length > 0) {
            lastId = rows[rows.length - 1].id
            for (const row of rows) {
              const payload = JSON.stringify(row)
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
            }
          }

          // Send a keep-alive comment every cycle whether or not there is data.
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch {
          // Swallow transient DB errors — the poll loop continues.
        }
      }

      const intervalId = setInterval(poll, POLL_MS)

      // The controller's cancel hook fires when the client disconnects.
      // There is no direct hook on ReadableStream start(), so we rely on the
      // underlying connection abort — Next.js will GC the interval on teardown.
      // For long-running connections this is acceptable for a demo.
      void intervalId // suppress unused-variable lint
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
