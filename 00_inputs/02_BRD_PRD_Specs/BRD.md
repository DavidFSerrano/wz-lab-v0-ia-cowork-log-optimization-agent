# Business Requirements Document (BRD)
# ExampleCorp — Log Ingestion & Optimization AI Agent

## 1. Executive Summary
This initiative validates ExampleCorp's need of an AI-powered log-reduction and root-cause analysis framework for EKS environments. By compressing raw Kubernetes log streams by 65–80% before passing them to an LLM, the product dramatically reduces token costs while improving the quality and speed of AI-generated incident diagnostics.

## 2. Strategic Objectives
- **Demonstrate quantifiable token savings:** Show real-time character and token reduction metrics within seconds of launching the Compressor or Stream pages. Target: ≥65% reduction on representative EKS fixture logs.
- **Prove signal retention:** Compressed output must preserve every actionable diagnostic marker — error class, pod name, reason, and timestamp — even after aggressive deduplication and noise removal.
- **Enable AI-assisted RCA at zero latency:** Tie the compressed, vectorised log chunks directly to an interactive SRE chat interface for structured Incident Summary / Root Cause / Remediation outputs.
- **Provide a self-contained demo:** The entire system must run without a live EKS cluster, using the built-in stream simulator and fixture log files.

## 3. Stakeholders
| Role | Interest |
|---|---|
| SRE / Platform Engineering | Primary end users — triage speed and cost reduction |
| Engineering Leadership | ROI on observability spend, AI adoption evidence |
| Wizeline Sales / Solutions Engineering | Client-facing demo capability for EKS prospects |

## 4. High-Level Acceptance Criteria
- All six pages (Chat, Demo, Live Logs, Compressor, Stream, Architecture) are accessible and render correctly in the Vercel preview.
- The Stream page Start/Stop control toggles the simulated log feed and the live tail updates within 2 seconds.
- The Compressor page produces a measurable reduction percentage on the pre-filled sample input.
- The Chat page returns a structured AI response (Incident Summary, Root Cause, Remediation) when queried about log content.
- Navigation is consistent across all pages — same header height, padding, button style, and max-width content container.
- Deployment succeeds on Vercel from the `log-ingestion-and-compression` branch with zero TypeScript build errors.

## 5. Constraints
- No authentication layer — the app is a demo/internal tool.
- All LLM calls use the Vercel AI Gateway (no direct provider keys exposed to the client).
- Database is Neon Serverless Postgres — no local SQLite or in-memory store.
- The compressor is zero-dependency TypeScript — no Python runtime or external binary.
