// One-time setup: create the `incidents` table that powers automatic
// incident detection. This is SEPARATE from the RAG pipeline — it only reads
// from `log_chunks` and writes here. Safe to run multiple times.
//
// Run: node --env-file-if-exists=/vercel/share/.env.project scripts/setup-incidents.mjs

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

async function main() {
  await sql`
    create table if not exists incidents (
      id            bigint generated always as identity primary key,
      signature     text unique not null,
      service       text,
      environment   text,
      sources       text[] not null default '{}',
      severity      text not null default 'warn',
      status        text not null default 'open',
      title         text not null,
      summary       text,
      error_count   integer not null default 0,
      warn_count    integer not null default 0,
      sample_log    text,
      first_seen    timestamptz not null default now(),
      last_seen     timestamptz not null default now(),
      created_at    timestamptz not null default now(),
      updated_at    timestamptz not null default now()
    )
  `
  await sql`
    create index if not exists incidents_status_last_seen_idx
      on incidents (status, last_seen desc)
  `
  console.log("[setup-incidents] incidents table ready")
}

main().catch((err) => {
  console.error("[setup-incidents] failed:", err)
  process.exit(1)
})
