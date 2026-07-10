import { neon } from "@neondatabase/serverless"

// A single SQL tagged-template client backed by Neon's HTTP driver.
// Safe to use in serverless route handlers — no connection pool to manage.
export const sql = neon(process.env.DATABASE_URL!)

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
