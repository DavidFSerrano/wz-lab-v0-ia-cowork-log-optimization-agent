import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai"
import { z } from "zod"
import { promises as fs } from "node:fs"
import path from "node:path"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

const LOGS_DIR = path.join(process.cwd(), "logs")

// Guard against path traversal — only allow reading files inside LOGS_DIR.
function resolveLogPath(fileName: string) {
  const resolved = path.join(LOGS_DIR, fileName)
  if (resolved !== LOGS_DIR && !resolved.startsWith(LOGS_DIR + path.sep)) {
    throw new Error("Invalid log file path")
  }
  return resolved
}

const listLogFiles = tool({
  description:
    "List the log files available in the repository's logs folder. Use this first when the user asks about troubleshooting, incidents, pods, crashes, or errors so you know which logs exist.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const entries = await fs.readdir(LOGS_DIR)
      return { files: entries.filter((f) => !f.startsWith(".")) }
    } catch {
      return { files: [], note: "No logs directory found." }
    }
  },
})

const readLogFile = tool({
  description:
    "Read the full contents of a specific log file from the logs folder. Call this to inspect the actual log lines before diagnosing an issue. Always cite concrete evidence (error codes, exit codes, event reasons) from the file in your answer.",
  inputSchema: z.object({
    fileName: z
      .string()
      .describe("The exact file name to read, e.g. 'payment-service-describe.txt'. Get valid names from listLogFiles."),
  }),
  execute: async ({ fileName }) => {
    try {
      const content = await fs.readFile(resolveLogPath(fileName), "utf8")
      return { fileName, content }
    } catch {
      return { fileName, error: `Could not read '${fileName}'. Use listLogFiles to see valid names.` }
    }
  },
})

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: "openai/gpt-5.1-instant",
    system: [
      "You are an SRE assistant embedded in a team's tooling. You help engineers troubleshoot Kubernetes and infrastructure incidents.",
      "You have tools to inspect real log files stored in the repository's logs folder.",
      "When a user asks about troubleshooting, an incident, a crashing pod, errors, or anything that could be explained by the logs, ALWAYS call listLogFiles and then readLogFile to gather evidence before answering.",
      "Base your diagnosis strictly on what the logs actually show. Quote the specific evidence (exit codes, error codes like a Postgres SQLSTATE, event reasons, restart counts).",
      "Structure troubleshooting answers as: 1) Summary of the problem, 2) Evidence from the logs, 3) Root cause, 4) Concrete remediation steps (kubectl commands where helpful).",
      "If the logs do not contain relevant information, say so plainly instead of guessing. For general questions unrelated to the logs, answer normally and concisely.",
    ].join(" "),
    messages: await convertToModelMessages(messages),
    tools: { listLogFiles, readLogFile },
    stopWhen: stepCountIs(6),
  })

  return result.toUIMessageStreamResponse()
}
