import type { UIMessage } from "ai"

function textFromMessage(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
}

export function ChatMessage({ message }: { message: UIMessage }) {
  const isUser = message.role === "user"
  const text = textFromMessage(message)

  return (
    <div className={`flex w-full gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div
          aria-hidden="true"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
        >
          AI
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "rounded-br-md bg-accent text-accent-foreground"
            : "rounded-bl-md bg-surface-2 text-foreground"
        }`}
      >
        {text || <span className="text-muted">…</span>}
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
