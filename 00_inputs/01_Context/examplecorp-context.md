# Business Context: ExampleCorp — Log Ingestion & Optimization AI Agent

## 1. Company Overview
ExampleCorp is a modern, Kubernetes-centric Infrastructure-as-a-Service (IaaS) provider built natively on Amazon Elastic Kubernetes Service (EKS). ExampleCorp delivers fully managed, ultra-secure, and dynamically scalable EKS clusters seamlessly integrated with core AWS primitives.

## 2. Core Problem & Product Vision
Modern EKS clusters emit enormous volumes of highly redundant log data. SREs must scroll through thousands of identical health-check lines, duplicated UUIDs, verbose ARNs, and repeated stack traces before reaching the one line that describes the actual failure. This creates:
- Wasted time during incident triage
- Excessive token costs when feeding raw logs to LLMs for root-cause analysis
- Poor signal-to-noise ratio in AI-generated diagnostics

The SRE AI Agent solves this with a four-layer architecture:
1. **Pre-ingestion compression** — strips noise from raw EKS logs (65–80% character reduction) before any LLM call.
2. **Vector ingestion pipeline** — chunks, embeds, and stores compressed log entries in Neon (pgvector) for semantic retrieval.
3. **RAG-powered chat** — an SRE-focused AI assistant that searches stored log chunks by semantic similarity and returns structured incident reports.
4. **Live stream simulation** — a continuous synthetic EKS log feed that drives the full pipeline end-to-end without needing a real cluster.

## 3. Targeted User Personas
- **Site Reliability Engineers (SREs):** Need to triage CrashLoopBackOff events, OOMKilled pods, and KMS access failures in seconds, not hours, while minimising cloud egress and LLM token spend.
- **Platform Engineers:** Responsible for optimising observability pipeline costs across enterprise EKS clusters. Need proof that AI-assisted log compression retains actionable signal.
- **Developer Experience Engineers:** Want to demo AI-powered log analysis to clients without needing a live EKS cluster.

## 4. Prototype Scope
- **IN:** Multi-page terminal-themed dashboard — Chat (RAG), Demo (guided walkthrough), Live Logs, Compressor, Stream, Architecture.
- **IN:** Fully functional backend — Neon Postgres with pgvector, embedding via `text-embedding-3-small`, LLM via `gpt-5.1-instant`, incident auto-detection.
- **IN:** Simulated EKS log stream with Start/Stop/Speed controls and SSE live tail.
- **IN:** EKS log compressor with before/after metrics (ARN redaction, UUID truncation, global dedup, stack trace truncation).
- **OUT:** Real EKS cluster connectivity, multi-tenant auth, production alerting integrations.
