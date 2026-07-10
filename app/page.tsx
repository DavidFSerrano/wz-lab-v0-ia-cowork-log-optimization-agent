import { StreamingMetricsSidebar } from "@/components/streaming-metrics-sidebar"
import { TerminalChatConsole } from "@/components/terminal-chat-console"

export default function Page() {
  return (
    <main className="flex h-dvh flex-col bg-black overflow-hidden">
      {/* ── Global workspace header ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-5 py-2.5">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded border border-green-800 bg-green-950 px-2 py-0.5">
            <span className="font-mono text-[10px] font-bold tracking-widest text-green-400">
              EXAMPLECORP
            </span>
          </div>
          <div className="h-3.5 w-px bg-zinc-700" aria-hidden="true" />
          <h1 className="font-sans text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Log Optimization Agent
          </h1>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.7)]" aria-hidden="true" />
            <span className="font-mono text-[10px] text-green-600">FILTER ENGINE ACTIVE</span>
          </div>
          <div className="h-3 w-px bg-zinc-800" aria-hidden="true" />
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
            <span className="font-mono text-[10px] text-amber-600">EKS PROD · us-east-1</span>
          </div>
          <div className="h-3 w-px bg-zinc-800" aria-hidden="true" />
          <span className="font-mono text-[10px] text-zinc-600">v1.0-alpha</span>
        </div>
      </header>

      {/* ── Two-panel workspace ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Streaming Metrics Sidebar (~33%) */}
        <div className="hidden w-[340px] shrink-0 overflow-hidden lg:flex lg:flex-col xl:w-[380px]">
          <StreamingMetricsSidebar />
        </div>

        {/* Divider */}
        <div className="hidden w-px shrink-0 bg-zinc-800 lg:block" aria-hidden="true" />

        {/* Right: Terminal Chat Console (~67%) */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <TerminalChatConsole />
        </div>
      </div>
    </main>
  )
}
