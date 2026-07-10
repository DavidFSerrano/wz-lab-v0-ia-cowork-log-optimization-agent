# Business Context: ExampleCorp Log-Optimization Engine

## 1. Company Overview
ExampleCorp is a modern, Kubernetes-centric Infrastructure-as-a-Service (IaaS) provider built natively on Amazon Elastic Kubernetes Service (EKS). ExampleCorp delivers fully managed, ultra-secure, and dynamically scalable EKS clusters seamlessly integrated with core AWS primitives. 

## 2. Core Problem & Product Vision
Modern cloud-native architectures generate petabytes of repetitive text-based log streams. Companies pay exorbitant ingestion costs to observability tools (e.g., Datadog, Splunk, AWS CloudWatch) for redundant boilerplate data (such as continuous UUID strings, health check messages, and repeating stack traces).

ExampleCorp is building a CLI-first log-optimization engine paired with an advanced, terminal-styled developer GUI. This tool acts as a local local-first filter:
1. It intercepts log streams (starting with Kubernetes standard out, expanding later to CloudWatch, CloudTrail, Traefik, and Istio).
2. It executes aggressive rule-based compression locally via regex parsing (stripping continuous structural duplicates, system noise, and boilerplate text).
3. It measures real-time data reduction and character-to-token translations.
4. It hands off the filtered log context directly to a localized multi-agent diagnostic chat loop for zero-latency root-cause analysis (RCA).

## 3. Targeted User Personas
* **DevOps & Site Reliability Engineers (SREs):** Need to debug critical failures (like CrashLoopBackOff states) without wading through millions of identical health-check frames, while keeping enterprise cloud egress fees at a absolute minimum.
* **Platform Engineers:** Responsible for optimizing overall monitoring infrastructure costs across enterprise clusters.

## 4. Prototype Scope (Vercel v0 Target)
* **IN:** A single-page, hyper-functional, developer-centric terminal workspace dashboard featuring a streaming sidebar dashboard on the left and an interactive multi-agent chat interface on the right.
* **IN:** Fully functional local simulation infrastructure (`mockLogService.ts`) providing realistic Kubernetes log streams, computing dynamic live telemetry, and providing rich markdown-formatted diagnostic responses inside the chat console.
* **OUT:** Active production Python system daemon integrations, multi-cluster config maps, authentication barriers.
