import { recentLogs } from "@/lib/logs-pipeline"

// GET /api/logs?limit=50&afterId=123
// Returns the most recently ingested log chunks, newest first.
// `afterId` lets the live feed poll only for rows newer than what it has.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const limitParam = Number(url.searchParams.get("limit"))
  const afterParam = Number(url.searchParams.get("afterId"))

  try {
    const rows = await recentLogs({
      limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50,
      afterId: Number.isFinite(afterParam) && afterParam > 0 ? afterParam : undefined,
    })
    return Response.json({ logs: rows })
  } catch (err) {
    console.log("[v0] logs feed error:", err instanceof Error ? err.message : err)
    return Response.json({ error: "Failed to load logs" }, { status: 500 })
  }
}
