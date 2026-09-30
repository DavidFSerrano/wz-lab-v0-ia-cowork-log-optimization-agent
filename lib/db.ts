import { Pool, types } from "pg"

// pg returns int8/bigint (e.g. bigserial ids, count(*)) as strings by default.
// Our ids stay well below 2^53, so parse them as JS numbers.
types.setTypeParser(types.builtins.INT8, (v) => Number(v))

const globalForPg = globalThis as unknown as {
  pool: Pool | undefined
}

export const pool =
  globalForPg.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  })

if (process.env.NODE_ENV !== "production") {
  globalForPg.pool = pool
}

export type RetrievedChunk = {
  id: number
  source: string
  service: string | null
  environment: string | null
  severity: string | null
  event_time: string
  content: string
  distance: number
}
