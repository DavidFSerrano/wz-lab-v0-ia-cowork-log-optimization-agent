# Context — ExampleCorp Log Optimization Agent

## The Company

**ExampleCorp** provides a scalable, Kubernetes-centric Infrastructure-as-a-Service (IaaS) platform built on Amazon Elastic Kubernetes Service (EKS). The company specializes in delivering fully managed EKS clusters seamlessly integrated with core AWS services.

**Logo:** File: `../ExampleCorp_Logo.png`
**Brand colors:** Blue (#107CBB), Violet (#8A3FFC), Slate (#1A1D21)

---

## The Problem

Modern infrastructure stacks (such as Kubernetes clusters and AWS CloudWatch groups) generate massive, repetitive log footprints. When debugging complex failures, engineers face distinct bottlenecks:
- **Token Inflation & Cost:** Sending raw production logs to a Large Language Model (LLM) quickly exhausts context windows and generates immense API token costs. Roughly 40MB of raw logs can equate to over 7 million tokens.
- **Signal-to-Noise Ratio:** Over 99% of raw log lines consist of repetitive health checks, boilerplate headers, and identical stack trace repetitions that obscure the root cause.
- **Latency:** Uploading megabytes of raw logs to a remote LLM during a live outage slows down incident response times when minutes matter.

---

## What Is Proposed by IA Cowork

A lightweight, local CLI tool that solves the token-bloat problem via intelligent edge preprocessing before initiating intelligent backend analysis.

1. **Local Compression:** The utility processes logs directly on the local machine using rule-based deduplication and formatting compression. This shrinks a **~40MB raw log file down to ~40KB**, and slashes an overwhelming **~7M tokens down to an ultra-lean ~16K tokens**.
2. **Live LLM Call:** Only the highly condensed, context-rich, and curated log summary is passed to the LLM backend (**Gemini**).
3. **Interactive Terminal Chat Loop:** Once the context is loaded, the CLI seamlessly transitions into a live multi-agent diagnostic chat loop inside the terminal.

**The "Lean-In" Moment:** The core sales and technical wow-factor relies on a rapid, combined visual beat. The user watches the log footprint visibly collapse in size on the terminal screen, immediately followed by the initiation of a live, responsive interactive chat loop probing the system failure. The magic is the combined sequence—not just the size reduction alone.

---

## Prototype User

| Field | Detail |
|---|---|
| **Role** | DevOps Engineer / Site Reliability Engineer (SRE) / Systems Architect |
| **Goal** | Troubleshoot critical system failures and find root causes instantly without hitches, token limits, or high costs |
| **Main Pain** | Shifting through gigabytes of noisy logs during outages; hitting LLM context barriers when copying/pasting error context |
| **Expected Action** | Execute CLI command sequence $\rightarrow$ watch footprint collapse $\rightarrow$ instantly query the live agent to diagnose the failure |

---

## Prototype Scope

**IN scope:**
- **CLI Commands:** A structured 3-step sequential workflow:
  1. `log-agent extract` — Simulates an offline log capture from a source like Kubernetes or AWS CloudWatch.
  2. `log-agent compress` — Runs the local rule-based compressor, visibly displaying real-time metrics and token savings (~40MB to ~40KB / ~7M to ~16K tokens).
  3. `log-agent analyze` — Hands over the curated context to the backend and launches the interactive multi-agent chat loop.
- **Local Rules Engine:** Basic regex/rule-based grouping to strip out repeating timestamps, repetitive info lines, and redundant log structures.
- **LLM Integration:** Live API connection to Gemini for executing root-cause queries against the compressed log context.

**OUT of scope:**
- **Graphical/Web Dashboard:** Any form of HTML/browser-based dashboard UI (the tool is completely terminal-bound).
- **Persistent Database:** Heavy storage backends or log indexes (the context is handled in-memory and on-the-fly).
- **Production Enterprise Connectors:** Fully realized live enterprise agent streaming daemons (the data layer uses simulated offline captures for the prototype).

---

## Dataset

File: `../04_Data_Sources/kubernetes_enhanced_raw_logs.txt`

Key points:
- Integrated realistic multi-tenant cluster events such as `kubelet` SyncLoops, `kube-proxy` keep-alives, `ingress-nginx` upstream retries, Prometheus metrics scraping cycles, and `core-dns` lookups alongside the core `checkout-service` noise.
- This environment noise variation checks whether your LLM compression engine can discard non-incident warnings (e.g., `ingress-nginx timeout`) while perfectly routing the true connection pool breakdown to the compressed JSON summary structure.