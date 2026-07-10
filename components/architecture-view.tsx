"use client"

import Link from "next/link"
import type { ReactNode } from "react"

/* ---------------------------------- Icons --------------------------------- */

type IconProps = { className?: string }
const iconBase = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
}

function SourcesIcon({ className }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M4 7V5a1 1 0 0 1 1-1h4l2 2h7a1 1 0 0 1 1 1v2" />
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      <path d="M7 13h4M7 16h7" />
    </svg>
  )
}
function IngestIcon({ className }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M12 3v10" />
      <path d="m8 9 4 4 4-4" />
      <path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" />
    </svg>
  )
}
function ChunkIcon({ className }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <rect x="3" y="10" width="11" height="4" rx="1" />
      <rect x="3" y="16" width="15" height="4" rx="1" />
    </svg>
  )
}
function EmbedIcon({ className }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
      <path d="M9 9h6v6H9z" />
    </svg>
  )
}
function DatabaseIcon({ className }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  )
}
function SearchIcon({ className }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}
function AgentIcon({ className }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <rect x="5" y="7" width="14" height="12" rx="2" />
      <path d="M12 7V4M9 4h6" />
      <circle cx="9.5" cy="13" r="1" />
      <circle cx="14.5" cy="13" r="1" />
      <path d="M2 12v3M22 12v3" />
    </svg>
  )
}
function DiagnosisIcon({ className }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M9 11l3 3 5-6" />
      <path d="M20 12a8 8 0 1 1-5.3-7.5" />
    </svg>
  )
}
function AlertIcon({ className }: IconProps) {
  return (
    <svg {...iconBase} className={className}>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.3 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.3a2 2 0 0 0-3.4 0Z" />
    </svg>
  )
}

/* --------------------------------- Layout -------------------------------- */

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-accent text-glow-accent">{eyebrow}</span>
        <h2 className="text-pretty text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
      </div>
      {children}
    </section>
  )
}

type Accent = "accent" | "secondary" | "alert"

const ACCENT_RING: Record<Accent, string> = {
  accent: "border-accent/40 text-accent",
  secondary: "border-secondary/40 text-secondary",
  alert: "border-alert/40 text-alert",
}
const ACCENT_GLOW: Record<Accent, string> = {
  accent: "glow-accent",
  secondary: "glow-secondary",
  alert: "",
}

function StageCard({
  index,
  icon,
  title,
  code,
  children,
  accent = "accent",
}: {
  index: number
  icon: ReactNode
  title: string
  code?: string
  children: ReactNode
  accent?: Accent
}) {
  return (
    <div className="relative min-w-0 flex-1 rounded-2xl border border-border bg-surface/70 p-4 backdrop-blur-sm transition-all hover:border-accent/50 hover:shadow-[0_0_24px_-10px_theme(colors.accent)]">
      <span className="absolute -top-2.5 left-4 rounded-md border border-border bg-background px-1.5 font-mono text-[10px] font-semibold text-muted">
        {String(index).padStart(2, "0")}
      </span>
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background/60 ${ACCENT_RING[accent]} ${ACCENT_GLOW[accent]}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {code ? <p className="truncate font-mono text-[11px] text-muted">{code}</p> : null}
        </div>
      </div>
      <div className="mt-3 text-sm leading-relaxed text-muted">{children}</div>
    </div>
  )
}

