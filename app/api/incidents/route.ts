import { listIncidents } from "@/lib/incidents"

// GET /api/incidents
// Returns detected incidents (open first, most severe / most recent on top).
// Powers the incident dashboard grid.
export async function GET() {
  try {
    const incidents = await listIncidents()
    return Response.json({ incidents })
  } catch (err) {
    console.log("[v0] incidents list error:", err instanceof Error ? err.message : err)
    return Response.json({ error: "Failed to load incidents" }, { status: 500 })
  }
}
