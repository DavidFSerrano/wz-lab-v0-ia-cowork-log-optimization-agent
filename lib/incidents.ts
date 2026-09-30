
import { generateObject } from "ai"
import { z } from "zod"
import { pool } from "./db"

// Incident detection layer.
//
// This is a PARALLEL process to the RAG pipeline. It never touches ingestion,
// embedding, or retrieval — it only *reads* from `log_chunks` and writes to
// the `incidents` table. Detection runs (fire-and-forget) after logs are
// ingested, so incidents surface automatically as logs arrive.
//
// Strategy:
//   1. Rule-based grouping — cluster recent error/warn chunks by
//      service + environment and threshold them into candidate incidents.
//   2. One LLM call PER NEW incident — generate a human title + summary.
//      Existing incidents are just updated (counts / last_seen), no LLM call.

// Only cluster logs ingested recently (by created_at, so seeding + live both
// work regardless of the log's own event_time).
const RECENT_WINDOW = "6 hours"

// Minimum error chunks in the window before a cluster becomes an incident.
const MIN_ERRORS = 3

const TITLE_MODEL = "openai/gpt-5.1-instant"

export type Incident = {
  id: number
  signature: string
  service: string | null
  environment: string | null
  sources: string[]
  severity: "critical" | "error" | "warn"
  status: "open" | "resolved"
  title: string
  summary: string | null
  error_count: number
  warn_count: number
  sample_log: string | null
  first_seen: string
  last_seen: string
}

type Cluster = {
  signature: string
  service: string | null
  environment: string | null
  sources: string[]
  error_count: number
  warn_count: number
  first_seen: string
  last_seen: string
  sample_log: string | null
}

function severityFor(errorCount: number): Incident["severity"] {
  if (errorCount >= 10) return "critical"
  if (errorCount >= MIN_ERRORS) return "error"
  return "warn"
}

// Keyword patterns kept in sync with classifySeverity() in logs-pipeline.ts.
// Used here to count error/warn *lines* within each chunk (a single ingested
// payload is often packed into one chunk, so line-level counting is what makes
// a realistic multi-line error dump cross the incident threshold).
const ERROR_LINE_RE =
  "(error|fatal|exception|accessdenied|access denied|crashloopbackoff|failed|denied|exit code [1-9])"

const WARN_LINE_RE = "(warn|warning|backoff|unhealthy|retry|throttl)"

// Group recent error/warn chunks into candidate clusters.
async function findClusters(): Promise<Cluster[]> {
  const result = await pool.query(
    `
    WITH scored AS (
      SELECT
        COALESCE(service, 'unknown') AS service,
        COALESCE(environment, 'unknown') AS environment,
        source,
        event_time,
        content,
        (SELECT COUNT(*)
         FROM regexp_split_to_table(content, E'\\n') AS l(t)
         WHERE t ~* $1) AS err_lines,
        (SELECT COUNT(*)
         FROM regexp_split_to_table(content, E'\\n') AS l(t)
         WHERE t ~* $2) AS warn_lines
      FROM log_chunks
      WHERE severity IN ('error', 'warn')
        AND created_at >= NOW() - $3::interval
    )
    SELECT
      service,
      environment,
      SUM(err_lines)::int AS error_count,
      SUM(warn_lines)::int AS warn_count,
      MIN(event_time) AS first_seen,
      MAX(event_time) AS last_seen,
      ARRAY_AGG(DISTINCT source) AS sources,
      (ARRAY_AGG(content ORDER BY event_time DESC)
        FILTER (WHERE err_lines > 0))[1] AS sample_log
    FROM scored
    GROUP BY 1, 2
    HAVING SUM(err_lines) >= $4
    `,
    [ERROR_LINE_RE, WARN_LINE_RE, RECENT_WINDOW, MIN_ERRORS]
  )

  const rows = result.rows as {
    service: string
    environment: string
    error_count: number
    warn_count: number
    first_seen: Date | string
    last_seen: Date | string
    sources: string[]
    sample_log: string | null
  }[]

  return rows.map((r) => ({
    signature: `${r.service}|${r.environment}`,
    service: r.service === "unknown" ? null : r.service,
    environment: r.environment === "unknown" ? null : r.environment,
    sources: r.sources ?? [],
    error_count: Number(r.error_count),
    warn_count: Number(r.warn_count),
    first_seen: new Date(r.first_seen).toISOString(),
    last_seen: new Date(r.last_seen).toISOString(),
    sample_log: r.sample_log,
  }))
}

