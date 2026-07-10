# Design System & Interface Guide
# ExampleCorp — Log Ingestion & Optimization AI Agent

## 1. Theme: Cyberpunk Terminal Dark

The interface uses a deep-space dark theme with neon cyan and magenta accents, a drifting grid backdrop, and CRT scanline overlays. All surfaces are semi-transparent with backdrop blur. The aesthetic targets CLI-native SRE engineers — not a corporate dashboard.

## 2. Color Tokens (Tailwind v4 — defined in `globals.css` `@theme`)

| Token | Hex | Usage |
|---|---|---|
| `--color-background` | `#05060b` | Page root background |
| `--color-surface` | `#0c1018` | Card, header, panel backgrounds |
| `--color-surface-2` | `#131a26` | Elevated surface (input areas, code blocks) |
| `--color-border` | `#1f2b3d` | All borders, grid lines |
| `--color-foreground` | `#d6f7ff` | Primary text |
| `--color-muted` | `#6b8299` | Secondary text, labels, placeholders |
| `--color-accent` | `#00e5ff` | Primary neon cyan — CTAs, active nav, highlights |
| `--color-accent-foreground` | `#03121a` | Text on accent backgrounds |
| `--color-secondary` | `#ff2e97` | Neon magenta — secondary actions, ERROR severity |
| `--color-secondary-foreground` | `#1a0410` | Text on secondary backgrounds |
| `--color-alert` | `#ffb300` | Amber — WARN severity, caution states |
| `--color-alert-foreground` | `#1a1206` | Text on alert backgrounds |

## 3. Typography

| Role | Font | Tailwind class |
|---|---|---|
| Body / UI text | Geist (sans-serif) | `font-sans` |
| Code, logs, metrics, nav pills | Geist Mono (monospace) | `font-mono` |

- Body line-height: `leading-relaxed` (1.625)
- Minimum font size: 12px (`text-xs`)
- Navigation pills and button labels: `font-mono text-xs font-medium uppercase tracking-wider`

## 4. Global Background Effects

```css
/* Animated cyberpunk grid (40px tiles, diagonal drift) */
body::before — radial cyan/magenta glows + linear grid lines, animates grid-drift 16s

/* CRT scanlines */
body::after — repeating cyan scanlines, animates scanline 8s
```

Both animations respect `prefers-reduced-motion: reduce`.

## 5. Glow Utilities

```css
.glow-accent    — box-shadow: 0 0 12px -2px rgba(0,229,255,0.55)
.glow-secondary — box-shadow: 0 0 12px -2px rgba(255,46,151,0.55)
.text-glow-accent    — text-shadow: 0 0 8px rgba(0,229,255,0.65)
.text-glow-secondary — text-shadow: 0 0 8px rgba(255,46,151,0.60)
```

## 6. Layout

### Page Shell (all pages)
```
<div class="flex h-dvh flex-col">
  <header class="flex items-center justify-between border-b border-accent/20 bg-surface/60 px-4 py-3 backdrop-blur-sm">
    <!-- Left: logo badge + page title -->
    <!-- Right: page controls + <AppNav /> -->
  </header>
  <div class="flex-1 overflow-y-auto">
    <div class="mx-auto w-full max-w-5xl px-4 py-6">
      <!-- page content -->
    </div>
  </div>
</div>
```

### Header Logo Badge
```
<div class="glow-accent flex h-7 w-7 items-center justify-center rounded-lg border border-accent/60 bg-accent/10 font-mono text-xs font-bold text-accent">
  XX  ← 2-letter page identifier
</div>
```

### Page Title Pattern
```
<h1 class="text-glow-accent font-mono text-sm font-semibold uppercase tracking-[0.2em] text-accent">
  PAGE<span class="text-secondary text-glow-secondary">//</span>Name
</h1>
```

## 7. Navigation (`<AppNav />`)

All six links share the same pill style. Active link uses accent highlight.

**Inactive:**
```
rounded-lg border border-border px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-muted
hover: border-accent text-accent
```

**Active (current page):**
```
rounded-lg border border-accent/60 bg-accent/10 px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider text-accent
```

## 8. Button Spec (all page-level action buttons)

Same dimensions as nav pills:
```
rounded-lg border px-3 py-1 font-mono text-xs font-medium uppercase tracking-wider
```
- Default: `border-border text-muted hover:border-accent hover:text-accent`
- Primary CTA: `border-accent/50 bg-accent/10 text-accent hover:bg-accent/20 glow-accent`
- Destructive/Stop: `border-secondary/50 bg-secondary/10 text-secondary hover:bg-secondary/20 glow-secondary`

## 9. Severity Color Mapping

| Level | Color | Tailwind |
|---|---|---|
| INFO | Cyan | `text-accent` / `border-accent/30` |
| WARN | Amber | `text-alert` / `border-alert/30` |
| ERROR | Magenta | `text-secondary` / `border-secondary/30` |
| DEBUG | Muted | `text-muted` |

## 10. Scrollbar
```css
scrollbar-width: thin;
scrollbar-color: var(--color-accent) transparent;
```
