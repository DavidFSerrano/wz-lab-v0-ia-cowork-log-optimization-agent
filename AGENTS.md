# Project Guide (for AI agents)

Read this first. It gets you productive on this codebase quickly and lists the
non-obvious gotchas that will bite you if you skip it.

## ⛔ DO NOT TOUCH THE RAG PIPELINE

**The RAG pipeline is frozen. Do not modify it under any circumstances unless the
user explicitly and specifically asks you to change the pipeline itself.**

This includes ingestion, chunking, embedding, vector storage, retrieval, and the
`searchLogs` tool. Concretely, treat these as **read-only**:

- `lib/logs-pipeline.ts` (chunk / embed / ingest / searchLogs / recentLogs)
- `lib/db.ts` (Neon client + `RetrievedChunk` type)
- `app/api/ingest/route.ts` (ingestion endpoint + payload parsing)
- The `searchLogs` tool definition and retrieval logic in `app/api/chat/route.ts`
- The `log_chunks` schema and `scripts/setup-schema.mjs`
- The embedding model / dimension (`text-embedding-3-small`, 1536)

You MAY still work freely on UI, styling, pages, and non-pipeline features. If a
requested change seems to require touching the pipeline, **stop and ask the user
first** — describe what pipeline change would be needed and get explicit
confirmation before editing any of the files above.

## What this app is

An **AI log-analysis / incident-troubleshooting assistant** for SRE/DevOps.
It is a **RAG (Retrieval-Augmented Generation) chat** over infrastructure logs:

- Logs (Kubernetes pod logs & events, AWS CloudTrail/KMS/RDS) are ingested,
  chunked, embedded, and stored as vectors in **Neon Postgres (pgvector)**.
- A chat agent answers troubleshooting questions by semantically searching those
  logs and correlating evidence into a root-cause diagnosis.

The demo scenario is an `orders-api` `CrashLoopBackOff` incident.

## Stack

- **Next.js 16** (App Router) + **React 19**, TypeScript
- **AI SDK v7** (`ai`) with **Vercel AI Gateway** — models are plain strings, no
  provider SDKs/keys needed
- **Neon Postgres + pgvector** for the vector store
- **Tailwind v4** (config-less; theme in `app/globals.css`)
- **SWR** for the live-feed polling UI

Models: chat = `openai/gpt-5.1-instant`; embeddings =
`openai/text-embedding-3-small` (1536 dims — must match the `vector(1536)` column).

## Architecture: two flows

### Flow 1 — Ingestion (logs in)
`POST /api/ingest`  →  `lib/logs-pipeline.ts: ingestDocument()`  →  Neon

1. `app/api/ingest/route.ts` — wide-open (no auth) endpoint. `parseDocuments()`
   auto-detects the payload: raw text, NDJSON, arbitrary JSON (e.g. CloudTrail
   `{Records:[...]}`), or a `{ document } / { documents }` envelope. Metadata
   (`source`/`service`/`environment`) comes from query params, `x-log-*`
   headers, or the envelope, with defaults.
2. `chunkDocument()` — JSON → one chunk per record; text → packed into ~700-char
   windows. Each chunk gets a best-effort `eventTime` (regex) and a keyword-based
   `severity` (`error`/`warn`/`info`).
3. `ingestDocument()` — `embedMany()` embeds all chunks, then inserts rows into
   `log_chunks` with the embedding as a `::vector` literal.

### Flow 2 — Retrieval + chat (questions out)
`components/chat.tsx` → `POST /api/chat` → `searchLogs` tool → Neon → streamed answer

1. `app/api/chat/route.ts` — `streamText` with a senior-SRE system prompt and one
   tool, `searchLogs`. `stopWhen: stepCountIs(10)` lets it run multiple searches.
2. `lib/logs-pipeline.ts: searchLogs()` — embeds the query, then does cosine
   similarity (`embedding <=> $vec`) with optional `source`/`service`/time filters.
3. The model correlates results by timestamp and returns a structured diagnosis
   (summary → timeline → red herrings → root cause → remediation).

### Live feed (watch ingestion happen)
`app/logs/page.tsx` → `components/logs-feed.tsx` → `GET /api/logs` →
`recentLogs()`. SWR polls every ~3s; `afterId` fetches only newer rows.

### Flow 3 — Incident detection (PARALLEL to RAG, does not touch it)
`POST /api/ingest` → (after storage) `lib/incidents.ts: detectIncidents()` → `incidents` table

Automatic multi-incident detection. This layer only **reads** `log_chunks` and
**writes** the `incidents` table — it never changes chunking/embedding/retrieval.

1. `detectIncidents()` (`lib/incidents.ts`) is called fire-and-forget at the end
   of `POST /api/ingest` (awaited but wrapped so it can never fail ingestion).
