// Runs once when the Next.js server starts.
// AI_DEMO_MODE=true swaps the AI Gateway for local, offline models (see lib/demo-ai.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.AI_DEMO_MODE === "true") {
    const { installDemoProvider } = await import("./lib/demo-ai")
    installDemoProvider()
  }
}
