# API Specification
# ExampleCorp — Log Ingestion & Optimization AI Agent

## Base URL
`https://wz-lab-v0-ia-cowork-log-optimization-agent.vercel.app`

---

## 1. `POST /api/ingest` — Ingest raw logs

Ingests raw EKS / Kubernetes / AWS logs. Auto-detects format.

### Accepted formats
| Content-Type | Body shape | Notes |
|---|---|---|
| `text/plain` | Raw log text | Plain kubectl / pod logs |
| `application/json` | `{ document: { raw, source?, service?, environment? } }` | Envelope format |
| `application/json` | `{ documents: [...] }` | Batch envelope |
| `application/json` | `{ Records: [...] }` | CloudTrail JSON |
| `application/x-ndjson` | One JSON per line | Fluent Bit NDJSON |

### Metadata (query params or headers)
| Key | Header | Example |
|---|---|---|
| `source` | `x-log-source` | `k8s`, `cloudwatch`, `cloudtrail` |
| `service` | `x-log-service` | `orders-api` |
| `environment` | `x-log-environment` | `production`, `staging` |

### Response `200 OK`
```json
{ "chunksIngested": 12 }
```

---

## 2. `POST /api/compress` — Compress EKS logs

Runs `compressEksLogs()` from `lib/eks-log-compressor.ts` against the request body.

### Request
```
Content-Type: text/plain | application/json | application/x-ndjson
Body: raw EKS log text or JSON array of log lines
```

### Response `200 OK`
```json
{
  "compressed": "[14:23:01Z|ERROR|orders-api] Failed to connect to postgres://rds-cluster-1:rds",
  "originalChars": 4821,
  "compressedChars": 1124,
  "reductionPct": 77
}
```

---

## 3. `POST /api/stream/control` — Start / stop stream simulator

Controls the module-scoped `setInterval` that pushes synthetic EKS logs to `/api/ingest`.

### Request body
```json
{ "action": "start" | "stop", "intervalMs": 2000 }
```
`intervalMs` range: 500–10000. Default: 2000.

### Response `200 OK`
```json
{ "running": true, "intervalMs": 2000 }
```

### `GET /api/stream/control` — Status probe
```json
{ "running": false, "intervalMs": 2000 }
```

---

## 4. `GET /api/stream` — SSE live tail

Server-Sent Events endpoint. Streams newly inserted `log_chunks` to the browser.

### Response headers
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

### Event format
```
data: {"id":"...","content":"[14:23:01Z|ERROR|orders-api] ...","severity":"error","event_time":"...","service":"orders-api"}
```

Keep-alive ping every 15s:
```
: ping
```

---

## 5. `POST /api/chat` — RAG SRE chat

Streams a structured AI response grounded in stored log chunks.

### Request body
```json
{ "messages": [{ "role": "user", "content": "What caused the CrashLoopBackOff?" }] }
```

### Response
`text/event-stream` — AI SDK stream protocol (`streamText` with `gpt-5.1-instant`).

### AI tool: `searchLogs`
The model may invoke `searchLogs` mid-response:
```json
{
  "query": "CrashLoopBackOff orders-api",
  "service": "orders-api",
  "severity": "error",
  "limit": 10
}
```
Returns top-k `log_chunks` ranked by cosine similarity.

---

## 6. `GET /api/logs` — Fetch stored log chunks

Used by SWR on the Live Logs page.

### Query params
| Param | Type | Default | Description |
|---|---|---|---|
| `service` | string | — | Filter by service name |
| `severity` | string | — | `info` / `warn` / `error` |
| `limit` | number | 50 | Max rows to return |

### Response `200 OK`
```json
{
  "chunks": [
    {
      "id": "uuid",
      "content": "[14:23:01Z|ERROR|orders-api] ...",
      "severity": "error",
      "service": "orders-api",
      "environment": "production",
      "event_time": "2024-01-15T14:23:01Z"
    }
  ]
}
```

---

## 7. `GET /api/incidents` — Fetch detected incidents

### Response `200 OK`
```json
{
  "incidents": [
    {
      "id": "uuid",
      "type": "CrashLoopBackOff",
      "service": "orders-api",
      "severity": "critical",
      "message": "Pod orders-api-7c9f entered CrashLoopBackOff",
      "detected_at": "2024-01-15T14:23:05Z"
    }
  ]
}
```
