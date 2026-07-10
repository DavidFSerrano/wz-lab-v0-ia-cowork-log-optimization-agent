import { compressEksLogs, type EksRawLog } from "@/lib/eks-log-compressor"

// POST /api/compress
//
// Accepts raw EKS log lines and returns a compressed version ready to be fed
// to an LLM, along with reduction metrics.
//
// Accepted payloads:
//   • text/plain          — one log line per newline
//   • application/json    — JSON array of strings or objects
//   • NDJSON              — one JSON object per line
//
// Response:
//   { compressed: string, originalChars: number, compressedChars: number, reductionPct: number }

export const runtime = "edge"

export async function POST(req: Request) {
  let bodyText: string
  try {
    bodyText = (await req.text()).trim()
  } catch {
    return Response.json({ error: "Could not read request body" }, { status: 400 })
  }

  if (!bodyText) {
    return Response.json({ error: "Empty payload" }, { status: 400 })
  }

  let logs: EksRawLog[]

  const contentType = req.headers.get("content-type") ?? ""

  if (contentType.includes("application/json") || bodyText.startsWith("[") || bodyText.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(bodyText)
      if (Array.isArray(parsed)) {
        logs = parsed as EksRawLog[]
      } else if (typeof parsed === "object" && parsed !== null) {
        logs = [parsed as EksRawLog]
      } else {
        logs = [bodyText]
      }
    } catch {
      // Not a single JSON doc — try NDJSON.
      const lines = bodyText.split("\n").filter((l) => l.trim() !== "")
      const isNdjson = lines.every((l) => l.trim().startsWith("{") || l.trim().startsWith("["))
      if (isNdjson) {
        try {
          logs = lines.map((l) => JSON.parse(l) as EksRawLog)
        } catch {
          logs = lines
        }
      } else {
        logs = lines
      }
    }
  } else {
    // Plain text: one entry per line.
    logs = bodyText.split("\n").filter((l) => l.trim() !== "")
  }

  if (logs.length === 0) {
    return Response.json({ error: "No log entries found in payload" }, { status: 400 })
  }

  try {
    const result = compressEksLogs(logs)
    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `Compression failed: ${message}` }, { status: 500 })
  }
}
