import { neon, type NeonQueryFunction } from "@neondatabase/serverless"

// Lazy singleton — only created when DATABASE_URL is present.
// This prevents the module from throwing at import time during dev
// when the env var is not yet set (e.g. before Neon integration is connected).
let _sql: NeonQueryFunction<false, false> | null = null

export function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set. Connect the Neon integration in your project settings.")
    }
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

// Keep the named export for backwards compat with existing callers,
// but make it a proxy that defers initialization until first call.
export const sql: NeonQueryFunction<false, false> = new Proxy({} as NeonQueryFunction<false, false>, {
  apply(_t, _this, args) {
    return (getSql() as unknown as (...a: unknown[]) => unknown)(...args)
  },
  get(_t, prop) {
    return (getSql() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

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
