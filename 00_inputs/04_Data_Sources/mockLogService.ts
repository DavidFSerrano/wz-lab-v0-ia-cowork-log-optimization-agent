/**
 * ExampleCorp Log-Optimization Engine — High-Fidelity Mock Service
 * Simulates a local Python background daemon running inside a Next.js / React application context.
 */

export interface LogLine {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  service: string;
  source: 'k8s' | 'cloudwatch' | 'cloudtrail' | 'traefik' | 'istio';
  message: string;
  rawSizeChars: number;
  compressedSizeChars: number;
  isStripped: boolean;
}

export interface OptimizationMetrics {
  tokensSavedHourly: number;
  linesRemoved: number;
  linesSent: number;
  compressionRatio: number; // Output vs Input
}

// Simulated YAML configuration content for future extensible multi-source mapping
export const mockYamlConfig = `
version: "v1alpha"
engine:
  mode: "aggressive-dedup"
  token_ratio: 0.25 # 1 token per 4 characters
sources:
  - name: "k8s-cluster-prod"
    type: "k8s"
    endpoint: "https://wz-lab-v0-ia-cowork-log-optimizatio.vercel.app/api/ingest"
    enabled: true
    services:
      - "orders-api"
      - "payment-gateway"
      - "auth-service"
`;

// Pool of repetitive raw server items used to simulate active container logs
const RAW_LOG_POOL: Omit<LogLine, 'id' | 'timestamp'>[] = [
  {
    level: 'INFO',
    service: 'orders-api',
    source: 'k8s',
    message: 'GET /healthz 200 OK - connection pool active - thread_id=9821-uuid-4412-88ef',
    rawSizeChars: 82,
    compressedSizeChars: 15, // Strips health check redundancy and UUID tokens down to shorthand definitions
    isStripped: true,
  },
  {
    level: 'INFO',
    service: 'auth-service',
    source: 'k8s',
    message: 'Validating token session hash=77a1bc829de312ef4409bbbb9a8e - user_id=usr-9921',
    rawSizeChars: 81,
    compressedSizeChars: 81,
    isStripped: false,
  },
  {
    level: 'ERROR',
    service: 'orders-api',
    source: 'k8s',
    message: 'CrashLoopBackOff in pod orders-api-5f8b9 — OOMKilled — Exit Code 137',
    rawSizeChars: 75,
    compressedSizeChars: 75,
    isStripped: false,
  },
  {
    level: 'WARN',
    service: 'payment-gateway',
    source: 'k8s',
    message: 'Database connection latency spike detected - cluster-us-east-1a-replica-01 - elapsed=420ms',
    rawSizeChars: 93,
    compressedSizeChars: 93,
    isStripped: false,
  },
  {
    level: 'INFO',
    service: 'orders-api',
    source: 'k8s',
    message: 'kube-probe/1.26 internal healthcheck system signal processing tick event ok',
    rawSizeChars: 73,
    compressedSizeChars: 0, // Entire line stripped under structural rule exclusions
    isStripped: true,
  }
];

export function generateLiveLogStream(callback: (log: LogLine, updatedMetrics: OptimizationMetrics) => void, currentMetrics: OptimizationMetrics) {
  const targetIndex = Math.floor(Math.random() * RAW_LOG_POOL.length);
  const selectedTemplate = RAW_LOG_POOL[targetIndex];
  
  const now = new Date();
  const freshLog: LogLine = {
    ...selectedTemplate,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: now.toISOString(),
  };

  // Metric Calculation Logic
  const addedLinesRemoved = freshLog.isStripped ? 1 : 0;
  const addedLinesSent = freshLog.compressedSizeChars > 0 ? 1 : 0;
  
  const savingsChars = freshLog.rawSizeChars - freshLog.compressedSizeChars;
  const tokensSaved = Math.max(0, Math.floor(savingsChars / 4));

  const totalLinesRemoved = currentMetrics.linesRemoved + addedLinesRemoved;
  const totalLinesSent = currentMetrics.linesSent + addedLinesSent;
  
  // Running simulation totals calculation for ratio logic
  const historicalRawChars = (currentMetrics.linesRemoved + currentMetrics.linesSent) * 80 + freshLog.rawSizeChars;
  const historicalCompChars = (currentMetrics.linesSent * 50) + freshLog.compressedSizeChars;
  const calculatedRatio = Math.round((historicalCompChars / historicalRawChars) * 100);

  const updatedMetrics: OptimizationMetrics = {
    tokensSavedHourly: currentMetrics.tokensSavedHourly + tokensSaved,
    linesRemoved: totalLinesRemoved,
    linesSent: totalLinesSent,
    compressionRatio: calculatedRatio > 0 ? calculatedRatio : 32,
  };

  callback(freshLog, updatedMetrics);
}

// Simulated multi-agent diagnostics payload response generator
export const fetchAgentDiagnosticReport = (serviceName: string): string => {
  return `### 🚨 Incident Summary
At **2026-07-10T13:55:36Z**, the service \`${serviceName}\` triggered multiple sequential container restarts inside the production Kubernetes cluster, culminating in a \`CrashLoopBackOff\` state for pod cluster groups.

---

### 🔍 Root Cause Analysis (RCA)
1. **Local Filter Analysis:** The optimization engine condensed 12,000 repeating stack frames down to 2 distinct event patterns, avoiding input window exhaustion.
2. **Memory Leak Isolation:** An unhandled heap overflow pattern was located inside the transaction route orchestration layer. This caused node resources to flag an \`OOMKilled\` (Exit Code 137) response.

---

### 🛠 Remediation & Recovery Directives
* **Immediate Workaround:** Execute rolling restart cluster commands to free stale zombie memory segments:
  \`\`\`shell
  kubectl rollout restart deployment/${serviceName} -n production
  \`\`\`
* **Permanent Resolution:** Patch node sizing specifications within deployment descriptors or adjust threshold limits on application thread-pools.`;
};