// One LLM call to turn a raw cluster into a human-readable title + summary.
async function describeCluster(
  cluster: Cluster
): Promise<{ title: string; summary: string }> {
  const fallbackTitle = `${cluster.service ?? "unknown service"} errors${
    cluster.environment ? ` in ${cluster.environment}` : ""
  }`

  try {
    const { object } = await generateObject({
      model: TITLE_MODEL,
      schema: z.object({
        title: z.string().describe(
          "A short, specific incident title, max ~8 words. No trailing period."
        ),
        summary: z.string().describe(
          "One sentence describing the likely problem based on the log sample."
        ),
      }),
      prompt: [
        "You are an SRE triage assistant. Write a concise incident title and one-sentence summary.",
        `Service: ${cluster.service ?? "unknown"}`,
        `Environment: ${cluster.environment ?? "unknown"}`,
        `Sources: ${cluster.sources.join(", ") || "unknown"}`,
        `Error count (recent): ${cluster.error_count}`,
        "Representative error log:",
        (cluster.sample_log ?? "").slice(0, 1200),
      ].join("\n"),
    })

    return {
      title: object.title.trim() || fallbackTitle,
      summary: object.summary.trim(),
    }
  } catch (err) {
    console.log(
      "[v0] describeCluster error:",
      err instanceof Error ? err.message : err
    )

    return {
      title: fallbackTitle,
      summary: "Automatically detected cluster of recent error logs.",
    }
  }
}

// Main entry point. Called (fire-and-forget) after ingestion.
// Returns the number of incidents created/updated.
export async function detectIncidents(): Promise<{
  created: number
  updated: number
}> {
  const clusters = await findClusters()

  if (clusters.length === 0) return { created: 0, updated: 0 }

  // Which of these signatures already exist?
  const signatures = clusters.map((c) => c.signature)

  const existingResult = await pool.query(
    "SELECT signature FROM incidents WHERE signature = ANY($1::text[])",
    [signatures]
  )

  const existing = new Set(
    (existingResult.rows as { signature: string }[]).map(
      (r) => r.signature
    )
  )

  let created = 0
  let updated = 0

  for (const c of clusters) {
    const severity = severityFor(c.error_count)

    if (existing.has(c.signature)) {
      // Update in place — no LLM call. Reopen if it had been resolved.
      await pool.query(
        `
        UPDATE incidents SET
          error_count = $1,
          warn_count = $2,
          severity = $3,
          sources = $4,
          last_seen = $5,
          sample_log = $6,
          status = 'open',
          updated_at = NOW()
        WHERE signature = $7
        `,
        [
          c.error_count,
          c.warn_count,
          severity,
          c.sources,
          c.last_seen,
          c.sample_log,
          c.signature,
        ]
      )

      updated++
    } else {
      // Brand-new incident — one LLM call for a nice title + summary.
      const { title, summary } = await describeCluster(c)

      await pool.query(
        `
        INSERT INTO incidents
          (signature, service, environment, sources, severity, status,
           title, summary, error_count, warn_count, sample_log, first_seen, last_seen)
        VALUES
          ($1, $2, $3, $4, $5, 'open',
           $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (signature) DO NOTHING
        `,
        [
          c.signature,
          c.service,
          c.environment,
          c.sources,
          severity,
          title,
          summary,
          c.error_count,
          c.warn_count,
          c.sample_log,
          c.first_seen,
          c.last_seen,
        ]
      )

      created++
    }
  }

  return { created, updated }
}

// Read API for the UI — open incidents first, most severe / most recent on top.
export async function listIncidents(): Promise<Incident[]> {
  const result = await pool.query(`
    SELECT
      id, signature, service, environment, sources, severity, status,
      title, summary, error_count, warn_count, sample_log, first_seen, last_seen
    FROM incidents
    ORDER BY
      (status = 'open') DESC,
      CASE severity
        WHEN 'critical' THEN 0
        WHEN 'error' THEN 1
        ELSE 2
      END,
      last_seen DESC
    LIMIT 50
  `)

  return result.rows.map((row) => ({
    ...row,
    id: Number(row.id),
    error_count: Number(row.error_count),
    warn_count: Number(row.warn_count),
    first_seen: new Date(row.first_seen).toISOString(),
    last_seen: new Date(row.last_seen).toISOString(),
  })) as Incident[]
}