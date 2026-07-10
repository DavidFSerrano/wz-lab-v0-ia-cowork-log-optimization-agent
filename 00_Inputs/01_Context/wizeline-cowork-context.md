# Business Context: Wizeline SRE AI Agent — Log Ingestion & Optimization

## 1. Company Overview
Wizeline is a global technology services company that builds software platforms for enterprise clients. This tool is a Wizeline-internal SRE productivity accelerator — a developer-centric AI agent workspace built on Next.js and deployed on Vercel. It targets Site Reliability Engineers and Platform Engineers who operate Kubernetes workloads on Amazon EKS and AWS.

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

## 5. Deployment Target
- **Platform:** Vercel (Next.js 16, App Router, Edge-compatible routes)
- **Database:** Neon Serverless Postgres + pgvector extension
- **Branch:** `log-ingestion-and-compression` → PR to `main`
- **Repo:** `DavidFSerrano/wz-lab-v0-ia-cowork-log-optimization-agent`
