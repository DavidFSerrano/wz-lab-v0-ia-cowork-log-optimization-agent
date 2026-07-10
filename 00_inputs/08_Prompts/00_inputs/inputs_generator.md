# Inputs Generator

## Attach files
Attach the file [inputs-guide.html](inputs-guide.html) to the LLM (Gemini, Claude, among others).

## Prompt

### About company
We are working for a company called ExampleCorp, which is a leading Kubernetes-centric Infrastructure-as-a-Service (IaaS) provider built on Amazon Elastic Kubernetes Service (EKS). They deliver fully managed EKS clusters seamlessly integrated with core AWS services.

We need to create a CLI-first log-optimization engine and a simple GUI for the analysis one - starting with Kubernetes logs and extending to sources like AWS CloudWatch, AWS CloudTrail, Traefik, and Istio - that applies local rule-based compression to slash log volume, then opens an interactive terminal chat loop for root-cause diagnostics.

### Log capture
The log capture will be feeded from an API endpoint which will generate an stream of real logs. This operation will run in background and must to show a connection status button in a small Dashboard in the main page. The endpoint configuration will be made through a yaml configuration file. In future versions the system will allow the configuration of multiple log sources and show an status button for everyone of them.

### Log capture & Compression (Production Architecture vs. Vercel v0 POC)
Production Architecture: The Python compression script runs as a local CLI daemon exposing a localhost FastAPI server. It deduplicates repetitive log signatures via regex pattern matching (e.g., stripping continuous UUIDs or timestamps) and calculates token savings assuming 1 token per 4 characters. The frontend consumes this via WebSockets/SSE.
Vercel v0 POC Architecture: Because Vercel v0 cannot run background Python daemons or connect to local unencrypted websockets, the POC must use a "Mock-First" approach. Please generate a Next.js/React mock service (mockLogService.ts) that uses React intervals to simulate the real-time background ingestion and compression of logs so the v0 UI is instantly interactive.

The main Dashboard must show a connection status button and metrics for:

1. Tokens earned/saved in the last hour.
2. Lines removed from logs.
3. Lines sent to the analysis endpoint.
4. The compression percentage ratio (Output vs Input).

### Analyzing Logs
The analysis endpoint will receive data in this format:

```shell
curl -X POST https://wz-lab-v0-ia-cowork-log-optimizatio.vercel.app/api/ingest \
  -H "x-log-source: k8s" \
  -H "x-log-service: orders-api" \
  -H "Content-Type: application/json" \
  --data '{"timestamp": "2026-07-10T13:55:36Z", "level": "ERROR", "message": "CrashLoopBackOff in pod orders-api-5f8b9", "compressed": true}'
```

### Main Dashboard UX/UI
We want to create a small Dashboard in the main page with a strict dark-mode/terminal aesthetic using Tailwind CSS and shadcn/ui.
Component Breakdown:

    Sidebar/Left: Metric cards for 'Tokens Saved (Hourly)', 'Lines Stripped', 'Compression Ratio', and an active connection status toggle.

    Main/Right: A terminal-styled chat interface capable of rendering markdown diagnostic reports from the multi-agent backend (including sections for Incident Summary, Root Cause Analysis, and Remediation).

### Other considerations
We currently do not have any repos so we will not work with any git repos and we can start discussing the features. Ensure the UI components function autonomously using the simulated data streams for the v0 preview.

### Output
Using the exact instructions, structure, and formatting guidelines provided in the attached inputs-guide.html file, I need you to create a set of folders with the corresponding files inside, required to feed the Vercel v0 app, and create a POC with the best practices in mind. The set of folders are the following:

- 01_Context
- 02_BRD_PRD_Specs
- 03_UXUI
- 04_Data_Sources
- 05_APIs
- 06_Features
