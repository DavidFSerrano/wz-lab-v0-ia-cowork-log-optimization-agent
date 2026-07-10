import type { Metadata } from "next"
import { LogStreamView } from "@/components/log-stream-view"

export const metadata: Metadata = {
  title: "Live EKS Log Stream — SRE AI Agent",
  description: "Continuously ingest simulated Kubernetes EKS log lines into the pgvector pipeline and watch them appear in real time.",
}

export default function StreamPage() {
  return <LogStreamView />
}
