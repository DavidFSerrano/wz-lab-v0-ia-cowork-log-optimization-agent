# Product Requirements Document (PRD)
# ExampleCorp — Log Ingestion & Optimization AI Agent

## 1. Functional Specifications

### A. Pages & Routes
| Route | Component | Purpose |
|---|---|---|
| `/` | `chat.tsx` | RAG-powered SRE chat assistant |
| `/demo` | `demo-view.tsx` | Guided step-by-step walkthrough of the ingestion pipeline |
| `/logs` | `logs-feed.tsx` | Live log chunk feed with SWR polling from Neon |
| `/compress` | `log-compressor-view.tsx` | Interactive EKS log compressor with before/after metrics |
| `/stream` | `log-stream-view.tsx` | Live stream simulator with Start/Stop, speed slider, SSE tail |
| `/architecture` | `architecture-view.tsx` | Full system architecture diagram and tech stack reference |

### B. EKS Log Compressor (`/compress`)
- Accepts raw EKS log text (plain text, JSON, or NDJSON) in a paste area.
- Calls `POST /api/compress` which runs `compressEksLogs()` from `lib/eks-log-compressor.ts`.
- Eight-step compression pipeline:
  1. Strip comment / annotation / header lines (`# ...`, column headers, metric rows)
  2. Filter health-check and probe lines (`/healthz`, `/readyz`, `kube-probe`, `ELB-HealthChecker`)
  3. Parse kubectl events rows structurally (extracts timestamp, level, reason, component, message)
  4. Redact AWS ARNs → `resource/name` (last two slash-separated segments)
  5. Truncate UUIDs → first 8 hex characters
  6. Collapse long RDS hostnames → `cluster-id:rds`
  7. Truncate stack traces → error class + first 2 frames + `[+N frames]`
  8. Run-length dedup (consecutive) + global WARN/ERROR dedup (non-consecutive) + INFO drop when anomalies present
- Output panel shows compressed result, copy button, and four metric cards:
  - Original characters, Compressed characters, Reduction %, Estimated tokens saved (÷ 4)

### C. Live Stream Simulator (`/stream`)
- Header controls: Start/Stop button, speed slider (500ms–10s interval), Clear button, live/paused badge.
- `POST /api/stream/control` starts or stops a module-scoped `setInterval`.
  - Each tick: `generateEksBatch(3)` produces 3 weighted-random log lines (60% INFO / 25% WARN / 15% ERROR) and POSTs to `/api/ingest`.
- `GET /api/stream` is an SSE endpoint: polls Neon every 2s for `log_chunks` inserted after connection open; pushes as `text/event-stream`.
- Live tail: colour-coded (INFO=cyan, WARN=amber, ERROR=magenta), auto-scrolls, max 200 lines.
- Four metric cards: Lines Generated, Chunks Stored, Errors Seen, Last Event Time.

### D. RAG Chat (`/`)
- Input: free-text SRE query (e.g. "what caused the CrashLoopBackOff in orders-api?").
- `POST /api/chat` calls `searchLogs()` (hybrid: metadata filters + pgvector cosine similarity) then streams a structured response via AI SDK `streamText` with `gpt-5.1-instant`.
- Response format: Incident Summary → Root Cause Analysis → Remediation Steps (rendered as Markdown).
- `searchLogsTool` is exposed as an AI SDK tool so the model can issue additional log queries mid-response.

### E. Ingestion Pipeline (`POST /api/ingest`)
- Auto-detects format: plain text, NDJSON, JSON array/object, or `{ document }` / `{ documents }` envelope.
- Metadata via query params (`?source=k8s&service=orders-api&environment=production`) or `x-log-*` headers.
- Pipeline: `chunkDocument()` → `embedMany()` (batch, `text-embedding-3-small`, 1536-dim) → INSERT into `log_chunks` → `detectIncidents()`.
- `log_chunks` table: `id`, `source`, `service`, `environment`, `severity`, `event_time`, `content`, `embedding vector(1536)`.
- Indexes: HNSW on `embedding` (cosine), composite B-tree on `(service, environment, event_time)`.

### F. Incident Auto-Detection
- After each ingest batch, `detectIncidents()` scans new chunks for patterns: `CrashLoopBackOff`, `OOMKilled`, `AccessDenied`, `ImagePullBackOff`, `pending > 5m`.
- Detected incidents are stored in `incidents` table and surfaced in the Demo page's incident dashboard.

### G. Navigation
- Shared `<AppNav />` component rendered inline in every page header.
- Six links: Chat · Demo · Live Logs · Compressor · Stream · Architecture.
- Active link highlighted with `border-accent/60 bg-accent/10 text-accent`.
- All pages: `flex h-dvh flex-col` root → `flex-1 overflow-y-auto` scroll zone → `mx-auto w-full max-w-5xl px-4 py-6` content container.

## 2. Technical Architecture
```
[ Browser ]
    │
    ├─ GET /stream (SSE)          ← live log tail
    ├─ POST /api/stream/control   ← start / stop simulator
    ├─ POST /api/compress         ← compressEksLogs()
    ├─ POST /api/ingest           ← chunkDocument() → embedMany() → detectIncidents()
    ├─ POST /api/chat             ← searchLogs() → streamText (gpt-5.1-instant)
    ├─ GET  /api/logs             ← SWR polling of log_chunks
    └─ GET  /api/incidents        ← incident list

[ lib/ ]
    ├─ eks-log-compressor.ts     ← 8-step noise reduction pipeline
    ├─ eks-log-generator.ts      ← weighted-random EKS log factory
    ├─ logs-pipeline.ts          ← chunk / embed / ingest orchestration
    ├─ incidents.ts              ← pattern-match incident detection
    └─ db.ts                     ← Neon serverless Postgres client

[ Neon Postgres ]
    ├─ log_chunks (pgvector HNSW)
    └─ incidents
```
