# Product Roadmap & Feature Breakdown (P0 / P1 / P2)
# Wizeline SRE AI Agent — Log Ingestion & Optimization

## P0 — Core MVP (Deployed & Functional)

### Ingestion Pipeline
- `POST /api/ingest` auto-detects plain text, NDJSON, JSON, and `{ document }` envelope formats
- Metadata extraction via query params or `x-log-*` headers
- `chunkDocument()` — splits text into ~700-char windows or one chunk per JSON record
- `embedMany()` — batch embedding via `text-embedding-3-small` (1536-dim)
- INSERT into Neon `log_chunks` with HNSW pgvector index
- `detectIncidents()` — auto-pattern scan after each ingest batch

### EKS Log Compressor (`/compress`)
- 8-step compression pipeline in `lib/eks-log-compressor.ts`
- Strips comments, headers, metric rows, health-check lines
- Structural kubectl events parsing
- ARN → `resource/name` redaction
- UUID → 8-char truncation
- RDS hostname → `cluster-id:rds`
- Stack traces → 2-frame truncation
- Consecutive + global WARN/ERROR deduplication
- INFO-drop when anomalies present
- Before/after side-by-side UI with 4 metric cards and copy button

### RAG Chat (`/`)
- `POST /api/chat` with `streamText` + `searchLogs` tool
- Hybrid retrieval: metadata filters + cosine similarity on pgvector
- Structured Markdown output: Incident Summary / Root Cause / Remediation
- Streaming response with typing indicator

### Live Stream Simulator (`/stream`)
- `lib/eks-log-generator.ts` — 33 weighted templates, 5 services, 4 nodes, 4 namespaces
- `POST /api/stream/control` — Start/Stop with configurable interval (500ms–10s)
- `GET /api/stream` — SSE live tail, polls Neon every 2s, auto-reconnects
- Colour-coded log tail (INFO/WARN/ERROR), auto-scrolls, max 200 lines
- 4 metric cards: Lines Generated, Chunks Stored, Errors Seen, Last Event

### Navigation & Layout Consistency
- Shared `<AppNav />` across all 6 pages with active-state highlighting
- Canonical layout: `h-dvh flex-col` → `flex-1 overflow-y-auto` → `max-w-5xl mx-auto px-4 py-6`
- Canonical button spec: `rounded-lg border px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider`

### Architecture Page (`/architecture`)
- Full system diagram with animated SVG pipeline connectors
- 5 sections: Pre-ingestion Compression, Ingestion Pipeline, Vector Search, Incident Detection, Live Stream Simulator
- Tech stack chips including pgvector HNSW, SSE live tail, stream simulator

---

## P1 — Value-Add (Partially Implemented)

- **Demo guided walkthrough** (`/demo`) — Step-by-step animated demo of the ingestion pipeline with Play/Restart/Skip controls and incident dashboard
- **Live Logs feed** (`/logs`) — SWR-polled real-time view of stored `log_chunks` with severity filter
- **Seed script** (`scripts/seed-logs.mjs`) — Loads 5 fixture files (pod logs, namespace events, CloudTrail, RDS) into the DB
- **Stream speed slider** — Configurable ingestion interval with Fast/Slow labels

---

## P2 — Extended Horizon

- **Real EKS cluster connectivity** — Fluent Bit output plugin pointing to `/api/ingest` from a live cluster
- **Multi-source selector** — Toggle between `k8s`, `cloudwatch`, and `istio` in the stream simulator
- **Export compressed profiles** — Download compressed log output as a `.txt` or `.json` file
- **Dynamic regex rule editor** — Interactive table to add/remove/modify compression filter rules
- **Auth layer** — Protect the app with Better Auth + Neon for multi-user SRE team access
- **Incident alerting** — Webhook or Slack notification when `detectIncidents()` fires a critical pattern
