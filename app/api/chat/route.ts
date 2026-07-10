import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai"
import { z } from "zod"
import { searchLogs } from "@/lib/logs-pipeline"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

const searchLogsTool = tool({
  description:
    "Semantic search over the ingested log vector store (Kubernetes pod logs, Kubernetes events, and AWS CloudTrail/KMS/RDS logs). Returns the most relevant log chunks with their source and timestamp. Call this to gather evidence before diagnosing. You can call it multiple times with different queries, sources, or time windows to correlate events across systems.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Natural-language description of what you're looking for, e.g. 'why is the pod crashing' or 'KMS permission changes'."),
    source: z
      .enum(["k8s", "aws", "web"])
      .optional()
      .describe("Optionally restrict results to one source system."),
    service: z.string().optional().describe("Optionally restrict to a service name, e.g. 'orders-api'."),
    startTime: z
      .string()
      .optional()
      .describe("Optional ISO-8601 lower bound on event time, e.g. '2024-05-12T02:00:00Z'. Useful to correlate what changed before failures."),
    endTime: z.string().optional().describe("Optional ISO-8601 upper bound on event time."),
    limit: z.number().int().min(1).max(20).optional().describe("Max chunks to return (default 8)."),
  }),
  execute: async (args) => {
    try {
      const results = await searchLogs(args)
      return {
        count: results.length,
        results: results.map((r) => ({
          source: r.source,
          service: r.service,
          severity: r.severity,
          eventTime: r.event_time,
          content: r.content,
          relevance: Number((1 - r.distance).toFixed(3)),
        })),
      }
    } catch (err) {
      // Never throw from a tool — a tool-output-error corrupts the step
      // history for reasoning models. Return the error as data instead.
      const message = err instanceof Error ? err.message : String(err)
      console.log("[v0] searchLogs error:", message)
      return { count: 0, results: [], error: `Search failed: ${message}` }
    }
  },
})

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: "openai/gpt-5.1-instant",
    system: [
      "You are a senior SRE assistant embedded in a team's tooling. You help engineers troubleshoot Kubernetes and AWS infrastructure incidents.",
      "All logs live in a vector database (Kubernetes pod logs and describe output, Kubernetes events, and AWS CloudTrail/KMS/RDS logs). Use the searchLogs tool to retrieve relevant log chunks via semantic search.",
      "When a user asks about troubleshooting, an incident, a crashing pod, errors, or anything explainable by the logs, ALWAYS call searchLogs to gather evidence before answering. Run MULTIPLE searches with different queries and sources — the root cause usually requires correlating evidence across several systems. Do not stop after a single search.",
      "Correlate by timestamp. Build a timeline across the Kubernetes and AWS results and look for the change or trigger that precedes the failures. Use the startTime/endTime filters to find what changed just before the incident. A recent deploy, an autoscaler event, or transient connection timeouts are often red herrings — actively confirm or rule each one out using evidence.",
      "Base your diagnosis strictly on what the retrieved logs actually show. Quote specific evidence (exit codes, error codes, event reasons, restart counts, CloudTrail event names, IAM/role ARNs, timestamps).",
      "Structure troubleshooting answers as: 1) Summary of the problem, 2) Timeline of correlated evidence across the log sources, 3) Red herrings you ruled out and why, 4) Root cause, 5) Concrete remediation steps (kubectl / AWS CLI commands where helpful) and a prevention suggestion.",
      "If retrieval returns nothing relevant, say so plainly instead of guessing. For general questions unrelated to the logs, answer normally and concisely.",
    ].join(" "),
    messages: await convertToModelMessages(messages),
    tools: { searchLogs: searchLogsTool },
    stopWhen: stepCountIs(10),
  })

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error)
      console.log("[v0] chat stream error:", message)
      return message
    },
  })
}
