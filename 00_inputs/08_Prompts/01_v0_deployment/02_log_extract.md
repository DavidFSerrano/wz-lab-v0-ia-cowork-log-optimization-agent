# Role & Intent
You are an expert Frontend Engineer building a full-screen, high-fidelity Terminal Simulator prototype for ExampleCorp. 
Your objective in this step is to implement the execution loop for the first core CLI command: `log-agent extract`.

# Context & Visual Identity (Strict Enforcement)
- Canvas Background: Slate (`#1A1D21`) filling 100% of the viewport.
- Primary Active Text: White (`#FFFFFF`).
- Accent/Prompt Highlight: Violet (`#8A3FFC`).
- Typography: Strict Monospace (`font-mono`).
- No modern UI buttons, floating cards, or structural SaaS elements outside of the terminal text buffer.

# The Task: Implement `log-agent extract` ("The Avalanche")
When the user submits `log-agent extract`, you must trigger an active, continuous, high-speed vertical cascade animation of raw EKS logs streaming down the viewport.

## 1. The Mock Data Engine (In-Memory Generation)
Create a continuous generator loop that simulates a dense, multi-tenant Kubernetes environment containing:
- **99.9% Background Noise:** Highly repetitive system loops:
  - `[INFO] kubelet SyncLoop: container runtime status healthy`
  - `[INFO] kube-proxy IPVS keep-alive routing tables synchronized`
  - `[WARN] prometheus metrics scraper: GET /metrics completed with latency 14.2ms`
- **0.1% The Targeted Error Signal:** Intermittently bury critical incident indicators into the stream:
  - `[CRITICAL] checkout-service-v2-7f9db: PostgreSQL connection pool capacity fully saturated (Active: 100/100) at 14:02:11 UTC`
  - `[WARN] ingress-nginx: upstream response latency spike -> edge routing failure`
  - `[ERROR] ingress-nginx: 504 Gateway Timeout on upstream dependency path /api/v2/checkout`

## 2. Animation & Color System Rules
- **Color Formatting (Strict Mapping):**
  - Text markers starting with `[INFO]` must be rendered in terminal gray/muted Slate-500 (`#64748B`).
  - Text markers starting with `[WARN]` must be rendered in terminal yellow/Amber-600 (`#D97706`).
  - Errors or Critical markers must be highlighted in prominent red text.
- **Speed & Control:**
  - The logs must scroll rapidly down the terminal canvas buffer using a high-frequency interval timer or `requestAnimationFrame` to feel like an "avalanche" of data.
  - Ensure the layout remains anchored to the bottom, pushing old log lines off the top of the viewport cleanly.
  - The CLI prompt input line must show an active spinner state or a tracking notification indicator `[EXTRACTING LOG DATA... PRESS ENTER OR CLEAR TO HALT]` while the cascade runs.
  - If the user presses `Enter` or inputs `clear`, gracefully break the streaming loops and allow them to execute sequential operations.

# State Machine Integrity
Ensure that entering this state sets the internal system status from `IDLE` to `EXTRACTING`, unblocking the `log-agent compress` parameter pipeline for future steps.

Do not build the summary cards or chat layout elements yet. Focus purely on a high-performance, visually accurate log animation stream integrated directly into our Prompt 1 codebase framework.
