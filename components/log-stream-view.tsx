"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { AppNav } from "./app-nav"

// ─── Types ────────────────────────────────────────────────────────────────────

type LogEntry = {
  id: number
  source: string
  service: string | null
  environment: string | null
  severity: string | null
  event_time: string
  content: string
}

type StreamStatus = {
  status: "running" | "stopped"
  interval: number
  totalBatches: number
  totalLines: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_LINES = 200

function severityColor(severity: string | null): string {
  switch (severity?.toLowerCase()) {
    case "error":
      return "text-secondary"
    case "warn":
      return "text-alert"
    default:
      return "text-accent"
  }
}

function severityBadge(severity: string | null): string {
  switch (severity?.toLowerCase()) {
    case "error":
      return "border-secondary/40 bg-secondary/10 text-secondary"
    case "warn":
      return "border-alert/40 bg-alert/10 text-alert"
    default:
      return "border-accent/40 bg-accent/10 text-accent"
  }
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour12: false })
  } catch {
    return iso.slice(11, 19)
  }
}

// Extract the first line of a chunk as the display message.
function firstLine(content: string): string {
  return content.split("\n")[0].slice(0, 160)
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string | number
  accent?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-4 py-3">
      <span className="font-mono text-xs uppercase tracking-widest text-muted">{label}</span>
      <span
        className={`font-mono text-xl font-semibold tabular-nums ${accent ? "text-accent text-glow-accent" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function LogStreamView() {
  const [running, setRunning] = useState(false)
  const [intervalMs, setIntervalMs] = useState(2000)
  const [serverStatus, setServerStatus] = useState<StreamStatus | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [sessionLines, setSessionLines] = useState(0)
  const [lastEventTime, setLastEventTime] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const tailRef = useRef<HTMLDivElement>(null)
  const esRef = useRef<EventSource | null>(null)

  // ── Fetch initial server status ──────────────────────────────────────────
  useEffect(() => {
    fetch("/api/stream/control")
      .then((r) => r.json())
      .then((data: StreamStatus) => {
        setServerStatus(data)
        setRunning(data.status === "running")
        setIntervalMs(data.interval)
      })
      .catch(() => {})
  }, [])

  // ── SSE subscription ─────────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource("/api/stream")
    esRef.current = es

    es.addEventListener("connected", () => {
      // SSE channel established — no action needed
    })

    es.onmessage = (event) => {
      try {
        const entry: LogEntry = JSON.parse(event.data)
        setLogs((prev) => {
          const next = [...prev, entry]
          return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next
        })
        setSessionLines((n) => n + 1)
        setLastEventTime(entry.event_time)
      } catch {
        // Ignore malformed events
      }
    }

    es.onerror = () => {
      // SSE will auto-reconnect on transient errors
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [])

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (autoScroll && tailRef.current) {
      tailRef.current.scrollTop = tailRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // ── Toggle generator ─────────────────────────────────────────────────────
  const toggle = useCallback(async () => {
    const action = running ? "stop" : "start"
    try {
      const res = await fetch("/api/stream/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, interval: intervalMs }),
      })
      const data: StreamStatus = await res.json()
      setServerStatus(data)
      setRunning(data.status === "running")
    } catch {
      // Swallow — button state will be corrected on next status poll
    }
  }, [running, intervalMs])

  // ── Update interval on server when slider settles ────────────────────────
  const applyInterval = useCallback(
    async (ms: number) => {
      if (!running) return
      await fetch("/api/stream/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", interval: ms }),
      }).catch(() => {})
    },
    [running],
  )

  // ── Clear log tail ────────────────────────────────────────────────────────
  const clearLogs = () => {
    setLogs([])
    setSessionLines(0)
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/80 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <span className="relative flex h-2.5 w-2.5">
            {running && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${running ? "bg-accent" : "bg-muted"}`}
            />
          </span>
          <h1 className="font-mono text-sm font-semibold uppercase tracking-widest text-foreground text-glow-accent">
            EKS Log Stream
          </h1>
          <span
            className={`rounded border px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-widest ${running ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-surface-2 text-muted"}`}
          >
            {running ? "Live" : "Paused"}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Speed slider */}
          <div className="hidden items-center gap-3 sm:flex">
            <span className="font-mono text-xs text-muted">Fast</span>
            <input
              type="range"
              min={500}
              max={10000}
              step={500}
              value={intervalMs}
              onChange={(e) => {
                const ms = Number(e.target.value)
                setIntervalMs(ms)
              }}
              onMouseUp={() => applyInterval(intervalMs)}
              onTouchEnd={() => applyInterval(intervalMs)}
              aria-label="Ingestion interval"
              className="h-1 w-28 cursor-pointer appearance-none rounded-full bg-border accent-accent"
            />
            <span className="font-mono text-xs text-muted">Slow</span>
            <span className="font-mono text-xs tabular-nums text-muted">
              {(intervalMs / 1000).toFixed(1)}s
            </span>
          </div>

          {/* Start / Stop */}
          <button
            onClick={toggle}
            className={`rounded-lg border px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest transition-all ${
              running
                ? "border-secondary/50 bg-secondary/10 text-secondary hover:bg-secondary/20 glow-secondary"
                : "border-accent/50 bg-accent/10 text-accent hover:bg-accent/20 glow-accent"
            }`}
          >
            {running ? "Stop" : "Start"}
          </button>

          {/* Clear */}
          <button
            onClick={clearLogs}
            className="rounded-lg border border-border px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:border-muted hover:text-foreground"
          >
            Clear
          </button>
        </div>
      </header>

      {/* ── Nav bar ── */}
      <div className="border-b border-border bg-surface/60 px-6 py-2">
        <AppNav />
      </div>

      <main className="flex flex-1 flex-col gap-4 p-6">
        {/* ── Metrics bar ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard label="Session Lines" value={sessionLines} accent />
          <MetricCard
            label="Total Batches"
            value={serverStatus?.totalBatches ?? 0}
          />
          <MetricCard
            label="Interval"
            value={`${(intervalMs / 1000).toFixed(1)}s`}
          />
          <MetricCard
            label="Last Event"
            value={lastEventTime ? formatTime(lastEventTime) : "—"}
          />
        </div>

        {/* ── Log tail ── */}
        <div className="flex flex-1 flex-col rounded-xl border border-border bg-surface overflow-hidden">
          {/* Tail header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="font-mono text-xs uppercase tracking-widest text-muted">
              Live Tail — last {MAX_LINES} lines
            </span>
            <label className="flex cursor-pointer items-center gap-2 font-mono text-xs text-muted">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="accent-accent"
              />
              Auto-scroll
            </label>
          </div>

          {/* Log lines */}
          <div
            ref={tailRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
            style={{ minHeight: "420px", maxHeight: "calc(100vh - 320px)" }}
          >
            {logs.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <span className="text-muted">
                  {running
                    ? "Waiting for first log lines..."
                    : 'Press "Start" to begin ingesting simulated EKS logs.'}
                </span>
              </div>
            ) : (
              logs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 border-b border-border/30 py-1 last:border-0"
                >
                  {/* Time */}
                  <span className="shrink-0 tabular-nums text-muted">
                    {formatTime(entry.event_time)}
                  </span>

                  {/* Severity badge */}
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${severityBadge(entry.severity)}`}
                  >
                    {(entry.severity ?? "info").slice(0, 4)}
                  </span>

                  {/* Service */}
                  {entry.service && (
                    <span className="shrink-0 text-muted">{entry.service}</span>
                  )}

                  {/* Message */}
                  <span className={`min-w-0 break-all ${severityColor(entry.severity)}`}>
                    {firstLine(entry.content)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── How it works ── */}
        <details className="group rounded-xl border border-border bg-surface">
          <summary className="cursor-pointer list-none px-5 py-3 font-mono text-xs uppercase tracking-widest text-muted hover:text-foreground">
            <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
            How it works
          </summary>
          <div className="border-t border-border px-5 py-4 font-mono text-xs leading-relaxed text-muted">
            <ol className="list-decimal space-y-2 pl-4">
              <li>
                <span className="text-accent">Start</span> triggers{" "}
                <span className="text-foreground">POST /api/stream/control</span> which sets a
                server-side <span className="text-foreground">setInterval</span> on the Node.js
                worker.
              </li>
              <li>
                Every <span className="text-foreground">{(intervalMs / 1000).toFixed(1)}s</span>{" "}
                the interval calls{" "}
                <span className="text-foreground">generateEksBatch(3)</span> (
                <span className="text-accent">lib/eks-log-generator.ts</span>) and POSTs the
                3-line batch to{" "}
                <span className="text-foreground">/api/ingest</span>.
              </li>
              <li>
                The ingest pipeline chunks, embeds (
                <span className="text-accent">text-embedding-3-small</span>), and stores each
                chunk in Neon pgvector.
              </li>
              <li>
                This page subscribes to{" "}
                <span className="text-foreground">GET /api/stream</span> via{" "}
                <span className="text-accent">EventSource</span>. That SSE endpoint polls Neon
                every 2 s for new <span className="text-foreground">log_chunks</span> and streams
                them here in real time.
              </li>
            </ol>
          </div>
        </details>
      </main>
    </div>
  )
}
