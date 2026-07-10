import type { UIMessage } from "ai"
import { Markdown } from "./markdown"

function textFromMessage(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
}

const TOOL_LABELS: Record<string, string> = {
  "tool-listLogFiles": "Listing available logs…",
  "tool-readLogFile": "Reading log file…",
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

// Collect the log files the assistant actually read, in order, de-duplicated.
function inspectedLogs(message: UIMessage): string[] {
  const files: string[] = []
  for (const part of message.parts) {
    if (
      part.type === "tool-readLogFile" &&
      "input" in part &&
      part.input &&
      typeof (part.input as { fileName?: unknown }).fileName === "string"
    ) {
      const name = (part.input as { fileName: string }).fileName
      if (!files.includes(name)) files.push(name)
    }
  }
  return files
}

function FileIcon() {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}

function EvidenceTrail({ files }: { files: string[] }) {
  if (files.length === 0) return null
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted">Evidence from</span>
      {files.map((file) => (
        <span
          key={file}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-muted"
        >
          <FileIcon />
          {file}
        </span>
      ))}
    </div>
  )
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user"
  const text = textFromMessage(message)
  const activity = toolActivity(message)
  const logs = isUser ? [] : inspectedLogs(message)

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
        <EvidenceTrail files={logs} />
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
