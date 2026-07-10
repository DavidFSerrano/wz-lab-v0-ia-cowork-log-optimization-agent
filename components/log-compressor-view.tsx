"use client"

import { useCallback, useState } from "react"
import { AppNav } from "./app-nav"

// ─── Sample log ───────────────────────────────────────────────────────────────

const SAMPLE_LOGS = `2024-05-12T02:40:20.112Z INFO  [startup] orders-api v2.8.4 starting (profile=prod)
2024-05-12T02:40:20.198Z INFO  [config] loading env from configmap orders-api-config
2024-05-12T02:40:20.201Z INFO  [config] assumed role orders-api-irsa (AssumeRoleWithWebIdentity ok)
10.0.1.47 - - [12/May/2024:02:40:20 +0000] "GET /healthz HTTP/1.1" 200 2 "-" "kube-probe/1.28"
10.0.1.47 - - [12/May/2024:02:40:22 +0000] "GET /readyz HTTP/1.1" 200 2 "-" "kube-probe/1.28"
2024-05-12T02:40:21.004Z WARN  [db] pool warm-up attempt 1 timed out after 2000ms
2024-05-12T02:40:23.009Z WARN  [db] pool warm-up attempt 2 timed out after 2000ms
2024-05-12T02:40:25.014Z WARN  [db] pool warm-up attempt 3 timed out after 2000ms
2024-05-12T02:40:27.020Z WARN  [db] pool warm-up attempt 4 timed out after 2000ms
2024-05-12T02:40:38.441Z ERROR [secrets] KmsException: not authorized to perform kms:Decrypt on key/4a1e9c33 (AccessDeniedException)
	at software.amazon.awssdk.services.kms.DefaultKmsClient.decrypt(DefaultKmsClient.java:244)
	at com.example.orders.secrets.SecretManager.fetchCredentials(SecretManager.java:88)
	at com.example.orders.startup.DataSourceInitializer.init(DataSourceInitializer.java:52)
	at com.example.orders.startup.DataSourceInitializer.init(DataSourceInitializer.java:45)
	at com.example.orders.startup.DataSourceInitializer.init(DataSourceInitializer.java:38)
	at com.example.orders.startup.DataSourceInitializer.init(DataSourceInitializer.java:31)
	at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
2024-05-12T02:40:38.442Z ERROR [startup] fatal: datasource initialization failed (no usable DB credentials)
2024-05-12T02:40:38.443Z INFO  [jvm] JVM shutdown hook triggered
10.0.1.47 - - [12/May/2024:02:40:40 +0000] "GET /healthz HTTP/1.1" 200 2 "-" "kube-probe/1.28"
10.0.1.47 - - [12/May/2024:02:40:42 +0000] "GET /readyz HTTP/1.1" 200 2 "-" "kube-probe/1.28"
10.0.1.47 - - [12/May/2024:02:40:44 +0000] "GET /livez HTTP/1.1" 200 2 "-" "ELB-HealthChecker/2.0"
2024-05-12T02:40:50.100Z ERROR [secrets] KmsException: not authorized to perform kms:Decrypt on key/4a1e9c33 (AccessDeniedException)
	at software.amazon.awssdk.services.kms.DefaultKmsClient.decrypt(DefaultKmsClient.java:244)
	at com.example.orders.secrets.SecretManager.fetchCredentials(SecretManager.java:88)
	at com.example.orders.startup.DataSourceInitializer.init(DataSourceInitializer.java:52)
2024-05-12T02:40:50.101Z ERROR [startup] fatal: datasource initialization failed (no usable DB credentials)
2024-05-12T02:40:50.102Z INFO  [jvm] JVM shutdown hook triggered`

// ─── Icons ────────────────────────────────────────────────────────────────────

function CompressIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
      <line x1="9" y1="15" x2="15" y2="9" />
      <polyline points="9 9 9 15 15 15" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// ─── Metric card ──────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  highlight = false,
  accent = false,
}: {
  label: string
  value: string
  highlight?: boolean
  accent?: boolean
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-xl border px-4 py-3 ${
        highlight
          ? "border-secondary/40 bg-secondary/5"
          : accent
            ? "border-accent/30 bg-accent/5"
            : "border-border bg-surface/60"
      }`}
    >
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <span
        className={`font-mono text-lg font-semibold leading-none ${
          highlight ? "text-secondary text-glow-secondary" : accent ? "text-accent text-glow-accent" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type CompressResult = {
  compressed: string
  originalChars: number
  compressedChars: number
  reductionPct: number
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LogCompressorView() {
  const [input, setInput] = useState(SAMPLE_LOGS)
  const [result, setResult] = useState<CompressResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCompress = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/compress", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: trimmed,
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Unexpected error")
      } else {
        setResult(data as CompressResult)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    } finally {
      setLoading(false)
    }
  }, [input])

  const handleCopy = useCallback(async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.compressed)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }, [result])

  // Estimated token savings (rough: 4 chars ≈ 1 token for English/log text).
  const tokensSaved =
    result ? Math.round((result.originalChars - result.compressedChars) / 4) : null

  return (
    <div className="flex h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-accent/20 bg-surface/60 px-4 py-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="glow-accent flex h-7 w-7 items-center justify-center rounded-lg border border-accent/60 bg-accent/10 font-mono text-xs font-bold text-accent"
            aria-hidden="true"
          >
            CZ
          </div>
          <h1 className="text-glow-accent font-mono text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            Log<span className="text-secondary text-glow-secondary">//</span>Compressor
          </h1>
        </div>
        <AppNav />
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          {/* Page intro */}
          <div className="mb-6">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-secondary">Pre-processing</p>
            <h2 className="mt-1 text-balance text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              EKS Log Compressor
            </h2>
            <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-muted">
              Paste raw EKS / Kubernetes log lines below. The compressor strips health-check noise,
              deduplicates consecutive identical messages, truncates stack traces, and emits a compact{" "}
              <code className="font-mono text-accent">[TIME|LEVEL|COMP] MSG</code> format — reducing token
              usage before logs are sent to the LLM.
            </p>
          </div>

          {/* Two-column editor layout */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Input panel */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-muted">Raw input</span>
                <div className="flex items-center gap-2">
                  {input && (
                    <span className="font-mono text-[10px] text-muted">
                      {input.length.toLocaleString()} chars
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setInput(""); setResult(null); setError(null) }}
                    className="flex items-center gap-1 rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted transition-colors hover:border-secondary hover:text-secondary"
                  >
                    <ClearIcon />
                    Clear
                  </button>
                </div>
              </div>
              <textarea
                value={input}
                onChange={(e) => { setInput(e.target.value); setResult(null); setError(null) }}
                spellCheck={false}
                placeholder="Paste EKS / Kubernetes log lines here…"
                className="h-[420px] w-full resize-none rounded-2xl border border-border bg-surface/60 p-4 font-mono text-[11px] leading-relaxed text-foreground placeholder:text-muted focus:border-accent/60 focus:outline-none"
                aria-label="Raw EKS log input"
              />
            </div>

            {/* Output panel */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-muted">
                  Compressed output
                </span>
                {result && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                      copied
                        ? "border-accent/60 text-accent"
                        : "border-border text-muted hover:border-accent hover:text-accent"
                    }`}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                )}
              </div>

              <div
                className={`relative h-[420px] rounded-2xl border bg-surface/60 p-4 ${
                  result
                    ? "border-accent/30"
                    : error
                      ? "border-secondary/40"
                      : "border-border"
                }`}
              >
                {loading && (
                  <div className="flex h-full items-center justify-center gap-2">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
                  </div>
                )}

                {!loading && error && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <span className="font-mono text-xs text-secondary">{error}</span>
                  </div>
                )}

                {!loading && !error && !result && (
                  <div className="flex h-full items-center justify-center">
                    <p className="font-mono text-xs text-muted">
                      Press <span className="text-accent">Compress</span> to see the output
                    </p>
                  </div>
                )}

                {!loading && result && (
                  <pre className="h-full overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground">
                    {result.compressed}
                  </pre>
                )}
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleCompress}
              disabled={loading || !input.trim()}
              className="glow-accent flex items-center gap-2 rounded-lg bg-accent px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <CompressIcon />
              {loading ? "Compressing…" : "Compress"}
            </button>
            {result && (
              <span className="font-mono text-[11px] text-muted">
                {result.reductionPct}% reduction &middot; ~{tokensSaved?.toLocaleString()} tokens saved
              </span>
            )}
          </div>

          {/* Metrics bar */}
          {result && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard
                label="Original"
                value={`${result.originalChars.toLocaleString()} ch`}
              />
              <MetricCard
                label="Compressed"
                value={`${result.compressedChars.toLocaleString()} ch`}
                accent
              />
              <MetricCard
                label="Reduction"
                value={`${result.reductionPct}%`}
                highlight
              />
              <MetricCard
                label="Tokens saved (est.)"
                value={`~${tokensSaved?.toLocaleString()}`}
                accent
              />
            </div>
          )}

          {/* How it works */}
          <section className="mt-8 rounded-2xl border border-border bg-surface/40 p-5" aria-label="How compression works">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-accent">How it works</h3>
            <ol className="mt-3 flex flex-col gap-2">
              {[
                ["Parse", "Each line is parsed as plain text or JSON (Fluent Bit / CloudWatch format). Timestamps, log levels, and component names are extracted."],
                ["Filter noise", "Health-check lines (/healthz, /readyz, /livez, kube-probe, ELB-HealthChecker) are discarded entirely — they carry no diagnostic signal."],
                ["Deduplicate", "Consecutive identical messages are collapsed into a single line with a repeat counter, e.g. [x4]."],
                ["Truncate stacks", `Stack traces are capped at ${3} frames. Remaining frames are replaced with a [...N more lines truncated] summary.`],
                ["Minify format", "Each entry is emitted as a compact [HH:MM:SSZ|LEVEL|component] message single line, removing redundant tokens."],
              ].map(([title, desc], i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/5 font-mono text-[10px] text-accent">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-muted">
                    <span className="font-semibold text-foreground">{title} — </span>
                    {desc}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  )
}
