"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, ChevronRight, CornerDownLeft, Square, Terminal } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { fetchAgentDiagnosticReport } from "@/lib/mockLogService"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────
type Role = "system" | "user" | "agent"

interface Message {
  id: string
  role: Role
  text: string
  isStreaming?: boolean
}

// ─── Preset diagnostic prompts ────────────────────────────────────────────────
const QUICK_PROMPTS = [
  "Diagnose orders-api CrashLoopBackOff",
  "What is the root cause of Exit Code 137?",
  "Why is payment-gateway latency spiking?",
  "Run full RCA on auth-service pod restarts",
]

// ─── Markdown renderer (terminal-styled) ─────────────────────────────────────
function TerminalMarkdown({ content }: { content: string }) {
  return (
    <div className="space-y-2 font-mono text-[11px] leading-relaxed text-zinc-300">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xs font-bold uppercase tracking-widest text-green-400">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold uppercase tracking-widest text-green-400">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-400">{children}</h3>
          ),
          p: ({ children }) => <p className="text-zinc-300">{children}</p>,
          ul: ({ children }) => <ul className="list-none space-y-0.5 pl-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-0.5 pl-4 text-zinc-300">{children}</ol>,
          li: ({ children }) => (
            <li className="flex items-start gap-1 text-zinc-300">
              <span className="shrink-0 text-green-600">{">"}</span>
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-zinc-100">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="not-italic text-amber-400">{children}</em>
          ),
          code: ({ className, children }) => {
            const isBlock = (className ?? "").includes("language-")
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded border border-zinc-700 bg-black px-3 py-2 font-mono text-[10px] text-green-400">
                  {children}
                </code>
              )
            }
            return (
              <code className="rounded border border-zinc-700 bg-black px-1 py-0.5 font-mono text-[10px] text-green-400">
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre>,
          hr: () => <hr className="border-zinc-800" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-green-700 pl-3 text-zinc-500">{children}</blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 underline hover:text-green-300"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// ─── Message row ─────────────────────────────────────────────────────────────
function MessageRow({ msg }: { msg: Message }) {
  if (msg.role === "system") {
    return (
      <div className="flex items-start gap-2 py-1">
        <span className="shrink-0 font-mono text-[10px] text-zinc-600">[SYSTEM]</span>
        <p className="font-mono text-[10px] leading-relaxed text-zinc-600">{msg.text}</p>
      </div>
    )
  }

  if (msg.role === "user") {
    return (
      <div className="flex items-start gap-2 py-1.5">
        <span className="shrink-0 font-mono text-[10px] font-bold text-amber-500">[USER]</span>
        <p className="font-mono text-[11px] leading-relaxed text-amber-300">{msg.text}</p>
      </div>
    )
  }

  // Agent
  return (
    <div className="flex items-start gap-2 py-2">
      <span className="shrink-0 font-mono text-[10px] font-bold text-green-500">[AI-AGENT]</span>
      <div className="min-w-0 flex-1">
        {msg.isStreaming ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-green-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" aria-hidden="true" />
            Processing log context<span className="blink">_</span>
          </span>
        ) : (
          <TerminalMarkdown content={msg.text} />
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function TerminalChatConsole() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "sys-boot",
      role: "system",
      text: "ExampleCorp Log-Optimization Agent v1.0 — Multi-agent diagnostic loop initialized. Vector store: READY. Filter engine: ACTIVE.",
    },
    {
      id: "sys-ready",
      role: "system",
      text: "Monitoring: orders-api, payment-gateway, auth-service — Type a query or select a preset diagnostic below.",
    },
  ])
  const [input, setInput] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const busyRef = useRef(false)

  // Scroll to bottom whenever messages update
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  function makeId() {
    return Math.random().toString(36).substring(2, 9)
  }

  /**
   * Simulate a streaming agent response:
   * 1. Add a "streaming" placeholder message
   * 2. After a short delay, replace with the full mock diagnostic report
   */
  async function runAgentResponse(userText: string) {
    if (busyRef.current) return
    busyRef.current = true
    setIsBusy(true)

    // Extract service name heuristically from the user message
    const serviceMatch = userText.match(/(orders-api|payment-gateway|auth-service)/i)
    const serviceName = serviceMatch ? serviceMatch[1] : "orders-api"

    // Add streaming placeholder
    const agentId = makeId()
    setMessages((prev) => [
      ...prev,
      { id: agentId, role: "agent", text: "", isStreaming: true },
    ])

    // Simulate network/processing delay (1.2 – 2.2s)
    const delay = 1200 + Math.random() * 1000
    await new Promise((r) => setTimeout(r, delay))

    const report = fetchAgentDiagnosticReport(serviceName)

    // Replace streaming placeholder with actual content
    setMessages((prev) =>
      prev.map((m) =>
        m.id === agentId ? { ...m, text: report, isStreaming: false } : m,
      ),
    )

    busyRef.current = false
    setIsBusy(false)
  }

  function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isBusy) return

    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: "user", text: trimmed },
    ])
    setInput("")
    runAgentResponse(trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      e.keyCode !== 229
    ) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function stopGeneration() {
    busyRef.current = false
    setIsBusy(false)
    setMessages((prev) =>
      prev.map((m) =>
        m.isStreaming ? { ...m, text: "[ABORTED] Generation stopped by user.", isStreaming: false } : m,
      ),
    )
  }

  return (
    <div className="flex h-full flex-col bg-black">
      {/* ── Panel header ── */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-green-500" aria-hidden="true" />
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-zinc-300">
            Diagnostic Console
          </h2>
          <span className="rounded border border-green-900 bg-green-950 px-1.5 py-0 font-mono text-[9px] text-green-500">
            MULTI-AGENT
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 font-mono text-[10px]",
              isBusy ? "text-amber-500" : "text-green-600",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isBusy
                  ? "animate-pulse bg-amber-500"
                  : "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]",
              )}
              aria-hidden="true"
            />
            {isBusy ? "PROCESSING" : "IDLE"}
          </span>
          <Bot size={13} className="text-zinc-600" aria-hidden="true" />
        </div>
      </div>

      {/* ── Message output feed ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3"
        role="log"
        aria-label="Diagnostic chat output"
        aria-live="polite"
      >
        <div className="flex flex-col gap-0.5 divide-y divide-zinc-900">
          {messages.map((msg) => (
            <MessageRow key={msg.id} msg={msg} />
          ))}
        </div>
      </div>

      {/* ── Quick prompt chips ── */}
      <div className="border-t border-zinc-800/60 px-4 py-2">
        <p className="mb-1.5 font-mono text-[9px] text-zinc-700">PRESET DIAGNOSTICS:</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isBusy}
              onClick={() => sendMessage(prompt)}
              className={cn(
                "flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-400 transition-all",
                "hover:border-green-700 hover:bg-zinc-800 hover:text-green-400",
                isBusy && "cursor-not-allowed opacity-40",
              )}
            >
              <ChevronRight size={9} aria-hidden="true" />
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Composer ── */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMessage(input)
          }}
          className={cn(
            "flex items-end gap-2 rounded border bg-zinc-950 px-3 py-2 transition-all",
            "border-zinc-700 focus-within:border-green-700 focus-within:shadow-[0_0_12px_-4px_rgba(34,197,94,0.4)]",
          )}
        >
          <span className="mb-1.5 shrink-0 font-mono text-[11px] font-bold text-green-600">{">"}</span>
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter diagnostic query or command…"
            disabled={isBusy}
            className={cn(
              "max-h-[160px] flex-1 resize-none bg-transparent font-mono text-[11px] text-zinc-200 outline-none",
              "placeholder:text-zinc-700",
              isBusy && "opacity-50",
            )}
            aria-label="Diagnostic query input"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={stopGeneration}
              className="shrink-0 rounded border border-amber-800 bg-amber-950 px-3 py-1.5 font-mono text-[10px] text-amber-500 transition-colors hover:bg-amber-900"
              aria-label="Stop generation"
            >
              <Square size={11} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className={cn(
                "shrink-0 rounded border border-green-800 bg-green-950 px-3 py-1.5 font-mono text-[10px] text-green-400 transition-all",
                "hover:border-green-600 hover:bg-green-900 hover:text-green-300",
                "disabled:cursor-not-allowed disabled:opacity-30",
              )}
              aria-label="Send query"
            >
              <CornerDownLeft size={11} aria-hidden="true" />
            </button>
          )}
        </form>
        <p className="mt-1.5 font-mono text-[9px] text-zinc-700">
          [LOGS] Enter to send · Shift+Enter for newline · Context: filtered vector store
        </p>
      </div>
    </div>
  )
}
