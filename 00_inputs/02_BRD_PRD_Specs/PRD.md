# Product Requirements Document (PRD)
## ExampleCorp — Log Optimization Agent (Terminal Simulator)
**Version:** 1.0  
**Date:** 2026-07-09  
**Prepared by:** Wizeline — Product Discipline  
**Reference:** BRD v1.0

---

## 1. Product Vision

> A local, CLI-first log-optimization and analysis engine that strips out redundant background infrastructure chatter to instantly compress Kubernetes incident logs by 99.9%, facilitating an immediate, low-cost diagnostic chat loop with Gemini.

**Prototype internal tagline:** *"Crush the noise, cure the cluster."*

---

## 2. Users

### Primary persona — Site Reliability Engineer (SRE) / DevOps Engineer

| Field | Detail |
|---|---|
| **Role** | SRE / DevOps Engineer / Systems Architect |
| **Goal** | Pinpoint critical EKS cluster errors instantly during major production incidents without exhausting LLM context limits or incurring massive token bills. |
| **Current frustration** | Sifting through gigabytes of repetitive system loops (`kubelet` syncs, Prometheus scrapes) while a production environment is down, losing valuable mitigation time, and hitting cloud LLM limits. |
| **Definition of success** | Running local commands to shrink massive logs down to 0.1% of their volume and entering an AI-assisted diagnostic shell to find the root cause in seconds. |

---

## 3. Application Architecture

### 3.1 Terminal Workflow Engine

```text
┌────────────────────────────────────────────────────────┐
│  TERMINAL CANVAS (Background: #1A1D21, Font: Mono)     │
│  examplecorp-agent > _                                 │
├────────────────────────────────────────────────────────┤
│                                                        │
│  [STATE 1: EXTRACT (`log-agent extract`)]              │
│  - Vertical cascade of raw noisy gray/yellow log text  │
│                                                        │
│  [STATE 2: COMPRESS (`log-agent compress`)]            │
│  - Stream halts + Loader appears                       │
│  - Summary Box: Size & Token metrics animate downward  │
│                                                        │
│  [STATE 3: ANALYZE (`log-agent analyze`)]              │
│  - ASCII Art Header + Connection established banner    │
│  - Blinking active shell prompt loop with Gemini AI    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### 3.2 Data Sources (In-Memory Simulation)

| Source | Type | Use |
|---|---|---|
| `kubernetes_enhanced_raw_logs.txt` | Local Mock Stream | Contains 99.9% Noise (`kubelet` SyncLoops, `kube-proxy` IPVS tables, Prometheus `/metrics`) and 0.1% Signal (`checkout-service-v2` postgres pool exhaustion at `14:02:11 UTC` and cascading `ingress-nginx` 504 timeouts). |

---

## 4. CLI Interface & Best Practices Specification

To support standard CLI best practices, the terminal environment must include:
* **Standard Commands:** `help` (lists usage), `clear` (wipes screen buffer), and history preservation using Up/Down arrow keys.
* **Command Validation:** Graceful warning outputs if a user runs commands out of sequence (e.g., trying to run `analyze` before extracting/compressing).
* **Auto-Focus Canvas:** Immediate keyboard input capturing upon terminal mounting.

---

### COMMAND 1 — `log-agent extract`

**Goal:** Simulate rapid extraction of raw EKS logs to demonstrate volume and density.

#### 4.1 Interface Execution
* Triggers high-speed, vertical scrolling animation down the terminal viewport.
* **Color Conventions:** `INFO` lines formatted in terminal gray; `WARN` lines formatted in terminal yellow.
* The cascade continuously generates 99.9% background system noise (`kubelet`, `kube-proxy`).

---

### COMMAND 2 — `log-agent compress`

**Goal:** Provide the "WOW moment" by visualizing the structural collapse of noise into actionable metadata.

#### 4.2 Deduplication Summary Matrix
Upon execution, log scrolling stops instantly and renders a localized summary card tracking data footprint reduction:

| Metric Tracker | Original Volume | Compressed Target | Reduction Rate | Animation Effect |
|---|---|---|---|---|
| **Data Log Footprint** | 40MB | 40KB | 99.9% | Rapid Counter Countdown |
| **LLM Context Tokens** | 7,000,000 | 16,000 | 99.77% | Rapid Counter Countdown |

* Renders a terminal progress bar `[████████████████████] 100% Deduplication Complete`.

---

### COMMAND 3 — `log-agent analyze`

**Goal:** Establish the diagnostic dialogue loop with the Gemini SRE Agent.

#### 4.3 Interactive Shell Environment
Clears the interface or appends an ASCII art banner signaling Gemini connectivity:

```text
  _____                             _  _____                
 |  ___|                           | |/  __ \               
 | |__  __  __ __ _ _ __ ___  _ __ | | /  \/ ___  _ __ _ __ 
 |  __| \ \/ // _` | '_ ` _ \| '_ \| | |    / _ \| '__| '_ \
 | |___  >  <| (_| | | | | | | |_) | | \__/\ (_) | |  | |_) |
 \____/ /_/\_\\__,_|_| |_| |_| .__/|_|\____/\___/|_|  | .__/ 
                             | |                      | |    
                             |_|                      |_|    
 Connection Status: SECURE VIA GEMINI API PIPELINE
