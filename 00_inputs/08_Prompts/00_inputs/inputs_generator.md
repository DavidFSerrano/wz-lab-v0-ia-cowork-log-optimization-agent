# Inputs Generator

## Attach files
Attach the file [inputs-guide.html](inputs-guide.html) to the LLM (Gemini, Claude, among others).

## Prompt

### About company
We are working for a company called ExampleCorp, which is a leading Kubernetes-centric Infrastructure-as-a-Service (IaaS) provider built on Amazon Elastic Kubernetes Service (EKS). They deliver fully managed EKS clusters seamlessly integrated with core AWS services.

We need to create a CLI-first log-optimization engine and a simple GUI for the analysis one - starting with Kubernetes logs and extending to sources like AWS CloudWatch, AWS CloudTrail, Traefik, and Istio - that applies local rule-based compression to slash log volume, then opens an interactive terminal chat loop for root-cause diagnostics.

### Log capture
The log capture will be feeded from an API endpoint which will generate an stream of real logs. This operation will run in background and must to show a connection status button in a small Dashboard in the main page. The endpoint configuration will be made through a yaml configuration file. In future versions the system will allow the configuration of multiple log sources and show an status button for everyone of them.

### Log Compression
The log compression will be carried-out in background, through a Python script with libraries suitable to incredibly reduce the unnecessary or duplicated information in the logs, curating the information sent to the LLM for analysis. This process must to show in the small Dashboard in the main page the amount of tokens earned in the last hour, the amount of lines removed from logs and the amount of lines sent to the analysis endpoint located at POST /api/ingest. During the creation of the script for compressing, report the percentage of compression get in the output versus the captured in the input and the estimated amount of tokens earned.

Architecture Model: The Python compression script runs as a local CLI daemon exposing a localhost FastAPI server. The Vercel v0 app will act as the frontend, consuming this local API via WebSockets/SSE for real-time dashboard updates.

Compression Logic: Deduplication of repetitive log signatures via regex pattern matching, calculating token savings assuming 1 token per 4 characters.

### Analyzing Logs
Some information about the analyzing API is here:

```shell
curl -X POST https://wz-lab-v0-ia-cowork-log-optimizatio.vercel.app/api/ingest \
  -H "x-log-source: k8s" \
  -H "x-log-service: orders-api" \
  --data "your raw log line here"
```

### Main Dashboard
We want to create a small Dashboard in the main page with the information obtained from the capture and compression backend tasks and insert the multi-agent chat window in the right side to allow the agent interaction with the analysis tool.

Component Breakdown (UX/UI): 
   - Sidebar/Left: Metric cards for 'Tokens Saved (Hourly)', 'Lines Stripped', and an active connection status toggle.
   - Main/Right: A terminal-styled chat interface capable of rendering markdown diagnostic reports from the multi-agent backend.

### Other considerations
We currently do not have any repos so we will not work with any git repos and we can  start discussing the features.

### Output generation
I need you create a set of folders with the corresponding files inside, required to feed the Vercel v0 app, and create a POC with the best practices in mind, using the instructions in the inputs-guide.html attached file. The set of folders are the following:
 - 01_Context
 - 02_BRD_PRD_Specs
 - 03_UXUI
 - 04_Data_Sources
 - 05_APIs
 - 06_Features

For the code artifacts targeted at Vercel v0, generate modular React components using TypeScript, Tailwind CSS, and shadcn/ui structures. Ensure all background Python/FastAPI interactions are abstracted into a mock data service file (`/services/mockLogService.ts`) so the UI component states function autonomously in the v0 preview environment.