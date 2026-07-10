"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { Markdown } from "./markdown"
import { AppNav } from "./app-nav"

/* ------------------------------------------------------------------ *
 * Pre-existing logs (real content from /logs) that power this demo.
 * The demo is self-contained and deterministic so the showcase always
 * renders — no backend or DB state required.
 * ------------------------------------------------------------------ */

type LogSource = {
  id: string
  source: "k8s" | "aws"
  label: string
  meta: string
  chunks: number
  lines: { sev: "info" | "warn" | "error"; text: string }[]
}

const LOG_SOURCES: LogSource[] = [
  {
    id: "pod",
    source: "k8s",
    label: "orders-api-pod.log",
    meta: "kubectl logs · orders-api-7c9f8b6d5f-nqx2p",
    chunks: 4,
    lines: [
      { sev: "info", text: "02:40:31 INFO  [startup] orders-api v2.8.4 starting (profile=prod)" },
      { sev: "info", text: "02:40:31 INFO  [config] assumed role orders-api-irsa (AssumeRoleWithWebIdentity ok)" },
      { sev: "warn", text: "02:40:32 WARN  [db]   pool warm-up attempt 1 timed out after 2000ms" },
      { sev: "error", text: "02:40:38 ERROR [secrets] KmsException: not authorized to perform kms:Decrypt on key/4a1e9c33… (AccessDeniedException)" },
      { sev: "error", text: "02:40:38 ERROR [startup] fatal: datasource initialization failed (no usable DB credentials)" },
    ],
  },
  {
    id: "events",
    source: "k8s",
    label: "orders-namespace-events.log",
    meta: "kubectl get events -n orders",
    chunks: 3,
    lines: [
      { sev: "info", text: "02:05 Normal  ScalingReplicaSet  scaled up orders-api to 6 (rollout of v2.8.4)" },
      { sev: "warn", text: "02:14 Warning Unhealthy          Readiness probe failed: connection refused" },
      { sev: "warn", text: "02:17 Warning FailedScheduling   0/9 nodes available: 3 Insufficient cpu" },
      { sev: "warn", text: "02:16 Warning BackOff            Back-off restarting failed container orders-api" },
    ],
  },
  {
    id: "cloudtrail",
    source: "aws",
    label: "aws-cloudtrail-kms.json",
    meta: "CloudTrail · KMS key 4a1e9c33…",
    chunks: 4,
    lines: [
      { sev: "info", text: "01:58:20 Decrypt  orders-api-irsa  → SUCCESS (before the change)" },
      { sev: "error", text: "02:12:38 PutKeyPolicy  terraform-ci-deployer  → key policy replaced (PR infra/pr-1174)" },
      { sev: "error", text: "02:14:07 Decrypt  orders-api-irsa  → AccessDenied (no policy allows kms:Decrypt)" },
      { sev: "error", text: "02:14:53 Decrypt  orders-api-irsa  → AccessDenied" },
    ],
  },
  {
    id: "rds",
    source: "aws",
    label: "aws-rds-events.log",
    meta: "RDS describe-events · orders-db",
    chunks: 2,
    lines: [
      { sev: "info", text: "01:50 Backup completed successfully — no events in incident window" },
      { sev: "info", text: "02:00 CPU 24% · connections 191 · replica-lag 20ms — nominal" },
      { sev: "info", text: "02:30 connections DROP to 77 as pods stop connecting (no DB outage)" },
    ],
  },
]

const TOTAL_CHUNKS = LOG_SOURCES.reduce((n, s) => n + s.chunks, 0)

const SEARCHES = [
  { q: "orders-api CrashLoopBackOff root cause", src: "k8s", hits: 4 },
  { q: "readiness probe failed / BackOff events", src: "k8s", hits: 3 },
  { q: "kms Decrypt AccessDenied orders-api-irsa", src: "aws", hits: 3 },
  { q: "orders-db health cpu connections failover", src: "aws", hits: 1 },
]

