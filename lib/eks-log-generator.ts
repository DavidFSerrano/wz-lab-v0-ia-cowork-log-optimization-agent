// Pure stateless EKS log-line factory — no I/O, no side-effects.
// Produces realistic Kubernetes / AWS log lines suitable for piping into
// /api/ingest to simulate a live cluster feed.

const NAMESPACES = ["production", "staging", "monitoring", "kube-system"]
const SERVICES = ["orders-api", "payments-svc", "inventory-svc", "auth-svc", "gateway"]
const PODS = (svc: string) => `${svc}-${Math.floor(Math.random() * 3 + 1)}-${randHex(5)}`
const NODES = ["ip-10-0-1-42", "ip-10-0-1-87", "ip-10-0-2-14", "ip-10-0-2-99"]

// Weighted severity distribution: 60% INFO / 25% WARN / 15% ERROR
const SEVERITY_WEIGHTS = [
  ...Array(60).fill("INFO"),
  ...Array(25).fill("WARN"),
  ...Array(15).fill("ERROR"),
]

// Template library keyed by severity
const TEMPLATES: Record<string, ((ctx: Ctx) => string)[]> = {
  INFO: [
    (c) => `${c.ts} INFO  ${c.svc} pod/${c.pod} Started container ${c.svc} (image: ${c.svc}:sha-${randHex(7)})`,
    (c) => `${c.ts} INFO  ${c.svc} pod/${c.pod} GET /api/v1/health 200 OK ${randInt(2, 18)}ms`,
    (c) => `${c.ts} INFO  ${c.svc} pod/${c.pod} GET /api/v1/orders/${randInt(1000, 9999)} 200 OK ${randInt(15, 120)}ms`,
    (c) => `${c.ts} INFO  ${c.svc} pod/${c.pod} POST /api/v1/checkout 201 Created ${randInt(80, 350)}ms`,
    (c) => `${c.ts} INFO  ${c.svc} pod/${c.pod} DB query ok (${randInt(1, 45)}ms) rows=${randInt(1, 500)}`,
    (c) => `${c.ts} INFO  ${c.svc} pod/${c.pod} Cache hit ratio ${randInt(70, 99)}% key=${c.svc}:session:${randHex(8)}`,
    (c) => `${c.ts} INFO  ${c.svc} pod/${c.pod} Reconciler loop completed in ${randInt(5, 50)}ms`,
    (c) => `${c.ts} INFO  kubelet node/${c.node} Successfully pulled image "${c.svc}:sha-${randHex(7)}"`,
    (c) => `${c.ts} INFO  kubelet node/${c.node} Created pod ${c.ns}/${c.pod}`,
    (c) => `${c.ts} INFO  kube-proxy node/${c.node} SyncProxyRules complete elapsed=${randInt(50, 200)}ms`,
    (c) => `${c.ts} INFO  ${c.svc} pod/${c.pod} Scaled deployment ${c.svc} to ${randInt(2, 8)} replicas`,
    (c) => `${c.ts} INFO  ${c.svc} pod/${c.pod} Message consumed from topic=orders.placed partition=${randInt(0, 5)} offset=${randInt(1000, 9999)}`,
    (c) => `${c.ts} INFO  ${c.svc} pod/${c.pod} S3 upload succeeded bucket=logs-archive key=${c.svc}/${c.ts.slice(0, 10)}.log`,
  ],
  WARN: [
    (c) => `${c.ts} WARN  ${c.svc} pod/${c.pod} Slow DB query detected (${randInt(300, 900)}ms) table=orders`,
    (c) => `${c.ts} WARN  ${c.svc} pod/${c.pod} Retry attempt ${randInt(1, 4)}/5 connecting to redis:6379`,
    (c) => `${c.ts} WARN  ${c.svc} pod/${c.pod} Memory usage at ${randInt(75, 92)}% of limit (${randInt(200, 450)}Mi / 512Mi)`,
    (c) => `${c.ts} WARN  kubelet node/${c.node} Evicting pod ${c.ns}/${c.pod} due to memory pressure`,
    (c) => `${c.ts} WARN  ${c.svc} pod/${c.pod} Liveness probe taking ${randInt(800, 2500)}ms (threshold: 1000ms)`,
    (c) => `${c.ts} WARN  ${c.svc} pod/${c.pod} Rate limit approaching: ${randInt(85, 98)}% of 1000 req/min`,
    (c) => `${c.ts} WARN  kube-scheduler Insufficient CPU on node/${c.node}: requested ${randInt(100, 400)}m available ${randInt(10, 80)}m`,
    (c) => `${c.ts} WARN  ${c.svc} pod/${c.pod} Circuit breaker half-open, testing upstream ${c.svc}-db`,
    (c) => `${c.ts} WARN  ${c.svc} pod/${c.pod} TLS certificate expires in ${randInt(5, 14)} days for ${c.svc}.internal`,
    (c) => `${c.ts} WARN  ${c.svc} pod/${c.pod} Disk usage at ${randInt(70, 88)}% on /var/log (${randInt(10, 40)}Gi / 50Gi)`,
  ],
  ERROR: [
    (c) => `${c.ts} ERROR ${c.svc} pod/${c.pod} CrashLoopBackOff: back-off ${randInt(1, 5) * 10}s restarting failed container`,
    (c) => `${c.ts} ERROR ${c.svc} pod/${c.pod} OOMKilled: container exceeded memory limit 512Mi`,
    (c) => `${c.ts} ERROR ${c.svc} pod/${c.pod} Failed to connect to postgres://rds-cluster-1:5432 — connection refused`,
    (c) => `${c.ts} ERROR ${c.svc} pod/${c.pod} AccessDenied: s3:GetObject on arn:aws:s3:::prod-data/${randHex(8)}.parquet`,
    (c) => `${c.ts} ERROR ${c.svc} pod/${c.pod} Readiness probe failed: HTTP probe failed with status: 503`,
    (c) => `${c.ts} ERROR ${c.svc} pod/${c.pod} Unhandled exception: NullPointerException at OrderService.java:${randInt(100, 400)}`,
    (c) => `${c.ts} ERROR kubelet node/${c.node} Failed to pull image "${c.svc}:sha-${randHex(7)}": ErrImagePull`,
    (c) => `${c.ts} ERROR ${c.svc} pod/${c.pod} gRPC call to payments-svc:50051 failed: DeadlineExceeded after ${randInt(5, 30)}s`,
    (c) => `${c.ts} ERROR ${c.svc} pod/${c.pod} KMS decrypt failed: InvalidKeyId — key may be disabled or deleted`,
    (c) => `${c.ts} ERROR ${c.svc} pod/${c.pod} Kafka producer error: topic=orders.placed partition=${randInt(0, 5)} — Leader not available`,
  ],
}

type Ctx = {
  ts: string
  svc: string
  pod: string
  ns: string
  node: string
}

function randHex(n: number) {
  return Math.random().toString(16).slice(2, 2 + n)
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function buildCtx(): Ctx {
  const svc = pick(SERVICES)
  return {
    ts: new Date().toISOString(),
    svc,
    pod: PODS(svc),
    ns: pick(NAMESPACES),
    node: pick(NODES),
  }
}

/**
 * Generate a single realistic EKS log line.
 */
export function generateEksLogLine(): string {
  const severity = pick(SEVERITY_WEIGHTS) as "INFO" | "WARN" | "ERROR"
  const ctx = buildCtx()
  const template = pick(TEMPLATES[severity])
  return template(ctx)
}

/**
 * Generate a batch of n EKS log lines as a plain-text blob (one per line).
 * Ready to POST directly to /api/ingest as text/plain.
 */
export function generateEksBatch(n: number): string {
  return Array.from({ length: n }, () => generateEksLogLine()).join("\n")
}
