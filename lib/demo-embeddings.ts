// Offline embeddings for AI_DEMO_MODE (no AI Gateway key available).
//
// Feature hashing ("hashing trick"): every token and token bigram is hashed
// into one of 1536 buckets, weighted by log term frequency, then L2-normalised.
// Cosine similarity over these vectors is lexical similarity — not semantic —
// but it keeps the vector(1536) column, the HNSW index and searchLogs working
// with results that actually relate to the query.
//
// Kept dependency-free so scripts/embed-dummy.mjs can import it directly with
// `node --experimental-strip-types`.

export const DEMO_EMBEDDING_DIMS = 1536

// A few Spanish troubleshooting terms mapped to the English vocabulary used in
// the logs, so Spanish questions still land near the right chunks.
const SYNONYMS: Record<string, string[]> = {
  cae: ["crash"],
  caida: ["crash"],
  caido: ["crash"],
  reinicia: ["restart", "backoff"],
  reinicio: ["restart", "backoff"],
  reinicios: ["restart", "backoff"],
  falla: ["failed", "error"],
  fallo: ["failed", "error"],
  fallando: ["failed", "error"],
  errores: ["error"],
  permiso: ["permission", "denied", "authorized"],
  permisos: ["permission", "denied", "authorized"],
  denegado: ["denied", "accessdenied"],
  clave: ["key", "kms"],
  llave: ["key", "kms"],
  secreto: ["secret", "secrets"],
  descifrar: ["decrypt"],
  base: ["db", "database"],
  datos: ["db", "database"],
  politica: ["policy"],
  cambio: ["change", "put"],
  despliegue: ["deploy", "rollout"],
  memoria: ["memory", "oom"],
  lento: ["slow", "latency"],
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are", "was", "with", "by", "at", "from", "it",
  "el", "la", "los", "las", "de", "del", "que", "en", "y", "un", "una", "por", "para", "es", "se", "lo", "al", "como",
])

function normalizeToken(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

function tokenize(text: string): string[] {
  const raw = normalizeToken(text.toLowerCase()).match(/[a-z0-9]+/g) ?? []
  const out: string[] = []
  for (const t of raw) {
    if (t.length < 2 || STOPWORDS.has(t) || /^\d+$/.test(t)) continue
    out.push(t)
    for (const s of SYNONYMS[t] ?? []) out.push(s)
  }
  return out
}

// FNV-1a 32-bit.
function hash(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function demoEmbed(text: string): number[] {
  const tokens = tokenize(text)
  const features = new Map<string, number>()
  const add = (f: string, w: number) => features.set(f, (features.get(f) ?? 0) + w)
  for (let i = 0; i < tokens.length; i++) {
    add(tokens[i], 1)
    if (i > 0) add(`${tokens[i - 1]} ${tokens[i]}`, 0.5)
  }

  const vec = new Array<number>(DEMO_EMBEDDING_DIMS).fill(0)
  for (const [f, tf] of features) {
    const h = hash(f)
    const sign = h & 0x80000000 ? -1 : 1
    vec[h % DEMO_EMBEDDING_DIMS] += sign * (1 + Math.log(tf))
  }

  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  // pgvector returns NaN cosine distance for a zero vector; keep it non-zero.
  if (norm === 0) {
    vec[0] = 1
    return vec
  }
  return vec.map((v) => v / norm)
}
