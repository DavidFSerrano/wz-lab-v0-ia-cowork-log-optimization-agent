# Context — ExampleCorp Log Optimization Agent

## The Company

**ExampleCorp** is a leading Kubernetes-centric Infrastructure-as-a-Service (IaaS) provider built on Amazon Elastic Kubernetes Service (EKS). They deliver fully managed EKS clusters seamlessly integrated with core AWS services.

Because managing high-density, multi-tenant environments generates massive, noisy log footprints, ExampleCorp's SRE teams require this high-performance internal utility to keep diagnostic times and LLM costs minimal.

**Logo:** File: `../ExampleCorp_Logo.png`
**Brand colors:** Blue (#107CBB), Violet (#8A3FFC), Slate (#1A1D21), Mint/Success (#10B981)

---

## The Problem

EKS clusters and AWS CloudWatch groups generate redundant operational log footprints during incident response:
- **Token Inflation:** Sending raw logs to an LLM quickly exhausts context windows and creates massive API token costs (e.g., 40MB of raw logs = ~7,000,000 tokens).
- **Low Signal-to-Noise:** Over 99% of raw lines are repetitive system loops (`kubelet` syncs, Prometheus metrics scrapes) that hide actual application crashes.
- **Outage Latency:** Copying/uploading massive log dumps to cloud LLMs wastes critical minutes.

---

## What Is Proposed (The v0 Web CLI Simulator)

A CLI-first log-optimization and analysis engine that runs locally to compress logs, then starts a live chat loop with Gemini for diagnostics.

> ⚠️ **CRITICAL V0 IMPLEMENTATION NOTE:** This is a **CLI tool**, not a web dashboard. Because this prototype runs in v0 (a browser sandbox), the interface must be rendered as a **highly polished, full-screen interactive Terminal Simulator**. It should use a dark theme (`#1A1D21`), monospaced typography, and smooth terminal-style animations.

### The "Lean-In" Animation Sequence
To sell the value of the tool, the simulator must execute an animated 3-step sequence:
1. **The Avalanche:** The user triggers `log-agent extract`. The screen simulates a rapid vertical cascade of noisy raw logs (colored in standard terminal format: gray for `INFO`, yellow for `WARN`).
2. **The Collapse (The WOW Moment):** Upon `log-agent compress`, the scrolling logs pause. A terminal-style loader appears, and the screen visually transitions into a neat summary box. Counters rapidly animate: **Size: 40MB → 40KB** and **Tokens: 7,000,000 → 16,000**.
3. **The Handshake:** Upon `log-agent analyze`, the terminal establishes a connection with the Gemini API, displays a clean ASCII-art welcome graphic, and opens an active, cursor-blinking prompt line (`examplecorp-agent > _`).

---

## Prototype User

| Field | Detail |
|---|---|
| **Role** | SRE / DevOps Engineer / Systems Architect |
| **Goal** | Pinpoint critical EKS cluster errors instantly without hitting API context limits or paying thousands in token fees |
| **Main Pain** | Sifting through gigabytes of repetitive system chatter while the production environment is down |
| **Expected Action** | Run simulated commands → Watch massive logs shrink to 1% of their size → Live-chat with the SRE Agent |

---

## Prototype Scope

**IN scope for the v0 Terminal Simulator:**
- **Interactive Terminal UI:** Fully interactive console with keyboard focus, supporting simulated CLI command inputs (`help`, `clear`, `extract`, `compress`, `analyze`).
- **Visual Command States:**
  - `log-agent extract`: Renders the high-speed log-scrolling animation.
  - `log-agent compress`: Displays real-time deduplication metrics and a progress bar showing a $99.9\%$ footprint reduction.
  - `log-agent analyze`: Launches an interactive terminal-chat session. The user can type questions (e.g., *"What caused the checkout failure?"*) and receive streaming, step-by-step diagnostic answers from a simulated Gemini SRE Agent.
- **SRE Agent Diagnostics:** Pre-configured interactive prompts highlighting the specific database connection-pool breakdown buried in the logs.

**OUT of scope:**
- **Traditional UI Dashboards:** No charts, sidebars, or standard SaaS components. Keep it strictly terminal-based.
- **Real Backend File Access:** The app uses mock log streams generated locally in-memory.

---

## Dataset & Simulation Target

File: `../04_Data_Sources/kubernetes_enhanced_raw_logs.txt`

The simulator mock data must mimic a complex, multi-tenant environment containing:
1. **Background Noise (99.9% of volume - discarded during compression):**
   - `kubelet` SyncLoops keeping containers active.
   - `kube-proxy` IPVS keep-alive table syncs.
   - Prometheus scrapers fetching `/metrics` every 15 seconds.
2. **The Signal (0.1% of volume - kept for the LLM context):**
   - A critical postgres connection-pool exhaustion error originating from `checkout-service-v2` at `14:02:11 UTC`.
   - Subsequent cascading upstream `ingress-nginx` 504 Gateway Timeouts.