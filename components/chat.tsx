"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useEffect, useRef, useState } from "react"
import { ChatMessage, TypingIndicator } from "./chat-message"

const SUGGESTIONS = [
  "Explain how streaming responses work",
  "Write a haiku about databases",
  "Summarize the theory of relativity",
  "Give me ideas for a weekend project",
]

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
          <div className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden="true" />
          <h1 className="text-sm font-semibold tracking-tight">Assistant</h1>
        </div>
        <span className="font-mono text-xs text-muted">gpt-5.1-instant</span>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-6 py-16 text-center">
              <div
                aria-hidden="true"
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-accent-foreground"
              >
                AI
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-semibold text-balance">How can I help you today?</h2>
                <p className="text-sm text-muted text-pretty">
                  Ask anything. Responses stream in as they&apos;re generated.
                </p>
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
