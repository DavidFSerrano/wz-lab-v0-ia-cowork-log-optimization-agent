import { LogCompressorView } from "@/components/log-compressor-view"

export const metadata = {
  title: "Log Compressor — EKS Pre-processing",
  description: "Strip health-check noise, deduplicate repeated messages, and truncate stack traces before sending EKS logs to an LLM.",
}

export default function CompressPage() {
  return (
    <main className="mx-auto h-dvh w-full max-w-6xl">
      <LogCompressorView />
    </main>
  )
}
