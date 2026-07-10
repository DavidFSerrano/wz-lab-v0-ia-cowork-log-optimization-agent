# CLI Output Style Specification — ExampleCorp Log Optimization Agent
**Version:** 1.0  
**Theme Canvas:** Slate (`#1A1D21`)  
**Typography:** Monospace (Inter / Fira Code / JetBrains Mono)  
**Target Platform:** v0 Terminal Simulator Shell

---

## 1. Color System (Terminal ANSI Mapping)

| Element / State | Hex Code | Tailwind / Token Equivalent | Usage |
| :--- | :--- | :--- | :--- |
| **Canvas Bg** | `#1A1D21` | `bg-[#1A1D21]` | Full-screen terminal viewport |
| **Primary Text** | `#FFFFFF` | `text-white` | Active inputs, command names |
| **Muted Noise** | `#64748B` | `text-slate-500` | `[INFO]` logs, background loop chatter |
| **Warning / Signal** | `#D97706` | `text-amber-600` | `[WARN]` logs, system alerts |
| **Accent / Violet** | `#8A3FFC` | `text-[#8A3FFC]` | Interactive system prompts, ASCII highlights |
| **Success / Mint** | `#10B981` | `text-[#10B981]` | Compression complete, 100% deduplication indicators |

---

## 2. Before/After Optimization Printout Layout

When executing the data optimization workflow (`log-agent compress`), the scrolling buffer is suspended to output this clean metrics matrix block.

```text
examplecorp-shell > log-agent compress

[ RUNNING LOCAL DEDUPLICATION PIPELINE ]
[████████████████████████████████████████] 100% Optimization Complete

┌────────────────────────────────────────────────────────────────────────┐
│                      LOG FOOTPRINT REDUCTION MATRIX                    │
├──────────────────────┬──────────────────┬──────────────────┬───────────┤
│ METRIC TRACKER       │ ORIGINAL VOLUME  │ COMPRESSED TARGET│ REDUCTION │
├──────────────────────┼──────────────────┼──────────────────┼───────────┤
│ Data Log Size        │ 40.00 MB         │ 40.00 KB         │ 99.90%    │
│ LLM Context Tokens   │ 7,000,000 tx     │ 16,000 tx        │ 99.77%    │
└──────────────────────┴──────────────────┴──────────────────┴───────────┘
✔ Stripped 6,984,000 redundant Kubelet SyncLoops and Prometheus noise vectors.
```

## 3. Interactive AI Shell & Chat Prompt Layout

When changing state to the diagnostic phase (`log-agent analyze`), the terminal prints the corporate AI sub-branding banner and drops the user into an active prompt loop with the Gemini SRE Agent context.

```text
examplecorp-shell > log-agent analyze

  _____                             _  _____                
 |  ___|                           | |/  __ \               
 | |__  __  __ __ _ _ __ ___  _ __ | | /  \/ ___  _ __ _ __ 
 |  __| \ \/ // _` | '_ ` _ \| '_ \| | |    / _ \| '__| '_ \
 | |___  >  <| (_| | | | | | | |_) | | \__/\ (_) | |  | |_) |
 \____/ /_/\_\\__,_|_| |_| |_| .__/|_|\____/\___/|_|  | .__/ 
                             | |                      | |    
                             |_|                      |_|    

📡 CONNECTION STATUS: SECURE LOCAL PIPELINE VIA GEMINI API
🧠 CONTEXT: 16,000 Optimized Tokens Loaded Successfully.

examplecorp-agent > What caused the checkout failure?


🤖 GEMINI SRE AGENT [STREAMING RESPONSE] ───
Analysis points directly to an isolated database layer exhaustion:

1. Root Cause:
   • Timestamp: 14:02:11 UTC
   • Service: `checkout-service-v2`
   • Event: PostgreSQL connection pool capacity fully saturated (Max 100/100 connections active).

2. Cascading Upstream Impacts:
   • Pod `checkout-service-v2-7f9db` began throwing `500 Internal Server Error`.
   • Edge controller `ingress-nginx` registered sudden response latency spikes, triggering automated upstream `504 Gateway Timeouts`.

examplecorp-agent > _
```

## 4. Components & Micro-Interactions

### Interactive Canvas Constraints
* **Auto-Focus Anchor:** Clicking anywhere on the screen layout forces client-side focus back onto the active line input[cite: 2].
* **Blinking Cursor Element:** The active insertion character `_` relies on an infinite pulse animation (`animate-pulse`)[cite: 1, 2].
* **Prompt Buffer Control:** Standard shell utilities `help` and `clear` intercept execution loops to handle terminal presentation resets natively without server state destruction[cite: 2].
* **Command Validation Engine:** If a user attempts to run a sequential process out of order (e.g., executing `log-agent analyze` before `log-agent compress`), the terminal returns a graceful inline warning output instructing them on the required step[cite: 2].
* **History Preservation:** Pressing the Up/Down arrow keys recalls previously entered terminal commands within the session buffer[cite: 2].