const DIAGNOSIS = `**Summary** — \`orders-api\` (prod) began CrashLoopBackOff at ~02:14 UTC. New pods fail at startup because they cannot decrypt the database secret. The fatal error is a **KMS \`AccessDenied\`**, not a database or capacity problem.

### Timeline
- **02:06** — v2.8.4 rollout completes cleanly; pods healthy for ~8 min.
- **02:12:38** — CloudTrail \`PutKeyPolicy\` by \`terraform-ci-deployer\` replaces the KMS key policy (PR \`infra/pr-1174\`), **dropping the \`kms:Decrypt\` grant** for \`orders-api-irsa\`.
- **02:14** — pods restart, call \`kms:Decrypt\` → \`AccessDenied\`; readiness probes fail → CrashLoopBackOff.

### Red herrings (ruled out)
- **Capacity / FailedScheduling** — only one pod was briefly unschedulable; the autoscaler added nodes and the rescheduled pod *also* crashed. Not the cause.
- **DB connection timeouts** — transient pool warm-up warnings. Aurora is healthy (CPU ~20%, no failover); connections *decline* because apps stop connecting.

### Root cause
An unintended change in PR \`infra/pr-1174\` removed the statement granting \`kms:Decrypt\` to \`arn:aws:iam::480129847221:role/orders-api-irsa\` on key \`4a1e9c33…\`. Without decrypt, pods can't read the DB secret and exit fatally.

### Remediation
1. Restore the \`kms:Decrypt\` grant for \`orders-api-irsa\` on the key policy (revert the relevant part of \`infra/pr-1174\`).
2. Verify with a \`kms:Decrypt\` test using the IRSA role, then let pods recover.
3. Add a policy guardrail/test so key-policy diffs that drop app grants fail CI.`

/* ------------------------------------------------------------------ *
 * Icons
 * ------------------------------------------------------------------ */

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}
function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  )
}
function RestartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
function SourceIcon({ source }: { source: "k8s" | "aws" }) {
  if (source === "aws") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 2 8.66 5v10L12 22 3.34 17V7z" />
      <path d="M12 22V12M3.34 7 12 12l8.66-5" />
    </svg>
  )
}

const SEV_DOT: Record<string, string> = {
  info: "bg-muted",
  warn: "bg-alert shadow-[0_0_6px_theme(colors.alert)]",
  error: "bg-secondary shadow-[0_0_6px_theme(colors.secondary)]",
}

/* ------------------------------------------------------------------ *
 * Steps
 * ------------------------------------------------------------------ */

const STEPS = [
  { key: "raw", eyebrow: "The problem", title: "Raw logs across systems" },
  { key: "ingest", eyebrow: "Write path", title: "Ingest, chunk & embed" },
  { key: "detect", eyebrow: "Parallel", title: "Incident auto-detected" },
  { key: "investigate", eyebrow: "Read path", title: "Ask the agent" },
] as const

const STEP_MS = [7000, 6000, 5000, 9000]

