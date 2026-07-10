Create a highly polished, full-screen interactive Terminal Simulator for the "ExampleCorp Log Optimization Agent" using Next.js, React, Tailwind CSS, and Lucide React icons. The application must look, feel, and behave exactly like an authentic technical CLI tool running inside a browser sandbox, completely avoiding standard SaaS sidebars, floating dashboard charts, or web buttons.

---

### 1. DESIGN & BRANDING SYSTEM
- **Canvas Background:** Strict Slate (`#1A1D21`). The entire viewport must be encapsulated in this theme.
- **Typography:** Strict Monospace family (e.g., `font-mono`, JetBrains Mono, or Fira Code).
- **Color Palette (ANSI Equivalent Mapping):**
  - Primary / Active Text: White (`#FFFFFF`)
  - Muted System Noise: Slate 500 (`#64748B`)
  - Warning / Alert Signal: Amber 600 (`#D97706`)
  - Accent Prompt Highlight: Violet (`#8A3FFC`)
  - Success / Complete Mint: Mint/Green (`#10B981`)
- **Header Asset:** Render an elegant terminal header showing the ExampleCorp brand title text. Include a subtle stylized geometric ASCII layout mimicking the brand logo (`../ExampleCorp_Logo.png`) alongside the text "ExampleCorp Log Optimization Agent".

---

### 2. CORE TERMINAL INTERACTIVE ENGINE
- **Auto-Focus Anchor:** Clicking anywhere on the layout must immediately trigger client-side window focus back onto the active command line input.
- **Blinking Cursor:** The active insertion prompt character `_` must utilize a continuous pulse animation (`animate-pulse`).
- **History Preservation:** Implement an inline state history buffer. Pressing the `Up` and `Down` arrow keys must recall previously entered shell commands during the active session.
- **Native Shell Utilities:** - `help`: Clear printout listing usage guidelines and valid sequential tools.
  - `clear`: Instantly flushes the active screen buffer layout, maintaining system state flags.

---

### 3. THE SEQUENTIAL WORKFLOW (THE "LEAN-IN" TIMELINE)
Implement a state-machine that tracks user progress to enforce workflow realism. If a user runs sequential utilities out of order (e.g., executing `log-agent analyze` before `log-agent compress`), output a graceful ANSI yellow inline alert warning explaining the required dependency.

#### STATE 1 — THE AVALANCHE: `log-agent extract`
- Triggers a high-speed, vertical streaming cascade of raw multi-tenant EKS logs rolling down the terminal viewport.
- **Formatting Rules:** Output `[INFO]` markers in terminal gray (`#64748B`) and `[WARN]` markers in amber (`#D97706`).
- **Data Content:** The stream must continuously output redundant infrastructure chatter at a massive rate, representing 99.9% background system loop noise (e.g., `kubelet SyncLoops keeping containers active`, `kube-proxy IPVS keep-alive table syncs`, and `Prometheus scrapers fetching /metrics every 15s`).

#### STATE 2 — THE COLLAPSE: `log-agent compress`
- Halts the scrolling log stream instantly and displays a loading text progress bar: `[████████████████████████████████████████] 100% Optimization Complete`.
- After a short animation delay, render a clean structural Markdown/ASCII table tracking data reduction:
  ┌────────────────────────────────────────────────────────────────────────┐
  │                      LOG FOOTPRINT REDUCTION MATRIX                    │
  ├──────────────────────┬──────────────────┬──────────────────┬───────────┤
  │ METRIC TRACKER       │ ORIGINAL VOLUME  │ COMPRESSED TARGET│ REDUCTION │
  ├──────────────────────┼──────────────────┼──────────────────┼───────────┤
  │ Data Log Size        │ 40.00 MB         │ 40.00 KB         │ 99.90%    │
  │ LLM Context Tokens   │ 7,000,000 tx     │ 16,000 tx        │ 99.77%    │
  └──────────────────────┴──────────────────┴──────────────────┴───────────┘
- Print a mint-colored success block below it: `✔ Stripped 6,984,000 redundant Kubelet SyncLoops and Prometheus noise vectors.`

#### STATE 3 — THE HANDSHAKE & AGENT: `log-agent analyze`
- Completely clears the working area or appends an authentic welcome block containing this exact high-fidelity ASCII Art banner:
    _____                             _  _____                
   |  ___|                           | |/  __ \               
   | |__  __  __ __ _ _ __ ___  _ __ | | /  \/ ___  _ __ _ __ 
   |  __| \ \/ // _` | '_ ` _ \| '_ \| | |    / _ \| '__| '_ \
   | |___  >  <| (_| | | | | | | |_) | | \__/\ (_) | |  | |_) |
   \____/ /_/\_\\__,_|_| |_| |_| .__/|_|\____/\___/|_|  | .__/ 
                               | |                      | |    
                               |_|                      |_|    
- Followed by:
  `📡 CONNECTION STATUS: SECURE LOCAL PIPELINE VIA GEMINI API`
  `🧠 CONTEXT: 16,000 Optimized Tokens Loaded Successfully.`
- The user prompt indicator permanently changes to: `examplecorp-agent > `

---

### 4. SIMULATED AI DIAGNOSTIC SYSTEM
When the terminal is in `log-agent analyze` mode, capture user text inputs and stream characters back sequentially to simulate realistic API responses. Code the following exact response routes:

1. **Query:** "What caused the checkout failure?" or "Status check"
   - **Response:** Stream back a technical breakdown pointing directly to an isolated database layer exhaustion:
     - Root Cause: Timestamp `14:02:11 UTC` in service `checkout-service-v2`. PostgreSQL connection pool capacity fully saturated (Max 100/100 connections active).
     - Cascading Upstream Impacts: Pod `checkout-service-v2-7f9db` threw `500 Internal Server Error`.

2. **Query:** "Show cascading errors" or "Why the 504 timeouts?"
   - **Response:** Stream back an infrastructure explanation:
     - Edge controller `ingress-nginx` registered sudden response latency spikes caused by the downstream `checkout-service-v2` crash, triggering automated upstream `504 Gateway Timeouts`.

3. **Fallback Query:** For any other inquiry, return an intelligent SRE agent line reminding the engineer that the cluster data highlights a critical DB connection exhaustion in `checkout-service-v2` at `14:02:11 UTC` causing cascading 504 errors on `ingress-nginx`.

Provide an exceptionally clean, responsive, and robust single-component or clean modular interface file ready to run out-of-the-box in the v0 preview environment.
