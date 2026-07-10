# Role & Intent
You are an expert Frontend Engineer building a full-screen, high-fidelity Terminal Simulator prototype for ExampleCorp. Your objective in this step is to build out the structural collapse animation triggered by the `log-agent compress` command.

# Context & Visual Identity (Strict Enforcement)
- Canvas Background: Slate (`#1A1D21`).
- Muted Data/Noise: Slate-500 (`#64748B`).
- Success/Mint Highlights: `#10B981` (used for the progress bar and reduction rates).
- Typography: Strict Monospace (`font-mono`).

# The Task: Implement `log-agent compress` ("The Collapse")
When the user types `log-agent compress` (valid only if the current state is `EXTRACTING`), the rapid log cascade animation must freeze instantly. The console will clear or append a high-impact deduplication matrix showing a 99.9% footprint reduction.

## 1. The Animation UI Timeline
1. **The Interception:** Pause the log stream cascade. Display a localized terminal loader loop: `[ RUNNING LOCAL DEDUPLICATION PIPELINE ]`.
2. **Progress Bar:** Render an authentic terminal progress bar that animates from 0% to 100% using block characters: `[████████████████████████████████████████] 100% Optimization Complete`. Make this color Mint (`#10B981`).
3. **The Matrix Draw:** Output a perfectly aligned ASCII matrix structure tracking data reduction metrics.

## 2. Metrics Frame Countdown (The WOW Moment)
Inside the drawn matrix, numerical text counters must rapidly decrement from their original values to their compressed targets within **2.5 seconds** using smooth interval frame updates:
- **Data Log Size:** 40.00 MB → 40.00 KB (99.90% Reduction)
- **LLM Context Tokens:** 7,000,000 tx → 16,000 tx (99.77% Reduction)

## 3. Strict Layout Blueprint
Render the final layout block exactly according to this text structure:
```text
┌────────────────────────────────────────────────────────────────────────┐
│                      LOG FOOTPRINT REDUCTION MATRIX                    │
├──────────────────────┬──────────────────┬──────────────────┬───────────┤
│ METRIC TRACKER       │ ORIGINAL VOLUME  │ COMPRESSED TARGET│ REDUCTION │
├──────────────────────┼──────────────────┼──────────────────┼───────────┤
│ Data Log Size        │ 40.00 MB         │ 40.00 KB         │ 99.90%    │
│ LLM Context Tokens   │ 7,000,000 tx     │ 16,000 tx        │ 99.77%    │
└──────────────────────┴──────────────────┴──────────────────┴───────────┘
✔ Stripped 6,984,000 redundant Kubelet SyncLoops and Prometheus noise vectors.
