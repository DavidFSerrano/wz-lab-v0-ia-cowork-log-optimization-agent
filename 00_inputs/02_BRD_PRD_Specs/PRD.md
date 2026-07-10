# Product Requirements Document (PRD)

## 1. Functional Specifications

### A. Background Ingestion Stream & Toggle
* The system reads ingestion source rules from an internal configuration schema.
* An active connection toggle status indicator must be prominently displayed.
* When toggled ON, a continuous loop pushes uncompressed mock logs through a simulated parsing mechanism, updating core state arrays in memory.
* When toggled OFF, streaming metrics freeze entirely.

### B. Core Telemetry Calculations
The engine measures data footprints using the following structural invariants:
* **Token Logic:** Evaluated on the industry standard sizing of 1 token per 4 raw text characters.
* **Lines Removed:** Total line count matching compression criteria (e.g., repeating health checks or redundant UUID parameters).
* **Lines Sent:** High-signal lines surviving compression filters and sent downstream to the ingestion endpoint.
* **Compression Ratio:** Evaluated as a percentage: `(Compressed Character Count / Raw Character Count) * 100`. A lower percentage implies higher efficiency.

### C. Analysis Payload Verification
Every log forwarded to the backend analysis endpoint must adhere strictly to the target integration structure:
* Method: `POST`
* Headers: `x-log-source`, `x-log-service`, `Content-Type: application/json`
* JSON Object Body: `timestamp`, `level`, `message`, `compressed`

### D. Interactive Diagnostic Chat Workspace
* Designed to mimic standard terminal chat systems.
* Displays automated system diagnostic signals triggered by errors in the log stream (e.g., `orders-api-5f8b9` entering a `CrashLoopBackOff` state).
* Renders rich Markdown outputs with separate structural containers for Incident Summary, Root Cause Analysis, and Remediation steps.

## 2. Technical Scope & Architecture Layout
```text
[ Next.js View Context / Dashboard Pane ]
                /                                         \
  [ Left Column: Metric Cards ]             [ Right Column: Chat Interface ]
  - Tokens Earned/Saved (Hourly)            - Log Source Terminal Console
  - Lines Removed / Lines Sent              - Markdown Telemetry Outputs
  - Compression Ratio Display               - Multi-Agent RCA Prompt Interface
  - Connection Status Toggle
                ^                                         ^
                |                                         |
                +---------- (State Ingestion Loop) -------+
                                     |
                        [ mockLogService.ts Engine ]
                        - YAML Configuration Parsing
                        - Interval Generators & RegEx Filters
```