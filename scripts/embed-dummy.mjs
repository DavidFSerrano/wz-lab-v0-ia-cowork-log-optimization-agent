// Replace the random embeddings written by scripts/seed-dummy.sql so searchLogs
// returns chunks related to the query. Only touches rows in log_chunks; safe to re-run.
//
//   AI_DEMO_MODE=true -> local hashed embeddings (lib/demo-embeddings.ts), no key needed.
//                        Must match what the app uses at query time in demo mode.
//   otherwise         -> the pipeline's real model through the AI Gateway
//                        (requires AI_GATEWAY_API_KEY).
//
// Run: node --experimental-strip-types --env-file=.env.local scripts/embed-dummy.mjs

import { embedMany } from "ai"
import pg from "pg"

// Must match EMBEDDING_MODEL in lib/logs-pipeline.ts (vector(1536)).
const EMBEDDING_MODEL = "openai/text-embedding-3-small"
const BATCH = 50

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const demo = process.env.AI_DEMO_MODE === "true"
  if (!demo && !process.env.AI_GATEWAY_API_KEY) {
    throw new Error("AI_GATEWAY_API_KEY is not set (or set AI_DEMO_MODE=true for local embeddings)")
  }
  const { demoEmbed } = demo ? await import("../lib/demo-embeddings.ts") : {}

  const { rows } = await pool.query("select id, content from log_chunks order by id")
  console.log(`[embed-dummy] re-embedding ${rows.length} chunks with ${demo ? "local demo embeddings" : EMBEDDING_MODEL}`)

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const values = batch.map((r) => r.content)
    const { embeddings } = demo
      ? { embeddings: values.map(demoEmbed) }
      : await embedMany({ model: EMBEDDING_MODEL, values })

    for (let j = 0; j < batch.length; j++) {
      await pool.query("update log_chunks set embedding = $1::vector where id = $2", [
        `[${embeddings[j].join(",")}]`,
        batch[j].id,
      ])
    }
    console.log(`[embed-dummy] ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
  }
}

main()
  .catch((err) => {
    console.error("[embed-dummy] failed:", err.message ?? err)
    process.exitCode = 1
  })
  .finally(() => pool.end())