export function DemoView() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [runKey, setRunKey] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLast = step === STEPS.length - 1

  // Auto-advance while playing.
  useEffect(() => {
    if (!playing) return
    if (isLast) {
      setPlaying(false)
      return
    }
    timer.current = setTimeout(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS[step])
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [playing, step, isLast])

  const restart = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    setStep(0)
    setRunKey((k) => k + 1)
    setPlaying(true)
  }, [])

  const goTo = useCallback((i: number) => {
    if (timer.current) clearTimeout(timer.current)
    setStep(i)
    setPlaying(false)
  }, [])

  return (
    <div className="flex h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-accent/20 bg-surface/60 px-4 py-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="glow-accent flex h-7 w-7 items-center justify-center rounded-lg border border-accent/60 bg-accent/10 font-mono text-xs font-bold text-accent" aria-hidden="true">
            AI
          </div>
          <h1 className="text-glow-accent font-mono text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Demo<span className="text-secondary text-glow-secondary">//</span>Playback
          </h1>
        </div>
        <AppNav />
      </header>

      {/* Controls + stepper */}
      <div className="border-b border-border/60 bg-surface/30 px-4 py-3">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (isLast ? restart() : setPlaying((p) => !p))}
              className="glow-accent flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-accent-foreground transition-opacity hover:opacity-90"
            >
              {isLast ? <RestartIcon /> : playing ? <PauseIcon /> : <PlayIcon />}
              {isLast ? "Replay" : playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={restart}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <RestartIcon />
              Restart
            </button>
            <span className="ml-auto font-mono text-xs text-muted">
              Step {step + 1} / {STEPS.length}
            </span>
          </div>

          {/* Stepper */}
          <ol className="grid grid-cols-4 gap-2">
            {STEPS.map((s, i) => {
              const state = i < step ? "done" : i === step ? "active" : "todo"
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    className="group flex w-full flex-col gap-1.5 text-left"
                  >
                    <span
                      className={`h-1 w-full rounded-full transition-colors ${
                        state === "done"
                          ? "bg-accent/60"
                          : state === "active"
                            ? "bg-accent shadow-[0_0_8px_theme(colors.accent)]"
                            : "bg-border"
                      }`}
                    />
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider transition-colors ${
                        state === "todo" ? "text-muted" : "text-accent"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")} · {s.title}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      {/* Stage */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-6">
          <div key={`${runKey}-${step}`} className="animate-[fadeIn_.4s_ease]">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-secondary">{STEPS[step].eyebrow}</p>
            <h2 className="mt-1 text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {STEPS[step].title}
            </h2>

            <div className="mt-5">
              {step === 0 && <RawStep />}
              {step === 1 && <IngestStep key={`ingest-${runKey}`} />}
              {step === 2 && <DetectStep />}
              {step === 3 && <InvestigateStep key={`inv-${runKey}`} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Step 0 — raw logs
 * ------------------------------------------------------------------ */

function RawStep() {
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted">
        A production incident spans <span className="text-foreground">four different log sources</span> across
        Kubernetes and AWS. The signal — a single KMS permission change — is buried in noise, warnings, and red
        herrings a human would have to read line by line.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LOG_SOURCES.map((src) => (
          <div key={src.id} className="rounded-2xl border border-border bg-surface/60 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-accent/40 bg-accent/5 text-accent">
                <SourceIcon source={src.source} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-mono text-xs font-semibold text-foreground">{src.label}</p>
                <p className="truncate font-mono text-[10px] text-muted">{src.meta}</p>
              </div>
              <span className="ml-auto rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted">
                {src.source}
              </span>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5">
              {src.lines.map((ln, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${SEV_DOT[ln.sev]}`} aria-hidden="true" />
                  <span className="font-mono text-[11px] leading-snug text-muted">{ln.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Step 1 — ingest / chunk / embed
 * ------------------------------------------------------------------ */

function IngestStep() {
  const [done, setDone] = useState(0)

  useEffect(() => {
    const timers = LOG_SOURCES.map((_, i) => setTimeout(() => setDone((d) => Math.max(d, i + 1)), 500 + i * 700))
    return () => timers.forEach(clearTimeout)
  }, [])

  const chunksSoFar = LOG_SOURCES.slice(0, done).reduce((n, s) => n + s.chunks, 0)

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted">
        Each source is POSTed to <code className="font-mono text-accent">/api/ingest</code>, split into semantic
        chunks, embedded into <span className="text-foreground">1536-dim vectors</span>, and stored in Neon
        (pgvector) — ready for semantic search.
      </p>

      <div className="flex flex-col gap-2">
        {LOG_SOURCES.map((src, i) => {
          const ok = i < done
          return (
            <div
              key={src.id}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                ok ? "border-accent/50 bg-accent/5" : "border-border bg-surface/40"
              }`}
            >
              <span className={`flex h-7 w-7 items-center justify-center rounded-lg border ${ok ? "border-accent/50 text-accent glow-accent" : "border-border text-muted"}`}>
                <SourceIcon source={src.source} />
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{src.label}</span>
              {ok ? (
                <span className="font-mono text-[11px] text-accent">→ {src.chunks} chunks embedded ✓</span>
              ) : (
                <span className="font-mono text-[11px] text-muted">queued…</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-secondary/30 bg-secondary/5 px-4 py-3">
        <span className="font-mono text-xs uppercase tracking-wider text-secondary">Vector store</span>
        <span className="font-mono text-sm text-foreground">
          <span className="text-secondary text-glow-secondary">{chunksSoFar}</span> / {TOTAL_CHUNKS} chunks in{" "}
          <code className="text-secondary">log_chunks</code>
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Step 2 — detected incident
 * ------------------------------------------------------------------ */

function DetectStep() {
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted">
        A parallel detector scans the freshly-stored chunks, clusters the errors by service, and — with one LLM call
        — writes a titled incident. No query needed; it just appears on the dashboard.
      </p>

      <div className="animate-float-y rounded-2xl border border-secondary/50 bg-secondary/5 p-5 shadow-[0_0_28px_-8px_theme(colors.secondary)]">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/50 bg-secondary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-secondary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-secondary shadow-[0_0_8px_theme(colors.secondary)]" aria-hidden="true" />
            Critical
          </span>
          <span className="font-mono text-[11px] text-muted">just now</span>
        </div>
        <h3 className="mt-3 text-pretty text-base font-semibold text-foreground">
          orders-api pods crash-looping on KMS decrypt denial
        </h3>
        <p className="mt-1 text-pretty text-sm leading-relaxed text-muted">
          New orders-api pods in prod fail at startup with a KMS AccessDenied on kms:Decrypt, blocking DB secret
          resolution and causing CrashLoopBackOff since ~02:14 UTC.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md border border-alert/30 bg-alert/5 px-1.5 py-0.5 font-mono text-[10px] text-alert">11 errors</span>
          {["service: orders-api", "env: prod", "src: k8s", "src: aws"].map((t) => (
            <span key={t} className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Step 3 — AI investigation
 * ------------------------------------------------------------------ */

function InvestigateStep() {
  // phases: 0 question, 1 searching, 2 answer
  const [phase, setPhase] = useState(0)
  const [searchDone, setSearchDone] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 700)
    const searchTimers = SEARCHES.map((_, i) => setTimeout(() => setSearchDone((d) => Math.max(d, i + 1)), 1200 + i * 700))
    const t2 = setTimeout(() => setPhase(2), 1200 + SEARCHES.length * 700 + 400)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      searchTimers.forEach(clearTimeout)
    }
  }, [])

  const totalHits = SEARCHES.slice(0, searchDone).reduce((n, s) => n + s.hits, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* User question */}
      <div className="flex justify-end">
        <div className="glow-accent max-w-[80%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-accent-foreground">
          What&apos;s the root cause of the orders-api CrashLoopBackOff — and what can we rule out?
        </div>
      </div>

      {/* Agent */}
      <div className="flex gap-3">
        <div className="glow-secondary mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-secondary/60 bg-secondary/10 font-mono text-sm font-semibold text-secondary" aria-hidden="true">
          AI
        </div>
        <div className="min-w-0 flex-1">
          {/* Search activity */}
          {phase >= 1 && (
            <div className="mb-3 flex flex-col gap-1.5">
              {SEARCHES.map((s, i) => {
                const ok = i < searchDone
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-all ${
                      ok ? "border-border bg-surface/60" : "border-dashed border-border/60 bg-transparent opacity-60"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-accent shadow-[0_0_6px_theme(colors.accent)]" : "animate-pulse bg-muted"}`} aria-hidden="true" />
                    <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted">
                      searchLogs(&quot;{s.q}&quot;)
                    </code>
                    <span className="font-mono text-[10px] uppercase text-muted">{s.src}</span>
                    {ok && <span className="font-mono text-[10px] text-accent">{s.hits} hits</span>}
                  </div>
                )
              })}
            </div>
          )}

          {/* Evidence trail */}
          {phase >= 2 && (
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/5 px-1.5 py-0.5 font-mono text-xs text-accent">
                Retrieved {totalHits} chunks via RAG
              </span>
              <span className="rounded-md border border-secondary/30 bg-secondary/5 px-1.5 py-0.5 font-mono text-xs text-secondary">k8s</span>
              <span className="rounded-md border border-secondary/30 bg-secondary/5 px-1.5 py-0.5 font-mono text-xs text-secondary">aws</span>
            </div>
          )}

          {/* Diagnosis */}
          {phase < 2 ? (
            <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border/60 bg-surface-2 px-4 py-3">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
            </div>
          ) : (
            <div className="animate-[fadeIn_.4s_ease] rounded-2xl rounded-bl-md border border-border/60 bg-surface-2 px-4 py-3 text-foreground">
              <Markdown content={DIAGNOSIS} />
            </div>
          )}

          {/* CTA */}
          {phase >= 2 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
              <p className="text-sm text-foreground">Want to try it on the real data?</p>
              <Link
                href="/"
                className="glow-accent ml-auto rounded-lg bg-accent px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-accent-foreground transition-opacity hover:opacity-90"
              >
                Open the live chat
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
