# Data Sources & Mock Log Service
# ExampleCorp — Log Ingestion & Optimization AI Agent

## 1. Fixture Log Files (`/logs/`)

Five static files committed to the repository. Used by `scripts/seed-logs.mjs` to pre-populate the Neon `log_chunks` table for demos.

| File | Format | Content |
|---|---|---|
| `orders-api-pod.log` | Plain text | `kubectl logs` output from a crashed `orders-api` pod — includes `CrashLoopBackOff`, PostgreSQL connection failures, KMS `AccessDeniedException`, backoff retries |
| `orders-namespace-events.log` | Plain text | `kubectl get events` tabular output — scheduling failures, image pull errors, OOMKilled events |
| `orders-api-describe.txt` | Plain text | `kubectl describe pod` output — full pod spec, conditions, container state |
| `aws-cloudtrail-kms.json` | JSON (`{ Records: [...] }`) | CloudTrail records for KMS API calls — `GenerateDataKey`, `Decrypt`, `AccessDenied` |
| `aws-rds-events.log` | Plain text | RDS event log — failover, connection count spikes, CPU/memory metrics |

Each file is POSTed to `/api/ingest` as a `{ document: { source, service, environment, raw } }` envelope. The ingest endpoint auto-detects format and chunks accordingly.

---

## 2. Live Stream Generator (`lib/eks-log-generator.ts`)

A zero-dependency TypeScript factory that produces stateless, weighted-random EKS log lines. No external data source or file read required.

### Configuration
```typescript
// Services (round-robin)
['orders-api', 'payment-svc', 'inventory-api', 'auth-gateway', 'notification-svc']

// Nodes
['ip-10-0-1-42', 'ip-10-0-2-17', 'ip-10-0-3-88', 'ip-10-0-4-55']

// Namespaces
['orders', 'payments', 'platform', 'infra']

// Weight distribution
INFO:  60%
WARN:  25%
ERROR: 15%
```

### Message templates (33 total)
- **INFO (×14):** Pod started, request handled, DB connection established, health check passed, config loaded, deployment scaled, replica ready, etc.
- **WARN (×10):** High memory usage, slow DB query, retry attempt, rate limit approaching, certificate expiry warning, pod restart, etc.
- **ERROR (×9):** CrashLoopBackOff, OOMKilled, ImagePullBackOff, KMS AccessDenied, DB connection refused, liveness probe failed, etc.

### Key exports
```typescript
export function generateEksLog(): string          // single log line
export function generateEksBatch(n: number): string  // n lines as plain text blob
```

### Output format
Each line is a plain-text EKS log entry compatible with the `/api/ingest` endpoint:
```
2024-01-15T14:23:01.123Z ERROR orders-api Failed to connect to postgres — connection refused
2024-01-15T14:23:01.456Z INFO  payment-svc Request processed successfully in 142ms
```

---

## 3. Seed Script (`scripts/seed-logs.mjs`)

Node.js ESM script that:
1. Truncates the `log_chunks` and `incidents` tables (clean slate)
2. Reads each fixture file from `/logs/`
3. POSTs each to `http://localhost:3000/api/ingest` as an envelope
4. Logs chunk count per file

```bash
node --env-file-if-exists=/vercel/share/.env.project scripts/seed-logs.mjs
```

Requires `DATABASE_URL` and `OPENAI_API_KEY` (via AI Gateway) in the environment.

---

## 4. Database Schema (Neon Postgres)

```sql
-- log_chunks
CREATE TABLE log_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source      TEXT,
  service     TEXT,
  environment TEXT,
  severity    TEXT,           -- 'info' | 'warn' | 'error'
  event_time  TIMESTAMPTZ,
  content     TEXT,
  embedding   vector(1536)
);

CREATE INDEX ON log_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON log_chunks (service, environment, event_time);

-- incidents
CREATE TABLE incidents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT,
  service     TEXT,
  severity    TEXT,
  message     TEXT,
  detected_at TIMESTAMPTZ DEFAULT now()
);
```
