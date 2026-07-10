"use client"

import useSWR from "swr"

export type Incident = {
  id: number
  signature: string
  service: string | null
  environment: string | null
  sources: string[]
  severity: "critical" | "error" | "warn"
  status: "open" | "resolved"
  title: string
  summary: string | null
  error_count: number
  warn_count: number
  sample_log: string | null
  first_seen: string
  last_seen: string
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const SEVERITY_STYLES: Record<Incident["severity"], { chip: string; dot: string; label: string }> = {
  critical: {
    chip: "border-secondary/50 bg-secondary/10 text-secondary",
    dot: "bg-secondary shadow-[0_0_8px_theme(colors.secondary)]",
    label: "CRITICAL",
  },
  error: {
    chip: "border-alert/50 bg-alert/10 text-alert",
    dot: "bg-alert shadow-[0_0_8px_theme(colors.alert)]",
    label: "ERROR",
  },
  warn: {
    chip: "border-accent/40 bg-accent/5 text-accent",
    dot: "bg-accent shadow-[0_0_6px_theme(colors.accent)]",
    label: "WARN",
  },
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ""
  const diff = Date.now() - then
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function IncidentCard({ incident, onSelect }: { incident: Incident; onSelect: (i: Incident) => void }) {
  const sev = SEVERITY_STYLES[incident.severity] ?? SEVERITY_STYLES.warn
  const tags = [
    incident.service ? `service: ${incident.service}` : null,
    incident.environment ? `env: ${incident.environment}` : null,
    ...incident.sources.map((s) => `src: ${s}`),
  ].filter(Boolean) as string[]

  return (
    <button
      type="button"
      onClick={() => onSelect(incident)}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface/60 p-4 text-left transition-all hover:border-accent/60 hover:shadow-[0_0_20px_-6px_theme(colors.accent)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${sev.chip}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${sev.dot} ${incident.status === "open" ? "animate-pulse" : ""}`} aria-hidden="true" />
          {sev.label}
        </span>
        <span className="font-mono text-[11px] text-muted">{relativeTime(incident.last_seen)}</span>
      </div>

      <div className="space-y-1">
        <h3 className="text-pretty text-sm font-semibold text-foreground group-hover:text-accent">{incident.title}</h3>
        {incident.summary ? <p className="text-pretty text-xs leading-relaxed text-muted">{incident.summary}</p> : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border border-alert/30 bg-alert/5 px-1.5 py-0.5 font-mono text-[10px] text-alert">
          {incident.error_count} errors
        </span>
        {tags.map((t) => (
          <span key={t} className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted">
            {t}
          </span>
        ))}
      </div>
    </button>
  )
}

export function IncidentDashboard({ onSelect }: { onSelect: (incident: Incident) => void }) {
  const { data, error, isLoading } = useSWR<{ incidents: Incident[] }>("/api/incidents", fetcher, {
    refreshInterval: 5000,
  })

  const incidents = data?.incidents ?? []
  const openCount = incidents.filter((i) => i.status === "open").length

  return (
    <div className="flex flex-col gap-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-accent text-glow-accent">
            Active Incidents
          </h2>
          <p className="mt-1 text-xs text-muted">
            Auto-detected from incoming logs. Select one to investigate with the AI.
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-2.5 py-1 font-mono text-xs text-accent">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent shadow-[0_0_6px_theme(colors.accent)]" aria-hidden="true" />
          {openCount} open
        </span>
      </div>

      {error ? (
        <div className="rounded-xl border border-alert/40 bg-alert/10 px-4 py-3 text-sm text-alert">
          Failed to load incidents.
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-border bg-surface/60 px-4 py-8 text-center text-sm text-muted">
          Scanning logs…
        </div>
      ) : incidents.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface/60 px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No incidents detected</p>
          <p className="mt-1 text-xs text-muted">
            Ship error logs to <code className="font-mono text-accent">/api/ingest</code> and detected incidents will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}
