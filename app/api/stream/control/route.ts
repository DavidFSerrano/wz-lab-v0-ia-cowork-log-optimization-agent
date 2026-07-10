// POST /api/stream/control
//
// Starts or stops a server-side setInterval that generates synthetic EKS log
// lines and POSTs them to /api/ingest at a configurable interval.
//
// Body: { action: "start" | "stop", interval?: number }
//   interval — milliseconds between batches (default 2000, min 500, max 10000)
//
// The timer lives in module scope so it persists across requests within the
// same Node.js worker process. Expected behaviour: resets on cold start.

import { generateEksBatch } from "@/lib/eks-log-generator"

// Module-level state shared across requests in the same worker.
let timer: ReturnType<typeof setInterval> | null = null
let currentInterval = 2000
let totalBatches = 0
let totalLines = 0

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

async function sendBatch(batchSize: number) {
  const raw = generateEksBatch(batchSize)
  try {
    await fetch(`${getBaseUrl()}/api/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "x-log-source": "eks-simulator",
        "x-log-service": "stream-generator",
        "x-log-environment": "demo",
      },
      body: raw,
    })
    totalBatches++
    totalLines += batchSize
  } catch {
    // Swallow ingest errors — the generator keeps running regardless.
  }
}

function startTimer(interval: number, batchSize: number) {
  if (timer) clearInterval(timer)
  currentInterval = interval
  timer = setInterval(() => sendBatch(batchSize), interval)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

export async function POST(req: Request) {
  let body: { action?: string; interval?: number; batchSize?: number }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { action, interval, batchSize = 3 } = body

  if (action === "start") {
    const ms = Math.min(Math.max(interval ?? 2000, 500), 10_000)
    startTimer(ms, batchSize)
    return Response.json({
      status: "started",
      interval: ms,
      batchSize,
      totalBatches,
      totalLines,
    })
  }

  if (action === "stop") {
    stopTimer()
    return Response.json({
      status: "stopped",
      totalBatches,
      totalLines,
    })
  }

  // GET-like status probe via POST with no action
  return Response.json({
    status: timer ? "running" : "stopped",
    interval: currentInterval,
    totalBatches,
    totalLines,
  })
}

export async function GET() {
  return Response.json({
    status: timer ? "running" : "stopped",
    interval: currentInterval,
    totalBatches,
    totalLines,
  })
}