```

* Spawns an interactive blinking cursor prompt: `examplecorp-agent > _`.
* **Streaming Responses:** AI diagnostics must stream characters out progressively to simulate true API latency.

#### 4.4 Diagnostic Prompt & Answer Mapping
The simulated model must responsively handle questions about the incident, serving structured technical step-by-steps:

| Sample User Query | Simulated Gemini SRE Agent Response Payload |
|---|---|
| *What caused the checkout failure?* / *Status check* | Identifies database connection-pool exhaustion in `checkout-service-v2` at `14:02:11 UTC`. Highlights downstream dependencies failing. |
| *Show cascading errors* / *Why the 504 timeouts?* | Explicitly links the database crash to subsequent `ingress-nginx` 504 Gateway Timeouts upstream. |

---

## 5. Non-Functional Requirements

| ID | Requirement | Detail |
|---|---|---|
| RNF-1 | Brand Consistency | Interface canvas background must strictly render Slate (`#1A1D21`). Primary indicators use Violet (`#8A3FFC`), Blue (`#107CBB`), and Success/Mint (`#10B981`). |
| RNF-2 | UI Pattern | Strict terminal simulator constraints: No sidebar dashboarding, floating charts, or buttons outside console environment. |
| RNF-3 | Performance | Token counter and log size reduction transitions must complete within 2.5 seconds using smooth text frame increments. |

---

## 6. User Stories

### Epic: Localized SRE Log Parsing & Optimization

**US-01** — As an SRE, I want to run `log-agent extract` inside a simulated environment so I can view the velocity of raw incoming multi-tenant logs without overwhelming my terminal buffer.

**US-02** — As an SRE, I want to execute `log-agent compress` to clear out background network chatter and verify exactly how many system tokens were saved before hitting third-party LLM APIs.

**US-03** — As an Infrastructure Sponsor, I want to visualize the metric reduction from 7,000,000 tokens to under 16,000 tokens, ensuring our cloud API expenditures remain low.

**US-04** — As an SRE, I want an active shell chat loop (`log-agent analyze`) to dynamically query the compressed data context, surfacing the specific timeframe of the `checkout-service-v2` crash without manual reading.

---

## 7. Acceptance Criteria by Feature

### F1 — CLI Terminal Interface
- [ ] Application loads directly into a full-screen `#1A1D21` dark layout using monospaced layout frameworks.
- [ ] Commands `help` and `clear` perform standard shell operations cleanly.

### F2 — Log Extraction Sequence
- [ ] Command `log-agent extract` spits a rapid vertical stream of gray (`INFO`) and yellow (`WARN`) text.
- [ ] The engine streams log records continuously until halted by the user or sequential commands.

### F3 — Data Compression Matrix
- [ ] Command `log-agent compress` locks the log scroll and spins a terminal text loader.
- [ ] Metric frames rapidly decrement down to target values (**40MB → 40KB** and **7,000,000 → 16,000** tokens).
- [ ] Displays a completed 100% deduplication indicator block colored in Mint (`#10B981`).

### F4 — Gemini SRE Agent Shell
- [ ] Command `log-agent analyze` surfaces an ExampleCorp ASCII banner and initiates the interactive cursor string (`examplecorp-agent > `).
- [ ] Submitting incident questions streams technical responses identifying the `checkout-service-v2` pool exhaustion at `14:02:11 UTC` and related `ingress-nginx` 504 timeouts.

---

## 8. Screens — Visual Summary

```text
STATE 1: EXTRACT             STATE 2: COMPRESS            STATE 3: ANALYZE
─────────────────────        ─────────────────────        ─────────────────────
examplecorp > log-extract    examplecorp > log-compress   examplecorp > log-analyze
─────────────────────        ─────────────────────        ─────────────────────
[INFO] kubelet sync...       [ RUNNING DEDUPLICATION ]    
[WARN] metrics scrape..      [████████████████] 100%       _____  _  _  ____ _ _
[INFO] kube-proxy sync..     ─────────────────────       |  ___|| \/ ||  _ \ | |
[INFO] kubelet sync...       Size:   40MB   -> 40KB      | |___  >  < | |_) | |
[WARN] metrics scrape..      Tokens: 7.0M   -> 16K        \____|/_/\_\| .__/|_|
[INFO] kube-proxy sync..     ─────────────────────                    |_|
[INFO] kubelet sync...       Compression Complete!        examplecorp-agent > _
```