2. Rule-based clustering: groups recent (`created_at` within `RECENT_WINDOW`,
   default 6h) `error`/`warn` chunks by `service`+`environment`; a cluster with
   `>= MIN_ERRORS` (default 3) error chunks becomes an incident. Severity:
   `critical` ≥10, `error` ≥3, else `warn`.
3. **One LLM call per NEW incident** (`describeCluster`, `generateObject` with
   `openai/gpt-5.1-instant`) generates a human title + summary. Existing
   incidents (matched by `signature = service|environment`) are just updated
   (counts / last_seen / severity) — no LLM call.
4. `GET /api/incidents` → `listIncidents()` powers the dashboard grid.

**UI:** `components/incident-dashboard.tsx` (SWR grid, 5s poll) is the default
view in `components/chat.tsx`. Selecting a card opens a chat scoped to that
incident: the incident context is sent in the `sendMessage` body and
`app/api/chat/route.ts` injects it into the system prompt so the model filters
`searchLogs` by that service + time window. **The `searchLogs` tool itself is
unchanged** — scoping is prompt-level only.

Note: `error_count` counts error *chunks*, not log lines. Text logs pack into
~700-char chunks, so to cross `MIN_ERRORS` from a test, send distinct records
(NDJSON / JSON array) rather than one text blob.

Setup: `node --env-file-if-exists=/vercel/share/.env.project scripts/setup-incidents.mjs`
(creates the `incidents` table; safe to re-run).

## File map

| Path | Role |
|------|------|
| `lib/db.ts` | Neon `sql` client + `RetrievedChunk` type |
| `lib/logs-pipeline.ts` | **Core.** chunk / embed / ingest / searchLogs / recentLogs |
| `app/api/ingest/route.ts` | Flexible ingestion endpoint |
| `app/api/chat/route.ts` | RAG chat + `searchLogs` tool |
| `app/api/logs/route.ts` | Live-feed read API |
| `app/page.tsx` | Chat page (incident UI) |
| `app/logs/page.tsx` | Live logs feed page |
| `components/chat*.tsx`, `markdown.tsx`, `logs-feed.tsx` | UI |
| `scripts/setup-schema.mjs` | Creates `vector` ext, `log_chunks` table + indexes |
| `scripts/seed-logs.mjs` | Truncates table, POSTs `logs/*` files to `/api/ingest` |
| `logs/` | Sample raw log files for seeding |

## DB schema (`log_chunks`)

`id, source, service, environment, severity, event_time, occurrences,
first_seen, last_seen, content, embedding vector(1536), created_at`.
Indexes: HNSW on `embedding` (cosine), btree on `(service, environment, event_time)`.

## Setup / run

Requires `DATABASE_URL` (Neon) in the environment; AI Gateway works zero-config in v0.

```bash
npm install
node scripts/setup-schema.mjs      # one-time: create table + indexes
npm run dev                        # start Next.js
node scripts/seed-logs.mjs         # (dev server must be running) load sample logs
```

Scripts are run directly with `node` (not npm scripts). When running scripts via
Bash outside the dev server, env vars are **not** auto-loaded — use
`node --env-file-if-exists=/vercel/share/.env.project scripts/<x>.mjs` or
`set -a && source /vercel/share/.env.project && set +a`.

## Gotchas (read before editing)

- **Embedding dim is locked at 1536.** Changing the embedding model means
  changing the `vector(1536)` column and re-embedding everything.
- **Neon returns `event_time` as a JS `Date` at runtime** though `RetrievedChunk`
  types it as `string`. `app/api/chat/route.ts` casts via `unknown` and coerces
  to ISO — non-JSON values break the ModelMessage schema fed back to the model.
  Keep that coercion.
- **The `searchLogs` tool never throws** — it returns `{error}` as data. A thrown
  tool error corrupts step history for reasoning models. Preserve this pattern.
- **`/api/ingest` has no auth by design** (POC decision). Don't add auth unless asked.
- **Client components** using `window` (e.g. the curl snippet origin in
  `logs-feed.tsx`) must read it in `useEffect`, not during render, to avoid
  hydration mismatches.
- The schema has `occurrences/first_seen/last_seen` columns for future
  dedup/aggregation; the current pipeline does **not** populate them.

## Common tasks

- **Add a log source**: POST to `/api/ingest` with `?source=<name>`; extend the
  `source` enum in the `searchLogs` tool (`app/api/chat/route.ts`) if the agent
  should filter by it.
- **Tune retrieval**: edit `searchLogs()` filters / `limit` in `lib/logs-pipeline.ts`.
- **Change diagnosis style**: edit the `system` prompt array in `app/api/chat/route.ts`.
- **Change chunking**: `chunkDocument()` in `lib/logs-pipeline.ts` (MAX window, JSON split).
