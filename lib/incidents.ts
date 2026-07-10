// Incident detection layer.
//
// This is a PARALLEL process to the RAG pipeline. It never touches ingestion,
// embedding, or retrieval — it only *reads* from `log_chunks` and *writes* to
// the `incidents` table. Detection runs (fire-and-forget) after logs are
// ingested, so incidents surface automatically as logs arrive.
//
// Strategy:
//   1. Rule-based grouping — cluster recent error/warn chunks by
//      service + environment and threshold them into candidate incidents.
//   2. One LLM call PER NEW incident — generate a human title + summary.
//      Existing incidents are just updated (counts / last_seen), no LLM call.

import { generateObject } from "ai"
import { z } from "zod"
import { sql } from "./db"

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
const ERROR_LINE_RE = "(error|fatal|exception|accessdenied|access denied|crashloopbackoff|failed|denied|exit code [1-9])"
const WARN_LINE_RE = "(warn|warning|backoff|unhealthy|retry|throttl)"

// Generic collectors/firehoses whose metadata `service` is NOT a real service
// (e.g. the live stream simulator ships everything as "stream-generator"). For
// these, the meaningful service lives inside each log LINE, so we parse the
// component name out of the line instead of grouping everything under the
// collector. Real ingested logs (service=orders-api, etc.) are untouched.
const GENERIC_COLLECTORS = ["stream-generator", "ingest"]

// Pulls the component/service token out of a structured log line, e.g.
//   "2026-..Z ERROR auth-svc pod/auth-svc-1 KMS decrypt failed" -> "auth-svc"
//   "2026-..Z WARN  [payments-api] charge declined"             -> "payments-api"
const LINE_SERVICE_RE = "(?:ERROR|WARN|WARNING|FATAL)\\s+\\[?([A-Za-z][A-Za-z0-9._-]*)\\]?"

// Group recent error/warn lines into candidate clusters. Lines are grouped by
// the real service (parsed from the line for generic collectors, otherwise the
// chunk's metadata service) + environment, then thresholded on error count.
async function findClusters(): Promise<Cluster[]> {
  const rows = (await sql`
    with lines as (
      select
        coalesce(environment, 'unknown') as environment,
        coalesce(service, 'unknown')     as meta_service,
        source,
        event_time,
        btrim(line) as line
      from log_chunks
      cross join lateral regexp_split_to_table(content, E'\n') as line
      where severity in ('error', 'warn')
        and created_at >= now() - ${RECENT_WINDOW}::interval
    ),
    classified as (
      select
        environment,
        source,
        event_time,
        line,
        case
          when meta_service = any(${GENERIC_COLLECTORS})
            then coalesce((regexp_match(line, ${LINE_SERVICE_RE}))[1], meta_service)
          else meta_service
        end as service,
        (line ~* ${ERROR_LINE_RE}) as is_err,
        (line ~* ${WARN_LINE_RE})  as is_warn
      from lines
      where line <> ''
    )
    select
      service,
      environment,
      count(*) filter (where is_err)::int  as error_count,
      count(*) filter (where is_warn)::int as warn_count,
      min(event_time) as first_seen,
      max(event_time) as last_seen,
      array_agg(distinct source) as sources,
      (array_agg(line order by event_time desc) filter (where is_err))[1] as sample_log
    from classified
    where is_err or is_warn
    group by 1, 2
    having count(*) filter (where is_err) >= ${MIN_ERRORS}
  `) as Array<{
    service: string
    environment: string
    error_count: number
    warn_count: number
    first_seen: string
    last_seen: string
    sources: string[]
    sample_log: string | null
  }>

  return rows.map((r) => ({
    signature: `${r.service}|${r.environment}`,
    service: r.service === "unknown" ? null : r.service,
    environment: r.environment === "unknown" ? null : r.environment,
    sources: r.sources ?? [],
    error_count: Number(r.error_count),
    warn_count: Number(r.warn_count),
    first_seen: r.first_seen,
    last_seen: r.last_seen,
    sample_log: r.sample_log,
  }))
}

// One LLM call to turn a raw cluster into a human-readable title + summary.
async function describeCluster(cluster: Cluster): Promise<{ title: string; summary: string }> {
  const fallbackTitle = `${cluster.service ?? "unknown service"} errors${
    cluster.environment ? ` in ${cluster.environment}` : ""
  }`
  try {
    const { object } = await generateObject({
      model: TITLE_MODEL,
      schema: z.object({
        title: z.string().describe("A short, specific incident title, max ~8 words. No trailing period."),
        summary: z.string().describe("One sentence describing the likely problem based on the log sample."),
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
    console.log("[v0] describeCluster error:", err instanceof Error ? err.message : err)
    return { title: fallbackTitle, summary: "Automatically detected cluster of recent error logs." }
  }
}

// Main entry point. Called (fire-and-forget) after ingestion.
// Returns the number of incidents created/updated.
export async function detectIncidents(): Promise<{ created: number; updated: number }> {
  const clusters = await findClusters()
  if (clusters.length === 0) return { created: 0, updated: 0 }

  // Which of these signatures already exist?
  const signatures = clusters.map((c) => c.signature)
  const existingRows = (await sql`
    select signature from incidents where signature = any(${signatures})
  `) as Array<{ signature: string }>
  const existing = new Set(existingRows.map((r) => r.signature))

  let created = 0
  let updated = 0

  for (const c of clusters) {
    const severity = severityFor(c.error_count)

    if (existing.has(c.signature)) {
      // Update in place — no LLM call. Reopen if it had been resolved.
      await sql`
        update incidents set
          error_count = ${c.error_count},
          warn_count  = ${c.warn_count},
          severity    = ${severity},
          sources     = ${c.sources},
          last_seen   = ${c.last_seen},
          sample_log  = ${c.sample_log},
          status      = 'open',
          updated_at  = now()
        where signature = ${c.signature}
      `
      updated++
    } else {
      // Brand-new incident — one LLM call for a nice title + summary.
      const { title, summary } = await describeCluster(c)
      await sql`
        insert into incidents
          (signature, service, environment, sources, severity, status,
           title, summary, error_count, warn_count, sample_log, first_seen, last_seen)
        values
          (${c.signature}, ${c.service}, ${c.environment}, ${c.sources}, ${severity}, 'open',
           ${title}, ${summary}, ${c.error_count}, ${c.warn_count}, ${c.sample_log},
           ${c.first_seen}, ${c.last_seen})
        on conflict (signature) do nothing
      `
      created++
    }
  }

  return { created, updated }
}

// Read API for the UI — open incidents first, most severe / most recent on top.
export async function listIncidents(): Promise<Incident[]> {
  const rows = (await sql`
    select
      id, signature, service, environment, sources, severity, status,
      title, summary, error_count, warn_count, sample_log, first_seen, last_seen
    from incidents
    order by
      (status = 'open') desc,
      case severity when 'critical' then 0 when 'error' then 1 else 2 end,
      last_seen desc
    limit 50
  `) as Incident[]
  return rows
}
