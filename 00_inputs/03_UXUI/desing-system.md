# Design System & Interface Guide

## 1. Theme Configuration (Tailwind CSS Tokens)
To deliver an authentic, specialized developer workspace, the interface must strictly utilize a dark-mode terminal layout aesthetic. Avoid soft gradients or standard corporate pastel palettes.

* **Background Environment:** Pure Pitch Black (`#000000` / `bg-black`)
* **Surface Containers:** Dark Charcoal/Slate (`#09090b` to `#18181b` / `bg-zinc-950`, `bg-zinc-900`)
* **Primary Terminal Accent:** Matrix Green (`#22c55e` / `text-green-500`, `border-green-600`)
* **Warning System Accent:** Cyber Orange/Amber (`#f59e0b` / `text-amber-500`)
* **Alert System Accent:** Neon Red/Crimson (`#ef4444` / `text-red-500`)
* **Borders & Grid Grids:** Dark Slate Matte (`#27272a` / `border-zinc-800`)

## 2. Typography Hierarchy
* **Monospace Engine:** `JetBrains Mono`, `Fira Code`, or system monospace font arrays for metrics, code snippets, logs, and user prompt tokens.
* **Interface Text:** Sans-serif (`Inter`) for structural layout titles, buttons, and setting labels.

## 3. Component Configuration (shadcn/ui Mapping)
* **Sidebar Layout:** Left-anchored flexbox box container covering roughly 33% of browser layout width at standard 1440px desktop resolutions.
* **Cards (`/components/ui/card`):** High-contrast background outlines (`bg-zinc-950 border border-zinc-800`) to present telemetry.
* **Switch/Toggle (`/components/ui/switch`):** Used for managing the streaming network state. Emits green glow markers when active.
* **Chat Output Feed:** Monospace viewport with terminal-style rows (`[SYSTEM]`, `[LOGS]`, `[AI-AGENT]`) and an interactive inline text field.
