# Role & Intent
You are an expert Frontend Engineer building a full-screen, high-fidelity Terminal Simulator prototype for ExampleCorp. Your objective in this first step is to establish the global UI canvas framework, hidden input capture, basic shell mechanics, and sequential state verification gates.

# Context & Visual Identity (Strict Enforcement)
- Canvas Background: Slate (`#1A1D21`) filling 100% of the viewport.
- Primary Active Text: White (`#FFFFFF`).
- Accent/Prompt Highlight: Violet (`#8A3FFC`).
- Typography: Strict Monospace (`font-mono`, Inter, Fira Code, or JetBrains Mono).
- Structure: Strictly NO modern UI dashboards, buttons, floating cards, sidebars, or standard web form inputs outside of the terminal buffer text area.

# Required Features & Functionality

## 1. Interactive Canvas Constraints
- **Auto-Focus Anchor:** Clicking anywhere on the screen layout forces client-side focus back onto a hidden active text input element.
- **Blinking Cursor Element:** The active insertion character `_` must rely on an infinite pulse animation (`animate-pulse`).
- **Prompt Buffer Control:** Standard shell utilities `help` (lists all system commands) and `clear` (wipes the screen history buffer layout natively) must function properly.
- **History Preservation:** Pressing the Up/Down arrow keys recalls previously entered terminal commands within the session buffer.

## 2. Command Validation Engine (State Guardrail)
The simulator tracks 4 distinct sequential command states triggered via CLI inputs: `IDLE`, `EXTRACTING`, `COMPRESSED`, and `ANALYZING`. 
Implement an evaluation gate loop:
- If a user attempts to run a sequential process out of order (e.g., executing `log-agent compress` or `log-agent analyze` while state is `IDLE`), the terminal must bypass execution and return a graceful inline warning output instructing them on the required step:
  - *"❌ SEQUENCE ERROR: Action denied. Run tracking sequence first: 1. log-agent extract -> 2. log-agent compress"*

# Command Shell Output Triggers (Stubs for Step 1)
- `help`: Print a clean list of tool features and sequential pipeline rules.
- `clear`: Reset the terminal screen output array.
- `log-agent extract`: Print a message acknowledging input and change system state to `EXTRACTING`.
- `log-agent compress`: (If state is `EXTRACTING`) Print a confirmation message and change system state to `COMPRESSED`.
- `log-agent analyze`: (If state is `COMPRESSED`) Print a confirmation message and change system state to `ANALYZING`.

Build out this rigid terminal foundation completely using React hooks for state arrays and scroll-to-bottom management before moving on to specific feature animations.
