# Features — ExampleCorp Log Optimization Agent Prototype

> Scope: Full-screen interactive Terminal Simulator. The goal is to impress technically, demonstrate a 99.9% footprint reduction, and run an AI-assisted diagnostic loop to close the deal in minutes.

---

## P0 — Must be in the demo (non-negotiable)

These features form the backbone of the "Lean-In" animation sequence required to prove the core business value to technical stakeholders[cite: 1, 2].

| # | Feature | Description | State / Command Trigger |
|---|---|---|---|
| **F1** | **Interactive Terminal Canvas** | Full-screen console interface with keyboard auto-focus, terminal layout, and an active blinking cursor (`_`)[cite: 1, 2]. | Global / Canvas Mount |
| **F2** | **ExampleCorp SRE Branding** | Strict application of corporate style: Slate (`#1A1D21`) background, Monospaced text, and Violet/Mint accents[cite: 1, 2, 4]. | Global / CSS Layout |
| **F3** | **The Avalanche (Log Extraction)** | Rapid vertical cascade animation of noisy raw multi-tenant logs (`[INFO]` in gray, `[WARN]` in yellow)[cite: 1, 2, 3]. | `log-agent extract`[cite: 1, 2, 3] |
| **F4** | **The Collapse (Deduplication UI)** | Pauses log streaming, showcases a terminal loading progress bar, and renders the Log Footprint Reduction Matrix[cite: 1, 2, 4]. | `log-agent compress`[cite: 1, 2, 3] |
| **F5** | **Metrics Animation** | Rapid counter countdown demonstrating a 99.9% reduction in data footprint (**40MB → 40KB**) and token usage (**7M → 16k**)[cite: 1, 2, 3]. | Driven by `log-agent compress`[cite: 1, 2, 3] |
| **F6** | **The Handshake (AI Shell)** | Renders the custom ExampleCorp ASCII art header and establishes a simulated connection to the Gemini API pipeline[cite: 1, 2, 3]. | `log-agent analyze`[cite: 1, 2, 3] |
| **F7** | **Streaming Diagnostics** | SRE Agent progressively streams character outputs outlining the root cause (`checkout-service-v2` connection pool failure at `14:02:11 UTC`)[cite: 1, 2, 3, 4]. | Prompt matching in `log-agent analyze`[cite: 2, 3] |

---

## P1 — Highly desirable (adds WOW factor)

These capabilities make the prototype feel like a fully integrated production utility rather than a simple static mockup.

| # | Feature | Description | Technical Component |
|---|---|---|---|
| **F8** | **Command Validation Engine** | Prevents out-of-sequence execution. If a user runs `analyze` before `compress`, it safely prints a helpful workflow warning[cite: 2, 4]. | Command sequence gatekeeper |
| **F9** | **Native Shell Utilities** | Support for standard operational commands: `help` (lists system options) and `clear` (wipes terminal buffer layout)[cite: 2, 4]. | Input interceptor loop |
| **F10** | **Cascading Error Prompts** | Expanded interactive prompt mapping. If a user asks *"Why the 504 timeouts?"*, the agent specifically links the DB crash to `ingress-nginx` latency[cite: 2, 3, 4]. | AI Response Mock Router |

---

## P2 — Nice to have (if time allows)

Polished extras that satisfy seasoned SRE engineers checking for true CLI authenticity[cite: 2, 4].

| # | Feature | Description |
|---|---|---|
| **F11** | **Command History Buffer** | Pressing the Up/Down arrow keys recalls previously executed terminal commands[cite: 2, 4]. |
| **F12** | **Dynamic Input Auto-Focus** | Clicking anywhere on the screen canvas immediately triggers client-side window focus back to the active line input[cite: 2, 4]. |
| **F13** | **Simulated Connection Glitch** | A rare terminal alert or retry delay sequence before the Gemini handshake finishes, emphasizing real-world local infrastructure constraints. |

---

## Demo Notes

* **No Web SaaS Dashboards:** Ensure there are no floating charts, standard sidebars, or modern web buttons. The experience must live 100% inside the terminal canvas[cite: 1, 2, 3].
* **Pre-Configured Scripting:** Have the test commands ready to copy-paste or pre-populate to ensure smooth timing during the live demo.
* **Objection Handling Framework:** If leadership asks about connecting live infrastructure:
  > *"Today this runs in a sandboxed simulator using an in-memory stream, but the architecture is explicitly designed to integrate natively with your live AWS CloudWatch log groups in Phase 2[cite: 1, 2]."*