import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import pg from "pg"

const PORT = process.env.DEV_PORT || "3000"
const BASE = process.env.SEED_BASE_URL || `http://localhost:${PORT}`
const LOGS_DIR = path.join(process.cwd(), "logs")

// Map a log filename to its source system + metadata.
function classify(fileName) {
  const source = fileName.startsWith("aws-") ? "aws" : "k8s"
  return { source, service: "orders-api", environment: "prod" }
}

async function main() {
  // 1. Reset the vector table so re-runs don't create duplicates.
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  await client.query("truncate table log_chunks restart identity")
  console.log("[v0] cleared log_chunks")
  await client.end()

  // 2. Send each log file through the ingestion API.
  const files = (await readdir(LOGS_DIR)).filter((f) => !f.startsWith("."))
  let total = 0
  for (const file of files) {
    const raw = await readFile(path.join(LOGS_DIR, file), "utf8")
    const meta = classify(file)
    const res = await fetch(`${BASE}/api/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ document: { ...meta, raw } }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.log(`[v0] FAILED ${file}:`, data)
      continue
    }
    total += data.chunks
    console.log(`[v0] ingested ${file} (${meta.source}) -> ${data.chunks} chunks`)
  }
  console.log(`[v0] done. ${total} chunks embedded into the vector store.`)
}

main().catch((err) => {
  console.log("[v0] seed error:", err)
  process.exit(1)
})
