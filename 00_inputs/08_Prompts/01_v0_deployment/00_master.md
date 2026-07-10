We're going to build together a web application prototype called ExampleCorp Log Optimization Agent Terminal Simulator.

Before writing a single line of code, I want you to carefully read the attached context and specifications files:
- examplecorp-context.md - Business context: Who the client is, their problem, and the 3-step "Lean-In" sequence we want to demonstrate.
- cli-output-style.md - Design system: Exact ANSI-equivalent hex codes, strict monospace typography, custom ASCII art banners, component rules, and interaction constraints.

Project stack (do not change):
- Framework: Next.js with App Router
- Components: Pure React/Tailwind Console Layouts (Strictly NO shadcn/ui, floating sidebars, or default web dashboard tabs)
- Styles: Tailwind CSS following the terminal design specifications.
- Icons: lucide-react (integrated minimally inside terminal headers if needed)
- Data engine: Procedural in-memory AWS EKS pipeline simulator that streams multi-tenant JSON infrastructure loops (kubelet, kube-proxy, Prometheus noise vectors) and injects highly localized incident signals (checkout-service-v2 connection-pool exhaustion and cascading ingress-nginx 504 timeouts) into a rolling virtual state buffer, executing a local regex-based deduction processor to calculate real-time compression metrics.
- Deploy target: Vercel

Visual identity (apply without exception):
- Canvas Background: Slate (#1A1D21) encapsulating the entire full-screen viewport.
- Primary Active Text: White (#FFFFFF).
- Accent / Prompt Highlight: Violet (#8A3FFC).
- Muted Noise: Slate 500 (`#64748B`) for [INFO] markers.
- Warning Signal: Amber 600 (#D97706) for [WARN] markers.
- Success / Complete: Mint (#10B981) for optimization matrix blocks.
- Typography: Strict Monospace family (font-mono, JetBrains Mono, or Fira Code).

Collaboration rules:
1. If you have doubts - ask before executing. Do not assume.
2. Follow cli-output-style.md to the absolute letter.
3. Each prompt will be autonomous with its full context.
4. Do not generate UI functionality or modern layout components I haven't asked for.
5. Maintain strict, immersion-breaking-free visual consistency across all terminal workflow states.

The interactive terminal simulator tracks 3 distinct sequential command states triggered via CLI inputs:
1. Extract (log-agent extract): Triggers a high-speed vertical cascade animation of raw, noisy gray/yellow multi-tenant infrastructure text.
2. Compress (log-agent compress): Pauses the stream, spins a terminal progress bar, and prints the Log Footprint Reduction Matrix showing a 99.9% collapse (40MB → 40KB and 7M → 16k tokens).
3. Analyze (log-agent analyze): Clears the viewport, prints an custom ExampleCorp ASCII art header, and initiates an active cursor blinking prompt (examplecorp-agent > ) running a responsive, simulated Gemini SRE diagnostic text-streaming response loop.

Confirm you understood everything and give me a 5-point summary of what you're going to build. Do not generate code yet.
