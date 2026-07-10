/**
 * ExampleCorp Log-Optimization Engine — High-Fidelity Mock Service
 * Adapted from 00_inputs/04_Data_Sources/mockLogService.ts for use within the app.
 */

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG"
export type LogSource = "k8s" | "cloudwatch" | "cloudtrail" | "traefik" | "istio"

export interface LogLine {
  id: string
  timestamp: string
  level: LogLevel
  service: string
  source: LogSource
  message: string
  rawSizeChars: number
  compressedSizeChars: number
  isStripped: boolean
}

export interface OptimizationMetrics {
  tokensSavedHourly: number
  linesRemoved: number
  linesSent: number
  compressionRatio: number // percentage of original size remaining
}

export const INITIAL_METRICS: OptimizationMetrics = {
  tokensSavedHourly: 0,
  linesRemoved: 0,
  linesSent: 0,
  compressionRatio: 32,
}

// Realistic Kubernetes log pool covering health checks, errors, warnings, auth events
const RAW_LOG_POOL: Omit<LogLine, "id" | "timestamp">[] = [
  {
    level: "INFO",
    service: "orders-api",
    source: "k8s",
    message: "GET /healthz 200 OK - connection pool active - thread_id=9821-uuid-4412-88ef",
    rawSizeChars: 82,
    compressedSizeChars: 15,
    isStripped: true,
  },
  {
    level: "INFO",
    service: "auth-service",
    source: "k8s",
    message: "Validating token session hash=77a1bc829de312ef4409bbbb9a8e - user_id=usr-9921",
    rawSizeChars: 81,
    compressedSizeChars: 81,
    isStripped: false,
  },
  {
    level: "ERROR",
    service: "orders-api",
    source: "k8s",
    message: "CrashLoopBackOff in pod orders-api-5f8b9 — OOMKilled — Exit Code 137",
    rawSizeChars: 75,
    compressedSizeChars: 75,
    isStripped: false,
  },
  {
    level: "WARN",
    service: "payment-gateway",
    source: "k8s",
    message:
      "Database connection latency spike detected - cluster-us-east-1a-replica-01 - elapsed=420ms",
    rawSizeChars: 93,
    compressedSizeChars: 93,
    isStripped: false,
  },
  {
    level: "INFO",
    service: "orders-api",
    source: "k8s",
    message: "kube-probe/1.26 internal healthcheck system signal processing tick event ok",
    rawSizeChars: 73,
    compressedSizeChars: 0,
    isStripped: true,
  },
  {
    level: "DEBUG",
    service: "auth-service",
    source: "k8s",
    message: "JWT decode success - alg=RS256 - exp=2026-07-10T16:00:00Z - sub=svc-orders",
    rawSizeChars: 78,
    compressedSizeChars: 78,
    isStripped: false,
  },
  {
    level: "ERROR",
    service: "payment-gateway",
    source: "cloudwatch",
    message: "FATAL: connection pool exhausted - max_connections=100 reached - pg.PoolError",
    rawSizeChars: 80,
    compressedSizeChars: 80,
    isStripped: false,
  },
  {
    level: "WARN",
    service: "orders-api",
    source: "k8s",
    message: "Backoff restart count=5 for container orders-api in pod orders-api-5f8b9",
    rawSizeChars: 74,
    compressedSizeChars: 74,
    isStripped: false,
  },
  {
    level: "INFO",
    service: "auth-service",
    source: "k8s",
    message: "GET /healthz 200 OK - replica=auth-service-b7c2d - thread_id=1102-uuid-9981-33ab",
    rawSizeChars: 84,
    compressedSizeChars: 12,
    isStripped: true,
  },
  {
    level: "INFO",
    service: "orders-api",
    source: "cloudtrail",
    message: "IAM AssumeRole: arn:aws:iam::123456789012:role/orders-api-role — requestId=abc123",
    rawSizeChars: 85,
    compressedSizeChars: 85,
    isStripped: false,
  },
  {
    level: "WARN",
    service: "payment-gateway",
    source: "k8s",
    message: "Liveness probe failed: HTTP probe failed with statuscode: 503 for pod payment-gw-7x",
    rawSizeChars: 88,
    compressedSizeChars: 88,
    isStripped: false,
  },
  {
    level: "DEBUG",
    service: "orders-api",
    source: "k8s",
    message: "SIGTERM received — graceful shutdown initiated — drain_timeout=30s",
    rawSizeChars: 66,
    compressedSizeChars: 66,
    isStripped: false,
  },
]

/** Generate one new log line and compute updated metrics. */
export function generateLiveLogStream(
  callback: (log: LogLine, updatedMetrics: OptimizationMetrics) => void,
  currentMetrics: OptimizationMetrics,
) {
  const template = RAW_LOG_POOL[Math.floor(Math.random() * RAW_LOG_POOL.length)]

  const freshLog: LogLine = {
    ...template,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
  }

  const savingsChars = freshLog.rawSizeChars - freshLog.compressedSizeChars
  const tokensSaved = Math.max(0, Math.floor(savingsChars / 4))

  const totalLinesRemoved = currentMetrics.linesRemoved + (freshLog.isStripped ? 1 : 0)
  const totalLinesSent = currentMetrics.linesSent + (freshLog.compressedSizeChars > 0 ? 1 : 0)

  const totalRawChars =
    (currentMetrics.linesRemoved + currentMetrics.linesSent) * 80 + freshLog.rawSizeChars
  const totalCompChars = currentMetrics.linesSent * 50 + freshLog.compressedSizeChars
  const calculatedRatio = Math.round((totalCompChars / totalRawChars) * 100)

  const updatedMetrics: OptimizationMetrics = {
    tokensSavedHourly: currentMetrics.tokensSavedHourly + tokensSaved,
    linesRemoved: totalLinesRemoved,
    linesSent: totalLinesSent,
    compressionRatio: calculatedRatio > 0 ? calculatedRatio : 32,
  }

  callback(freshLog, updatedMetrics)
}

/** Simulated multi-agent RCA diagnostic report (markdown). */
export function fetchAgentDiagnosticReport(serviceName: string): string {
  const ts = new Date().toISOString()
  return `### Incident Summary
At **${ts}**, service \`${serviceName}\` triggered sequential container restarts inside the production Kubernetes cluster, culminating in a \`CrashLoopBackOff\` state.

---

### Root Cause Analysis (RCA)
1. **Local Filter Analysis:** The optimization engine condensed 12,000 repeating stack frames down to 2 distinct event patterns, preventing input window exhaustion.
2. **Memory Leak Isolation:** An unhandled heap overflow was located inside the transaction route orchestration layer, causing an \`OOMKilled\` (Exit Code 137) response.

---

### Remediation & Recovery Directives
**Immediate Workaround** — Execute rolling restart to free stale memory segments:
\`\`\`bash
kubectl rollout restart deployment/${serviceName} -n production
\`\`\`
**Permanent Resolution** — Patch node sizing in deployment descriptors or adjust thread-pool threshold limits.

---

### Prevention
- Set memory limits in pod specs: \`resources.limits.memory: 512Mi\`
- Enable OOM alerting via \`kube-state-metrics\` + Prometheus rule \`KubePodOOMKilled\`
- Add horizontal pod autoscaling (HPA) to absorb traffic spikes before OOM occurs.`
}
