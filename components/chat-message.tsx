import type { UIMessage } from "ai"
import { Markdown } from "./markdown"

function textFromMessage(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
}

const TOOL_LABELS: Record<string, string> = {
  "tool-searchLogs": "Searching the log vector store…",
}

function toolActivity(message: UIMessage): string | null {
  const active = message.parts.find(
    (part) =>
      part.type.startsWith("tool-") &&
      "state" in part &&
      part.state !== "output-available" &&
      part.state !== "output-error",
  )
  return active ? TOOL_LABELS[active.type] ?? "Inspecting logs…" : null
}

const SOURCE_LABELS: Record<string, string> = {
  k8s: "Kubernetes",
  aws: "AWS",
  web: "Web",
}

type RetrievalEvidence = { chunks: number; sources: string[] }

// Summarize what the assistant retrieved from the vector store: how many
// chunks and from which source systems.
function retrievalEvidence(message: UIMessage): RetrievalEvidence {
  let chunks = 0
  const sources = new Set<string>()
  for (const part of message.parts) {
    if (part.type === "tool-searchLogs" && "output" in part && part.output) {
      const output = part.output as {
        results?: { source?: string }[]
      }
      if (Array.isArray(output.results)) {
        chunks += output.results.length
        for (const r of output.results) {
          if (r.source) sources.add(r.source)
        }
      }
    }
  }
  return { chunks, sources: [...sources] }
}

function DatabaseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  )
}

function EvidenceTrail({ evidence }: { evidence: RetrievalEvidence }) {
  if (evidence.chunks === 0) return null
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-0.5 text-xs text-muted">
        <DatabaseIcon />
        Retrieved {evidence.chunks} log {evidence.chunks === 1 ? "chunk" : "chunks"} via RAG
      </span>
      {evidence.sources.map((s) => (
        <span
          key={s}
          className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-muted"
        >
          {SOURCE_LABELS[s] ?? s}
        </span>
      ))}
    </div>
  )
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user"
  const text = textFromMessage(message)
  const activity = toolActivity(message)
  const evidence = isUser ? { chunks: 0, sources: [] } : retrievalEvidence(message)

  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm leading-relaxed text-accent-foreground">
          {text}
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full gap-3 justify-start">
      <div
        aria-hidden="true"
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
      >
        AI
      </div>
      <div className="min-w-0 max-w-[80%]">
        <EvidenceTrail evidence={evidence} />
        <div className="rounded-2xl rounded-bl-md bg-surface-2 px-4 py-3 text-foreground">
          {text ? (
            <Markdown content={text} />
          ) : activity ? (
            <span className="flex items-center gap-2 text-sm text-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              {activity}
            </span>
          ) : (
            <span className="text-sm text-muted">…</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex w-full items-center gap-3">
      <div
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
      >
        AI
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-surface-2 px-4 py-3">
        <span className="sr-only">Assistant is typing</span>
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
      </div>
    </div>
  )
}
