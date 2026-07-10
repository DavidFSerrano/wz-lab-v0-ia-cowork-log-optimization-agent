import pg from "pg"

const sql = `
create extension if not exists vector;

create table if not exists log_chunks (
  id           bigserial primary key,
  source       text not null,
  service      text,
  environment  text,
  severity     text,
  event_time   timestamptz not null,
  occurrences  int not null default 1,
  first_seen   timestamptz,
  last_seen    timestamptz,
  content      text not null,
  embedding    vector(1536),
  created_at   timestamptz not null default now()
);

create index if not exists log_chunks_embedding_idx
  on log_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists log_chunks_meta_idx
  on log_chunks (service, environment, event_time);
`

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await client.connect()
await client.query(sql)
const { rows } = await client.query(
  "select count(*)::int as n from log_chunks",
)
console.log("[v0] schema ready. log_chunks rows:", rows[0].n)
await client.end()
