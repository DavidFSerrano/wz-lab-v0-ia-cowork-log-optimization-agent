"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChatMessage, TypingIndicator } from "./chat-message"
import { IncidentDashboard, type Incident } from "./incident-dashboard"

function suggestionsFor(inc: Incident): string[] {
  const svc = inc.service ?? "the service"
  return [
    `What's the root cause of "${inc.title}"?`,
    `Walk me through a timeline of the ${svc} incident across all logs`,
    `What changed right before ${svc} started failing?`,
    `Which red herrings can we rule out for this ${svc} incident?`,
  ]
}

const SEVERITY_CHIP: Record<Incident["severity"], string> = {
  critical: "border-secondary/40 bg-secondary/10 text-secondary",
  error: "border-alert/40 bg-alert/10 text-alert",
  warn: "border-accent/40 bg-accent/10 text-accent",
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  )
}

export function Chat() {
  const { messages, sendMessage, setMessages, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  })
  const [input, setInput] = useState("")
  const [incident, setIncident] = useState<Incident | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isBusy = status === "submitted" || status === "streaming"
  const isEmpty = messages.length === 0

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, status])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [input])

  // Send a message scoped to the currently selected incident. The incident
  // context is passed in the request body and injected into the system prompt
  // server-side so retrieval focuses on this incident's service + time window.
  function send(text: string) {
    const body = incident
      ? {
          incident: {
            title: incident.title,
            service: incident.service,
            environment: incident.environment,
            sources: incident.sources,
            severity: incident.severity,
            firstSeen: incident.first_seen,
            lastSeen: incident.last_seen,
          },
        }
      : undefined
    sendMessage({ text }, { body })
  }

  function submit() {
    const value = input.trim()
    if (!value || isBusy) return
    send(value)
    setInput("")
  }

  function openIncident(next: Incident) {
    setIncident(next)
    setMessages([])
    setInput("")
  }

  function backToDashboard() {
    if (isBusy) stop()
    setIncident(null)
    setMessages([])
    setInput("")
  }

  return (
    <div className="flex h-dvh flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-accent/20 bg-surface/60 px-4 py-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2.5">
          {incident ? (
            <button
              type="button"
              onClick={backToDashboard}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 font-mono text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
            >
              <BackIcon />
              Incidents
            </button>
          ) : (
            <>
              <div className="glow-accent flex h-7 w-7 items-center justify-center rounded-lg border border-accent/60 bg-accent/10 font-mono text-xs font-bold text-accent" aria-hidden="true">
                AI
              </div>
              <h1 className="text-glow-accent font-mono text-sm font-semibold uppercase tracking-[0.2em] text-accent">
                Logs<span className="text-secondary text-glow-secondary">//</span>Insights
              </h1>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {incident ? (
            <span className={`truncate rounded-full border px-2.5 py-1 font-mono text-xs font-medium ${SEVERITY_CHIP[incident.severity] ?? SEVERITY_CHIP.warn}`}>
              {incident.service ?? "incident"}
            </span>
          ) : (
            <Link
              href="/logs"
              className="rounded-lg border border-border px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-muted transition-colors hover:border-accent hover:text-accent"
            >
              Live logs
            </Link>
          )}
        </div>
      </header>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
          {!incident ? (
            <IncidentDashboard onSelect={openIncident} />
          ) : isEmpty ? (
            <div className="flex flex-col gap-6 py-8">
              <div className="rounded-2xl border border-alert/40 bg-alert/5 p-5 shadow-[0_0_24px_-8px_theme(colors.alert)]">
                <h2 className="font-mono text-base font-semibold uppercase tracking-wide text-alert text-balance">
                  {incident.title}
                </h2>
                {incident.summary ? (
                  <p className="mt-2 text-sm text-muted text-pretty">{incident.summary}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-md border border-alert/30 bg-alert/5 px-2 py-0.5 font-mono text-xs text-alert">
                    {incident.error_count} errors
                  </span>
                  {incident.service ? (
                    <span className="rounded-md border border-accent/30 bg-accent/5 px-2 py-0.5 font-mono text-xs text-accent">
                      service: {incident.service}
                    </span>
                  ) : null}
                  {incident.environment ? (
                    <span className="rounded-md border border-accent/30 bg-accent/5 px-2 py-0.5 font-mono text-xs text-accent">
                      env: {incident.environment}
                    </span>
                  ) : null}
                  {incident.sources.map((s) => (
                    <span key={s} className="rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-xs text-muted">
                      src: {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                {suggestionsFor(incident).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="group rounded-xl border border-border bg-surface/60 px-4 py-3 text-left text-sm text-foreground transition-all hover:border-accent hover:bg-surface-2 hover:shadow-[0_0_16px_-4px_theme(colors.accent)]"
                  >
                    <span className="mr-2 font-mono text-accent/70 transition-colors group-hover:text-accent" aria-hidden="true">
                      &gt;
                    </span>
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

      {/* Composer — only while investigating an incident */}
      {incident ? (
        <div className="border-t border-accent/20 bg-surface/60 px-4 py-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
            className="mx-auto flex w-full max-w-2xl items-end gap-2 rounded-2xl border border-border bg-surface p-2 transition-shadow focus-within:border-accent focus-within:shadow-[0_0_18px_-4px_theme(colors.accent)]"
          >
            <textarea
              ref={textareaRef}
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder={`Ask about the ${incident.service ?? "incident"}…`}
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
                className="glow-accent shrink-0 rounded-xl bg-accent px-4 py-2 font-mono text-sm font-semibold uppercase tracking-wider text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                Send
              </button>
            )}
          </form>
          <p className="mx-auto mt-2 max-w-2xl text-center text-xs text-muted">
            Press Enter to send, Shift + Enter for a new line.
          </p>
        </div>
      ) : null}
    </div>
  )
}
