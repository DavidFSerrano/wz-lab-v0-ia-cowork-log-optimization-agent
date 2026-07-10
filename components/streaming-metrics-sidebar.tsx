"use client"

import { useEffect, useRef, useState } from "react"
import { Activity, Cpu, Filter, Radio, TrendingDown, Zap } from "lucide-react"
import {
  generateLiveLogStream,
  type LogLine,
  type OptimizationMetrics,
  INITIAL_METRICS,
} from "@/lib/mockLogService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

// ─── Level badge ────────────────────────────────────────────────────────────
const LEVEL_STYLES: Record<LogLine["level"], string> = {
  ERROR: "text-red-500 border-red-500/50 bg-red-900/30",
  WARN:  "text-amber-500 border-amber-500/50 bg-amber-900/30",
  INFO:  "text-green-500 border-green-500/50 bg-green-900/20",
  DEBUG: "text-zinc-400 border-zinc-700 bg-zinc-900/40",
}

const SOURCE_ABBR: Record<string, string> = {
  k8s:         "K8S",
  cloudwatch:  "CW",
  cloudtrail:  "CT",
  traefik:     "TRF",
  istio:       "IST",
}

// ─── Metric card ────────────────────────────────────────────────────────────
function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  accent,
  glow,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  unit?: string
  accent: string
  glow: string
}) {
  return (
    <Card className={cn("border-zinc-800 bg-zinc-950 text-zinc-200", glow)}>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-1.5 font-sans text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          <Icon size={12} className={accent} aria-hidden="true" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        <p className={cn("font-mono text-xl font-bold tabular-nums", accent)}>
          {value}
          {unit && (
            <span className="ml-1 text-xs font-normal text-zinc-500">{unit}</span>
          )}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Log row ────────────────────────────────────────────────────────────────
function LogRow({ log, isNew }: { log: LogLine; isNew: boolean }) {
  const timeStr = new Date(log.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  return (
    <li
      className={cn(
        "flex items-start gap-2 border-b border-zinc-800/60 py-1.5 pr-2 pl-1",
        isNew && "log-slide-in",
        log.isStripped ? "opacity-40" : "opacity-100",
      )}
    >
      {/* Stripped indicator */}
      <span
        className={cn(
          "mt-0.5 shrink-0 h-1.5 w-1.5 rounded-full",
          log.isStripped ? "bg-zinc-700" : "bg-green-500",
        )}
        title={log.isStripped ? "Stripped" : "Forwarded"}
        aria-label={log.isStripped ? "Stripped" : "Forwarded"}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-mono text-[10px]">
          <span className="text-zinc-600 tabular-nums">{timeStr}</span>
          <span
            className={cn(
              "shrink-0 rounded border px-1 py-0 text-[9px] font-semibold uppercase",
              LEVEL_STYLES[log.level],
            )}
          >
            {log.level}
          </span>
          <span className="rounded border border-zinc-800 bg-zinc-900 px-1 py-0 text-[9px] text-zinc-400">
            {SOURCE_ABBR[log.source] ?? log.source.toUpperCase()}
          </span>
          <span className="truncate text-zinc-400">{log.service}</span>
        </div>
        <p
          className={cn(
            "mt-0.5 font-mono text-[10px] leading-snug",
            log.isStripped ? "text-zinc-600 line-through decoration-zinc-700" : "text-zinc-300",
          )}
        >
          {log.message}
        </p>
        {!log.isStripped && log.compressedSizeChars < log.rawSizeChars && (
          <p className="mt-0.5 font-mono text-[9px] text-green-600">
            {log.rawSizeChars}ch → {log.compressedSizeChars}ch (
            {Math.round((1 - log.compressedSizeChars / log.rawSizeChars) * 100)}% reduction)
          </p>
        )}
      </div>
    </li>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
const MAX_LOGS = 80

export function StreamingMetricsSidebar() {
  const [logs, setLogs] = useState<LogLine[]>([])
  const [newLogId, setNewLogId] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<OptimizationMetrics>(INITIAL_METRICS)
  const [streaming, setStreaming] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const metricsRef = useRef<OptimizationMetrics>(INITIAL_METRICS)
  const scrollRef = useRef<HTMLUListElement>(null)

  // Sync ref with state so the interval closure always reads the latest metrics
  useEffect(() => {
    metricsRef.current = metrics
  }, [metrics])

  useEffect(() => {
    if (!streaming) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      generateLiveLogStream((log, updatedMetrics) => {
        setLogs((prev) => {
          const next = [log, ...prev]
          return next.length > MAX_LOGS ? next.slice(0, MAX_LOGS) : next
        })
        setNewLogId(log.id)
        setMetrics(updatedMetrics)
        metricsRef.current = updatedMetrics
      }, metricsRef.current)
    }, 900)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [streaming])

  const sentPct =
    metrics.linesRemoved + metrics.linesSent > 0
      ? Math.round(
          (metrics.linesSent / (metrics.linesRemoved + metrics.linesSent)) * 100,
        )
      : 0

  return (
    <aside className="flex h-full flex-col border-r border-zinc-800 bg-zinc-950">
      {/* ── Sidebar header ── */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              streaming
                ? "animate-pulse bg-green-500 shadow-[0_0_8px_2px_rgba(34,197,94,0.6)]"
                : "bg-zinc-600",
            )}
            aria-hidden="true"
          />
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-zinc-300">
            Log Stream
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-zinc-500">
            {streaming ? "LIVE" : "PAUSED"}
          </span>
          <Switch
            checked={streaming}
            onCheckedChange={setStreaming}
            aria-label="Toggle live log streaming"
            className="data-checked:bg-green-600"
          />
        </div>
      </div>

      {/* ── Telemetry metric cards ── */}
      <div className="grid grid-cols-2 gap-2 border-b border-zinc-800 p-3">
        <MetricCard
          icon={Zap}
          label="Tokens Saved"
          value={metrics.tokensSavedHourly.toLocaleString()}
          accent="text-green-500"
          glow=""
        />
        <MetricCard
          icon={TrendingDown}
          label="Compression"
          value={metrics.compressionRatio}
          unit="%"
          accent="text-green-400"
          glow=""
        />
        <MetricCard
          icon={Filter}
          label="Lines Stripped"
          value={metrics.linesRemoved.toLocaleString()}
          accent="text-amber-500"
          glow=""
        />
        <MetricCard
          icon={Activity}
          label="Lines Sent"
          value={metrics.linesSent.toLocaleString()}
          accent="text-zinc-300"
          glow=""
        />
      </div>

      {/* ── Throughput bar ── */}
      <div className="border-b border-zinc-800 px-3 py-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-500">
            <Cpu size={10} className="text-green-600" aria-hidden="true" />
            Filter throughput
          </span>
          <span className="font-mono text-[10px] text-green-500">{sentPct}% forwarded</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${sentPct}%` }}
            role="progressbar"
            aria-valuenow={sentPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* ── Log feed header ── */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="flex items-center gap-1.5 font-sans text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          <Radio size={10} aria-hidden="true" />
          Raw feed
        </span>
        <span className="font-mono text-[10px] text-zinc-600">{logs.length} lines</span>
      </div>

      {/* ── Log feed ── */}
      <div className="flex-1 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="px-4 py-6 font-mono text-[11px] text-zinc-600">
            <span className="blink">_</span> Waiting for log stream…
          </p>
        ) : (
          <ul ref={scrollRef} className="divide-y-0 font-mono text-xs">
            {logs.map((log) => (
              <LogRow key={log.id} log={log} isNew={log.id === newLogId} />
            ))}
          </ul>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-zinc-800 px-3 py-2">
        <p className="font-mono text-[9px] text-zinc-700">
          [SYSTEM] ExampleCorp Local Filter Engine v1.0 — regex dedup active
        </p>
      </div>
    </aside>
  )
}
