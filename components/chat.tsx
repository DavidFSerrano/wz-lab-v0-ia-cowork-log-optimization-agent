"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useEffect, useRef, useState } from "react"
import { ChatMessage, TypingIndicator } from "./chat-message"

const INCIDENT_TAGS = ["service: orders-api", "env: prod", "cluster: EKS", "severity: SEV-2"]

const SUGGESTIONS = [
  "orders-api pods are in CrashLoopBackOff in prod. What's the root cause?",
  "Walk me through a timeline of the orders-api incident across all logs",
  "Is the Aurora database the cause of the orders-api outage?",
  "What changed right before orders-api started crashing?",
]

function AlertIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function Chat() {
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isBusy = status === "submitted" || status === "streaming"
  const isEmpty = messages.length === 0

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, status])

  // Auto-grow the textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [input])

  function submit() {
    const value = input.trim()
    if (!value || isBusy) return
    sendMessage({ text: value })
    setInput("")
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-accent-foreground" aria-hidden="true">
            AI
          </div>
          <h1 className="text-sm font-semibold tracking-tight">AI Powered Logs Insights</h1>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-alert/30 bg-alert/10 px-2.5 py-1 text-xs font-medium text-alert">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-alert" aria-hidden="true" />
          Incident active
        </span>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-col gap-6 py-12">
              <div className="rounded-2xl border border-alert/30 bg-alert/10 p-5">
                <div className="flex items-start gap-3">
                  <div
                    aria-hidden="true"
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-alert text-alert-foreground"
                  >
                    <AlertIcon />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-base font-semibold text-balance">There&apos;s an active production incident</h2>
                    <p className="text-sm text-muted text-pretty">
                      Since ~02:14 UTC, <span className="font-medium text-foreground">orders-api</span> in the{" "}
                      <span className="font-medium text-foreground">prod</span> EKS cluster is degraded. New pods are
                      stuck in <span className="font-medium text-foreground">CrashLoopBackOff</span> and older replicas
                      are failing readiness probes, so the service is effectively down.
                    </p>
                    <p className="text-sm text-muted text-pretty">
                      I&apos;ve got access to the relevant Kubernetes and AWS logs. I can help you correlate them and
                      pin down the root cause — just ask, or start with one of the prompts below.
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {INCIDENT_TAGS.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-xs text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage({ text: s })}
                    className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm text-foreground transition-colors hover:border-accent hover:bg-surface-2"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {status === "submitted" && <TypingIndicator />}
            </>
          )}

          {error && (
            <div className="rounded-xl border border-amber-600/40 bg-amber-600/10 px-4 py-3 text-sm text-amber-500">
              Something went wrong. Please try sending your message again.
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border px-4 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="mx-auto flex w-full max-w-2xl items-end gap-2 rounded-2xl border border-border bg-surface p-2 focus-within:border-accent"
        >
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="Send a message…"
            className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted"
          />
          {isBusy ? (
            <button
              type="button"
              onClick={stop}
              className="shrink-0 rounded-xl bg-surface-2 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-border"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>
          )}
        </form>
        <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-muted">
          Press Enter to send, Shift + Enter for a new line.
        </p>
      </div>
    </div>
  )
}
