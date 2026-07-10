import { DemoView } from "@/components/demo-view"

export const metadata = {
  title: "Demo — RAG log investigation walkthrough",
  description: "A guided, self-playing walkthrough of the RAG log-troubleshooting pipeline on a real incident.",
}

export default function DemoPage() {
  return (
    <main className="h-dvh w-full">
      <DemoView />
    </main>
  )
}
