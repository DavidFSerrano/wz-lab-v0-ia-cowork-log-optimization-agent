"use client"

import useSWR from "swr"
import Link from "next/link"
import { useEffect, useState } from "react"

type LogRow = {
  id: number
  source: string
  service: string | null
  environment: string | null
  severity: string | null
  event_time: string
  content: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<{ logs: LogRow[] }>)

const SEVERITY_STYLES: Record<string, string> = {
  error: "border-secondary/50 bg-secondary/10 text-secondary shadow-[0_0_8px_-2px_theme(colors.secondary)]",
  warn: "border-alert/40 bg-alert/10 text-alert",
  info: "border-accent/30 bg-accent/5 text-accent",
}

function severityClass(sev: string | null) {
  return SEVERITY_STYLES[sev ?? "info"] ?? SEVERITY_STYLES.info
}

function timeAgo(iso: string) {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return iso
  const secs = Math.round((Date.now() - then) / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

function LogEntry({ row }: { row: LogRow }) {
  const [open, setOpen] = useState(false)
  const preview = row.content.split("\n")[0].slice(0, 160)

  return (
    <li className="rounded-xl border border-border bg-surface/60 transition-all hover:border-accent/60 hover:shadow-[0_0_16px_-6px_theme(colors.accent)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <span
          className={`mt-0.5 shrink-0 rounded-md border px-2 py-0.5 font-mono text-[11px] font-medium uppercase ${severityClass(
            row.severity,
          )}`}
        >
          {row.severity ?? "info"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-foreground">{row.source}</span>
            {row.service && <span className="font-mono">{row.service}</span>}
            {row.environment && <span className="font-mono">· {row.environment}</span>}
            <span className="ml-auto tabular-nums">{timeAgo(row.event_time)}</span>
          </div>
          <p className={`mt-1 font-mono text-xs text-foreground ${open ? "" : "truncate"}`}>
            {open ? "" : preview}
          </p>
          {open && (
            <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-foreground">
              {row.content}
            </pre>
          )}
        </div>
      </button>
    </li>
  )
}

export function LogsFeed() {
  const [live, setLive] = useState(true)
  const [origin, setOrigin] = useState("")
  useEffect(() => setOrigin(window.location.origin), [])
  const { data, error, isLoading, mutate } = useSWR("/api/logs?limit=100", fetcher, {
    refreshInterval: live ? 3000 : 0,
    keepPreviousData: true,
  })

  const logs = data?.logs ?? []

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-accent/20 bg-surface/60 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div
            className="glow-accent flex h-7 w-7 items-center justify-center rounded-lg border border-accent/60 bg-accent/10 font-mono text-xs font-bold text-accent"
            aria-hidden="true"
          >
            AI
          </div>
          <h1 className="text-glow-accent font-mono text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Live<span className="text-secondary text-glow-secondary">//</span>Ingest
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:text-foreground"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${live ? "animate-pulse bg-accent shadow-[0_0_6px_theme(colors.accent)]" : "bg-muted"}`}
              aria-hidden="true"
            />
            {live ? "Live" : "Paused"}
          </button>
          <Link
            href="/"
            className="rounded-lg border border-border px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Chat
          </Link>
          <Link
            href="/architecture"
            className="rounded-lg border border-border px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Architecture
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted">
              {logs.length > 0 ? `Showing ${logs.length} most recent chunks` : "Waiting for logs…"}
            </p>
            <button
              type="button"
              onClick={() => mutate()}
              className="text-xs font-medium text-accent transition-opacity hover:opacity-80"
            >
              Refresh
            </button>
          </div>

          <div className="mb-6 rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-foreground">Ship logs from anything</p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 font-mono text-[11px] leading-relaxed text-muted">
{`curl -X POST ${origin}/api/ingest \\
  -H "x-log-source: k8s" \\
  -H "x-log-service: orders-api" \\
  --data "your raw log line here"`}
            </pre>
          </div>

          {error && (
            <div className="rounded-xl border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-alert">
              Failed to load logs. Retrying…
            </div>
          )}

          {isLoading && logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">
              No logs yet. POST to <span className="font-mono text-foreground">/api/ingest</span> to see them appear
              here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {logs.map((row) => (
                <LogEntry key={row.id} row={row} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
