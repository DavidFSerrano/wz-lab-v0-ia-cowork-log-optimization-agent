// One-time setup: create the `incidents` table that powers automatic
// incident detection. This is SEPARATE from the RAG pipeline — it only reads
// from `log_chunks` and writes here. Safe to run multiple times.
//
// Run: node --env-file-if-exists=/vercel/share/.env.project scripts/setup-incidents.mjs
// One-time setup: create the incidents table.
// Uses the local PostgreSQL database via pg.

import pg from "pg"

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function main() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        signature     text UNIQUE NOT NULL,
        service       text,
        environment   text,
        sources       text[] NOT NULL DEFAULT '{}',
        severity      text NOT NULL DEFAULT 'warn',
        status        text NOT NULL DEFAULT 'open',
        title         text NOT NULL,
        summary       text,
        error_count   integer NOT NULL DEFAULT 0,
        warn_count    integer NOT NULL DEFAULT 0,
        sample_log    text,
        first_seen    timestamptz NOT NULL DEFAULT now(),
        last_seen     timestamptz NOT NULL DEFAULT now(),
        created_at    timestamptz NOT NULL DEFAULT now(),
        updated_at    timestamptz NOT NULL DEFAULT now()
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS incidents_status_last_seen_idx
      ON incidents (status, last_seen DESC)
    `)

    console.log("[setup-incidents] incidents table ready")
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error("[setup-incidents] failed:", err)
  process.exitCode = 1
})