// Connector: animated flowing dashes. Horizontal on lg, vertical on mobile.
function Flow({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">{children}</div>
}

function FlowArrow({ accent = "accent" }: { accent?: Accent }) {
  const stroke = accent === "secondary" ? "#ff2e97" : accent === "alert" ? "#ffb300" : "#00e5ff"
  return (
    <div className="flex shrink-0 items-center justify-center self-center text-muted" aria-hidden="true">
      {/* vertical (mobile) */}
      <svg width="20" height="34" viewBox="0 0 20 34" className="lg:hidden">
        <line x1="10" y1="2" x2="10" y2="26" stroke={stroke} className="animate-dash-flow" />
        <path d="M4 24l6 8 6-8" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* horizontal (desktop) */}
      <svg width="40" height="20" viewBox="0 0 40 20" className="hidden lg:block">
        <line x1="2" y1="10" x2="32" y2="10" stroke={stroke} className="animate-dash-flow" />
        <path d="M30 4l8 6-8 6" fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/* ------------------------------ Mini visuals ------------------------------ */

// Deterministic bar heights so SSR and client render identically.
const VECTOR_BARS = [
  60, 32, 88, 45, 72, 20, 95, 54, 38, 67, 81, 29, 76, 48, 90, 35, 62, 25, 84, 51, 70, 42, 58, 33,
]

function VectorViz() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/70 p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted">chunk text</span>
        <span className="font-mono text-xs text-accent">1536-dim vector</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="max-w-[42%] rounded-lg border border-border bg-background/60 px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground">
          {'"CrashLoopBackOff'}
          <br />
          {'exit code 137…"'}
        </div>
        <div className="text-accent" aria-hidden="true">
          <svg width="34" height="18" viewBox="0 0 34 18">
            <line x1="0" y1="9" x2="26" y2="9" stroke="#00e5ff" className="animate-dash-flow" />
            <path d="M24 3l8 6-8 6" fill="none" stroke="#00e5ff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex h-16 flex-1 items-end gap-[3px]" aria-hidden="true">
          {VECTOR_BARS.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-gradient-to-t from-accent/30 to-accent"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      <p className="font-mono text-[11px] text-muted">
        <span className="text-accent">[</span>0.021, -0.114, 0.087, 0.402, …, -0.056
        <span className="text-accent">]</span>
      </p>
    </div>
  )
}

function CosineViz() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/70 p-5">
      <div className="flex items-center gap-2 font-mono text-xs text-muted">
        <span className="rounded border border-secondary/40 px-1.5 py-0.5 text-secondary">query vector</span>
        <span className="text-accent">{"embedding <=> query"}</span>
        <span className="rounded border border-accent/40 px-1.5 py-0.5 text-accent">stored vectors</span>
      </div>
      <ul className="flex flex-col gap-2">
        {[
          { label: "kms:Decrypt AccessDenied on orders-api role", dist: 0.08 },
          { label: "pod OOMKilled, exit code 137", dist: 0.31 },
          { label: "HPA scaled replicas 3 → 6", dist: 0.62 },
          { label: "nginx access log 200 OK", dist: 0.89 },
        ].map((r) => {
          const relevance = Math.round((1 - r.dist) * 100)
          return (
            <li key={r.label} className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent/40 to-accent"
                  style={{ width: `${relevance}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-accent">
                {relevance}%
              </span>
              <span className="hidden min-w-0 flex-[2] truncate font-mono text-[11px] text-muted sm:block">
                {r.label}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted">
        Cosine distance ranks every stored chunk against the query. The nearest neighbours (highest relevance) become
        the evidence the model reasons over.
      </p>
    </div>
  )
}

function ChunkViz() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-surface/70 p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-accent">Text logs → ~700-char windows</p>
        <div className="flex flex-col gap-1.5 font-mono text-[11px] text-muted">
          <div className="rounded border border-accent/30 bg-accent/5 px-2 py-1.5 text-foreground">
            block A + block B <span className="text-accent">(packed until ≤700)</span>
          </div>
          <div className="rounded border border-accent/30 bg-accent/5 px-2 py-1.5 text-foreground">
            block C + block D
          </div>
          <div className="rounded border border-border px-2 py-1.5">block E …</div>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-surface/70 p-5">
        <p className="mb-2 font-mono text-xs uppercase tracking-wider text-secondary">JSON (CloudTrail) → 1 chunk / record</p>
        <div className="flex flex-col gap-1.5 font-mono text-[11px] text-muted">
          <div className="rounded border border-secondary/30 bg-secondary/5 px-2 py-1.5 text-foreground">
            {"{ Records[0] }"} → chunk
          </div>
          <div className="rounded border border-secondary/30 bg-secondary/5 px-2 py-1.5 text-foreground">
            {"{ Records[1] }"} → chunk
          </div>
          <div className="rounded border border-secondary/30 bg-secondary/5 px-2 py-1.5 text-foreground">
            {"{ Records[2] }"} → chunk
          </div>
        </div>
      </div>
    </div>
  )
}

function Chip({ children, accent = "accent" }: { children: ReactNode; accent?: Accent }) {
  const cls =
    accent === "secondary"
      ? "border-secondary/40 bg-secondary/5 text-secondary"
      : accent === "alert"
        ? "border-alert/40 bg-alert/5 text-alert"
        : "border-accent/40 bg-accent/5 text-accent"
  return <span className={`rounded-md border px-2.5 py-1 font-mono text-xs ${cls}`}>{children}</span>
}

/* --------------------------------- Header -------------------------------- */

function NavTabs() {
  return (
    <nav className="flex items-center gap-1.5" aria-label="Primary">
      <Link
        href="/"
        className="rounded-lg border border-border px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
      >
        Chat
      </Link>
      <Link
        href="/logs"
        className="rounded-lg border border-border px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
      >
        Live logs
      </Link>
      <span
        aria-current="page"
        className="rounded-lg border border-accent/60 bg-accent/10 px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-accent"
      >
        Architecture
      </span>
    </nav>
  )
}

/* ---------------------------------- View --------------------------------- */

export function ArchitectureView() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-accent/20 bg-surface/60 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="glow-accent flex h-7 w-7 items-center justify-center rounded-lg border border-accent/60 bg-accent/10 font-mono text-xs font-bold text-accent" aria-hidden="true">
            AI
          </div>
          <h1 className="hidden text-glow-accent font-mono text-sm font-semibold uppercase tracking-[0.2em] text-accent sm:block">
            RAG<span className="text-secondary text-glow-secondary">//</span>Architecture
          </h1>
        </div>
        <NavTabs />
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-14 px-4 py-10">
          {/* Intro */}
          <div className="flex flex-col gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-secondary text-glow-secondary">
              How it works
            </span>
            <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              A retrieval-augmented pipeline for log troubleshooting
            </h2>
            <p className="max-w-2xl text-pretty leading-relaxed text-muted">
              Raw logs from Kubernetes and AWS are chunked, embedded into vectors, and stored in Postgres. When you
              ask a question, an SRE agent semantically searches that vector store, correlates evidence across
              systems, and produces a root-cause diagnosis. Two independent flows power the system: an{" "}
              <span className="text-accent">ingestion (write) path</span> and a{" "}
              <span className="text-secondary">retrieval (read) path</span>.
            </p>
          </div>

          {/* Ingestion pipeline */}
          <Section eyebrow="Write path" title="Ingestion pipeline">
            <Flow>
              <StageCard index={1} icon={<SourcesIcon />} title="Log sources" code="k8s · aws · web">
                Anything can POST logs — raw text, NDJSON, JSON arrays, or CloudTrail records.
              </StageCard>
              <FlowArrow />
              <StageCard index={2} icon={<IngestIcon />} title="Ingest endpoint" code="POST /api/ingest">
                Auto-detects the payload shape and normalizes metadata (source, service, environment).
              </StageCard>
              <FlowArrow />
              <StageCard index={3} icon={<ChunkIcon />} title="Chunk" code="chunkDocument()">
                Splits logs into semantic chunks and tags each with a timestamp and severity.
              </StageCard>
              <FlowArrow />
              <StageCard index={4} icon={<EmbedIcon />} title="Embed" code="text-embedding-3-small">
                Batches chunks through <span className="text-accent">embedMany</span> into 1536-dim vectors.
              </StageCard>
              <FlowArrow />
              <StageCard index={5} icon={<DatabaseIcon />} title="Store" code="Neon · pgvector">
                Persists chunk + vector + metadata into the <span className="font-mono">log_chunks</span> table.
              </StageCard>
            </Flow>
          </Section>

          {/* Chunking */}
          <Section eyebrow="Step 3 detail" title="Chunking strategy">
            <p className="max-w-2xl text-pretty leading-relaxed text-muted">
              A wall of log text is useless to search as one blob, so it&apos;s broken into right-sized pieces. The
              chunker also scans each chunk for an ISO timestamp and keyword-classifies its severity into{" "}
              <span className="text-secondary">error</span> / <span className="text-alert">warn</span> /{" "}
              <span className="text-accent">info</span>.
            </p>
            <ChunkViz />
          </Section>

          {/* Embeddings */}
          <Section eyebrow="Step 4 detail" title="Embeddings">
            <p className="max-w-2xl text-pretty leading-relaxed text-muted">
              Each chunk is converted into a list of 1536 numbers that captures its meaning. Text with similar meaning
              lands close together in vector space — which is what makes semantic (not keyword) search possible.
            </p>
            <VectorViz />
          </Section>

          {/* Vector DB */}
          <Section eyebrow="The store" title="Vector database (Neon + pgvector)">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface/70 p-5">
                <p className="mb-3 font-mono text-xs uppercase tracking-wider text-accent">log_chunks schema</p>
                <pre className="overflow-x-auto rounded-lg bg-background/70 p-3 font-mono text-[11px] leading-relaxed text-muted">
{`id          bigserial
source      text          -- k8s | aws | web
service     text
environment text
severity    text          -- error|warn|info
event_time  timestamptz
content     text          -- the chunk
embedding   vector(1536)  -- pgvector`}
                </pre>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-pretty leading-relaxed text-muted">
                  Vectors live right next to their metadata in Postgres. Retrieval is a{" "}
                  <span className="text-accent">hybrid query</span>: optional SQL filters (source, service, time
                  window) combined with vector similarity ordering — all in a single statement.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip>{"embedding <=> query"}</Chip>
                  <Chip accent="secondary">cosine distance</Chip>
                  <Chip>ORDER BY distance</Chip>
                  <Chip accent="alert">LIMIT k (≤20)</Chip>
                </div>
              </div>
            </div>
          </Section>

          {/* Retrieval / RAG */}
          <Section eyebrow="Read path" title="Retrieval & the RAG agent">
            <Flow>
              <StageCard index={1} icon={<SearchIcon />} title="Your question" accent="secondary" code="/api/chat">
                A troubleshooting question, optionally scoped to a detected incident.
              </StageCard>
              <FlowArrow accent="secondary" />
              <StageCard index={2} icon={<AgentIcon />} title="SRE agent" accent="secondary" code="gpt-5.1-instant">
                A tool-loop agent that decides to search — usually several times per turn.
              </StageCard>
              <FlowArrow accent="secondary" />
              <StageCard index={3} icon={<DatabaseIcon />} title="searchLogs" accent="secondary" code="embed + vector search">
                Embeds each query and runs a similarity search with metadata/time filters.
              </StageCard>
              <FlowArrow accent="secondary" />
              <StageCard index={4} icon={<DiagnosisIcon />} title="Diagnosis" accent="secondary" code="correlated answer">
                Correlates evidence by timestamp into a summary, timeline, root cause & fix.
              </StageCard>
            </Flow>
            <CosineViz />
          </Section>

          {/* Incident detection (parallel) */}
          <Section eyebrow="Parallel layer" title="Automatic incident detection">
            <div className="rounded-2xl border border-alert/30 bg-alert/5 p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-alert/50 bg-background/60 text-alert">
                  <AlertIcon />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-pretty leading-relaxed text-muted">
                    Running alongside ingestion (and never touching the RAG pipeline), a detector reads freshly stored
                    chunks, clusters recent <span className="text-secondary">error</span>/<span className="text-alert">warn</span>{" "}
                    activity by service + environment, and opens an incident when a cluster crosses a threshold. Each{" "}
                    <span className="text-foreground">new</span> incident gets a single LLM call for a human title and
                    summary; the dashboard then lists them as live cards.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Chip accent="alert">reads log_chunks</Chip>
                    <Chip accent="alert">writes incidents</Chip>
                    <Chip accent="alert">cluster + threshold</Chip>
                    <Chip accent="alert">1 LLM call / new incident</Chip>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Stack */}
          <Section eyebrow="Under the hood" title="Tech stack">
            <div className="flex flex-wrap gap-2">
              <Chip>Next.js App Router</Chip>
              <Chip>AI SDK</Chip>
              <Chip accent="secondary">openai/gpt-5.1-instant</Chip>
              <Chip accent="secondary">text-embedding-3-small</Chip>
              <Chip>Neon Postgres</Chip>
              <Chip>pgvector</Chip>
              <Chip accent="alert">SWR live polling</Chip>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
