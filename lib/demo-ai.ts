// AI_DEMO_MODE: run the whole app without an AI Gateway key.
//
// Registers a global AI SDK provider (globalThis.AI_SDK_DEFAULT_PROVIDER) that
// answers the same model ids the app already uses, so no pipeline file changes:
//   - "openai/text-embedding-3-small" -> local hashed embeddings (demo-embeddings.ts)
//   - "openai/gpt-5.1-instant"        -> a rule-based "SRE" model that really
//     calls the searchLogs tool, then writes a diagnosis from the retrieved logs.
//
// Enabled from instrumentation.ts only when AI_DEMO_MODE=true.

import { customProvider } from "ai"
import type {
  EmbeddingModelV4,
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Prompt,
  LanguageModelV4StreamPart,
  LanguageModelV4Usage,
} from "@ai-sdk/provider"
import { demoEmbed } from "./demo-embeddings"

const EMBEDDING_MODEL_ID = "openai/text-embedding-3-small"
const CHAT_MODEL_ID = "openai/gpt-5.1-instant"

// ---------------------------------------------------------------------------
// Embeddings
// ---------------------------------------------------------------------------

const demoEmbeddingModel: EmbeddingModelV4 = {
  specificationVersion: "v4",
  provider: "demo",
  modelId: EMBEDDING_MODEL_ID,
  maxEmbeddingsPerCall: 2048,
  supportsParallelCalls: true,
  async doEmbed({ values }) {
    return { embeddings: values.map(demoEmbed), usage: { tokens: 0 }, warnings: [] }
  },
}

// ---------------------------------------------------------------------------
// Diagnosis rules (shared by chat answers and incident titles)
// ---------------------------------------------------------------------------

type Lang = "es" | "en"

type Rule = {
  id: string
  test: RegExp
  title: Record<Lang, string>
  cause: Record<Lang, string>
  fix: Record<Lang, string[]>
}

// Ordered by priority: the first rule matched by any error evidence wins.
const RULES: Rule[] = [
  {
    id: "kms",
    test: /kms:decrypt|kmsexception|decrypt[\s\S]{0,200}accessdenied|accessdenied[\s\S]{0,200}decrypt/i,
    title: { es: "Acceso denegado a KMS (kms:Decrypt)", en: "KMS access denied (kms:Decrypt)" },
    cause: {
      es: "El rol IAM del servicio ya no tiene permiso `kms:Decrypt` sobre la clave KMS que cifra sus secretos. Al arrancar no puede descifrar las credenciales, termina con error y Kubernetes lo reinicia en bucle.",
      en: "The service's IAM role no longer has `kms:Decrypt` on the KMS key that encrypts its secrets. It cannot decrypt its credentials at startup, exits with an error, and Kubernetes restarts it in a loop.",
    },
    fix: {
      es: [
        "Revisar la política de la clave: `aws kms get-key-policy --key-id <key-id> --policy-name default`",
        "Restaurar `kms:Decrypt` para el rol del servicio (IRSA) en la key policy o en la política IAM del rol.",
        "Reiniciar el despliegue: `kubectl rollout restart deployment/<servicio> -n <namespace>`",
        "Prevención: gestionar las key policies por IaC con revisión obligatoria y alertar en CloudTrail sobre `PutKeyPolicy`.",
      ],
      en: [
        "Inspect the key policy: `aws kms get-key-policy --key-id <key-id> --policy-name default`",
        "Restore `kms:Decrypt` for the service (IRSA) role in the key policy or the role's IAM policy.",
        "Restart the deployment: `kubectl rollout restart deployment/<service> -n <namespace>`",
        "Prevention: manage key policies through IaC with mandatory review and alert on CloudTrail `PutKeyPolicy`.",
      ],
    },
  },
  {
    id: "iam",
    test: /accessdenied|access denied|not authorized|unauthorizedoperation|forbidden/i,
    title: { es: "Permisos IAM denegados", en: "IAM permission denied" },
    cause: {
      es: "Las llamadas a AWS del servicio están siendo rechazadas por falta de permisos IAM.",
      en: "The service's AWS calls are being rejected due to missing IAM permissions.",
    },
    fix: {
      es: [
        "Identificar la acción denegada en CloudTrail (`errorCode = AccessDenied`).",
        "Añadir el permiso al rol del servicio y volver a desplegar.",
      ],
      en: [
        "Find the denied action in CloudTrail (`errorCode = AccessDenied`).",
        "Grant the permission to the service role and redeploy.",
      ],
    },
  },
  {
    id: "oom",
    test: /oomkilled|out of memory|exit code 137/i,
    title: { es: "Contenedor terminado por memoria (OOMKilled)", en: "Container OOMKilled" },
    cause: {
      es: "El contenedor supera su límite de memoria y el kernel lo termina.",
      en: "The container exceeds its memory limit and is killed by the kernel.",
    },
    fix: {
      es: ["Revisar `kubectl describe pod` (Last State: OOMKilled).", "Subir `resources.limits.memory` o reducir el consumo."],
      en: ["Check `kubectl describe pod` (Last State: OOMKilled).", "Raise `resources.limits.memory` or reduce usage."],
    },
  },
  {
    id: "image",
    test: /imagepullbackoff|errimagepull/i,
    title: { es: "No se puede descargar la imagen", en: "Image pull failure" },
    cause: {
      es: "Kubernetes no puede descargar la imagen del contenedor (tag inexistente o credenciales de registro).",
      en: "Kubernetes cannot pull the container image (missing tag or registry credentials).",
    },
    fix: {
      es: ["Verificar el tag de la imagen y el `imagePullSecret`."],
      en: ["Verify the image tag and the `imagePullSecret`."],
    },
  },
  {
    id: "db",
    test: /connection refused|could not connect|database .*unavailable|timed out/i,
    title: { es: "Fallo de conexión a la base de datos", en: "Database connection failure" },
    cause: {
      es: "El servicio no logra conectarse a su base de datos o dependencia.",
      en: "The service cannot connect to its database or dependency.",
    },
    fix: {
      es: ["Comprobar security groups, DNS y estado de la base de datos.", "Revisar el pool de conexiones del servicio."],
      en: ["Check security groups, DNS and database health.", "Review the service connection pool."],
    },
  },
  {
    id: "throttle",
    test: /throttl|\b429\b|rate exceeded/i,
    title: { es: "Limitación de tasa (throttling)", en: "Rate limiting (throttling)" },
    cause: {
      es: "Una dependencia está limitando las peticiones del servicio.",
      en: "A dependency is throttling the service's requests.",
    },
    fix: {
      es: ["Añadir backoff exponencial con jitter.", "Solicitar un aumento de cuota si es sostenido."],
      en: ["Add exponential backoff with jitter.", "Request a quota increase if sustained."],
    },
  },
  {
    id: "crash",
    test: /crashloopbackoff|back-off restarting/i,
    title: { es: "Pod en CrashLoopBackOff", en: "Pod in CrashLoopBackOff" },
    cause: {
      es: "El contenedor termina al arrancar de forma repetida; la causa concreta debe verse en los logs del contenedor anterior.",
      en: "The container exits repeatedly on startup; the specific cause is in the previous container's logs.",
    },
    fix: {
      es: ["`kubectl logs <pod> --previous` para ver el error de arranque."],
      en: ["`kubectl logs <pod> --previous` to see the startup error."],
    },
  },
]

const ERRORISH = /error|fatal|exception|accessdenied|denied|failed|crashloopbackoff|back-off|exit code [1-9]|oomkilled|timed out|refused/i

// Error evidence wins; if there is none (e.g. only throttling warnings), fall back to everything.
function diagnose(texts: string[]): Rule | undefined {
  const evidence = texts.filter((t) => ERRORISH.test(t))
  return (
    RULES.find((r) => evidence.some((t) => r.test.test(t))) ?? RULES.find((r) => texts.some((t) => r.test.test(t)))
  )
}

// ---------------------------------------------------------------------------
// Prompt helpers
// ---------------------------------------------------------------------------

type SearchResult = {
  source: string
  service: string | null
  severity: string | null
  eventTime: string
  content: string
  relevance: number
}

function textOf(parts: Array<{ type: string; text?: string }>): string {
  return parts.map((p) => (p.type === "text" ? p.text ?? "" : "")).join(" ")
}

// Messages after the last user turn tell us which step of the loop we're in.
function splitLastTurn(prompt: LanguageModelV4Prompt) {
  let lastUser = -1
  prompt.forEach((m, i) => {
    if (m.role === "user") lastUser = i
  })
  const question = lastUser >= 0 ? textOf(prompt[lastUser].content as Array<{ type: string; text?: string }>) : ""
  const results: SearchResult[] = []
  let searched = false
  for (const m of prompt.slice(lastUser + 1)) {
    if (m.role !== "tool") continue
    searched = true
    for (const part of m.content) {
      if (part.type !== "tool-result" || part.output.type !== "json") continue
      const value = part.output.value as { results?: SearchResult[] }
      results.push(...(value.results ?? []))
    }
  }
  return { question, searched, results }
}

function incidentScope(prompt: LanguageModelV4Prompt) {
  const system = prompt.filter((m) => m.role === "system").map((m) => m.content).join("\n")
  const service = system.match(/- Service: (\S+)/)?.[1]
  const firstSeen = system.match(/- First seen: (\S+)/)?.[1]
  return { service, firstSeen }
}

function detectLang(text: string): Lang {
  return /[¿¡ñáéíóú]|\b(que|por|como|cual|donde|esta|estan|falla|fallando|causa|raiz|pasa|del|los|las|una|se|el|la)\b/i.test(
    text,
  )
    ? "es"
    : "en"
}

// ---------------------------------------------------------------------------
// Answer composition
// ---------------------------------------------------------------------------

const L = {
  es: {
    demo: "_Modo demo: diagnóstico generado con reglas locales sobre los logs recuperados, sin LLM._",
    none: "No encontré logs relevantes para esta consulta en la base vectorial. Prueba ingiriendo logs o reformulando la pregunta.",
    summary: "Resumen",
    timeline: "Línea de tiempo",
    herrings: "Pistas falsas descartadas",
    root: "Causa raíz",
    fix: "Remediación",
    noHerrings: "No se identificaron pistas falsas claras en la evidencia recuperada.",
    unknownCause:
      "La evidencia no coincide con ningún patrón conocido. El error más representativo es:",
    summaryLine: (svc: string, e: number, w: number, n: number) =>
      `Se analizaron **${n}** fragmentos de log de **${svc}**: **${e}** con errores y **${w}** con avisos.`,
    trigger: (t: string, c: string) => `El fallo está precedido por un cambio de configuración a las **${t}**: \`${c}\`.`,
    deployHerring: "El despliegue terminó correctamente antes de los errores; no hay fallos de imagen ni de arranque asociados a él.",
    dbHerring: "Los timeouts hacia la base de datos son transitorios: las métricas de RDS están sanas (sin failover, reinicios ni mantenimiento).",
  },
  en: {
    demo: "_Demo mode: diagnosis produced by local rules over the retrieved logs, no LLM._",
    none: "I found no relevant logs for this query in the vector store. Try ingesting logs or rephrasing the question.",
    summary: "Summary",
    timeline: "Timeline",
    herrings: "Red herrings ruled out",
    root: "Root cause",
    fix: "Remediation",
    noHerrings: "No clear red herrings in the retrieved evidence.",
    unknownCause: "The evidence does not match a known pattern. The most representative error is:",
    summaryLine: (svc: string, e: number, w: number, n: number) =>
      `Analyzed **${n}** log chunks from **${svc}**: **${e}** with errors and **${w}** with warnings.`,
    trigger: (t: string, c: string) => `The failure is preceded by a configuration change at **${t}**: \`${c}\`.`,
    deployHerring: "The deploy completed cleanly before the errors; no image or startup failures are tied to it.",
    dbHerring: "Database timeouts are transient: RDS metrics are healthy (no failover, reboot or maintenance).",
  },
}

const CHANGE_EVENT = /putkeypolicy|putrolepolicy|attachrolepolicy|detachrolepolicy|deleterolepolicy|updatesecret|putbucketpolicy/i

// CloudTrail-style JSON records read better as "source Event [Error] by arn".
function describeRecord(s: string): string | undefined {
  if (!s.trim().startsWith("{")) return undefined
  try {
    const r = JSON.parse(s) as {
      eventSource?: string
      eventName?: string
      errorCode?: string
      userIdentity?: { arn?: string }
    }
    if (!r.eventName) return undefined
    return [
      `CloudTrail ${r.eventSource ?? ""} **${r.eventName}**`,
      r.errorCode ? `→ ${r.errorCode}` : "",
      r.userIdentity?.arn ? `(${r.userIdentity.arn})` : "",
    ]
      .filter(Boolean)
      .join(" ")
  } catch {
    return undefined
  }
}

function oneLine(s: string, max = 180): string {
  const record = describeRecord(s)
  if (record) return record
  const line = s.replace(/\s+/g, " ").trim()
  return line.length > max ? `${line.slice(0, max)}…` : line
}

function hhmmss(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(11, 19) + "Z"
}

// Diagnose one service: the incident's, else one named in the question, else
// the one with the most error evidence. Other services' chunks are only used
// as context for ruling out red herrings (e.g. healthy RDS metrics).
function focusService(question: string, results: SearchResult[], scoped?: string): string | undefined {
  if (scoped) return scoped
  const services = [...new Set(results.map((r) => r.service).filter((s): s is string => !!s))]
  const q = question.toLowerCase()
  const named = services.find((s) => q.includes(s.toLowerCase()))
  if (named) return named
  const errorsBy = (s: string) => results.filter((r) => r.service === s && ERRORISH.test(r.content)).length
  return services.sort((a, b) => errorsBy(b) - errorsBy(a))[0]
}

function composeAnswer(question: string, raw: SearchResult[], scopedService?: string): string {
  const t = L[detectLang(question)]
  const lang = detectLang(question)

  const seen = new Set<string>()
  const all = raw
    .filter((r) => (seen.has(r.content) ? false : (seen.add(r.content), true)))
    .sort((a, b) => a.eventTime.localeCompare(b.eventTime))

  const focus = focusService(question, all, scopedService)
  const results = focus ? all.filter((r) => r.service === focus) : all

  if (results.length === 0) return `${t.none}\n\n${t.demo}`

  const texts = results.map((r) => r.content)
  const context = all.map((r) => r.content)
  const errors = results.filter((r) => r.severity === "error" || ERRORISH.test(r.content))
  const warns = results.filter((r) => r.severity === "warn")
  const services = focus ?? "unknown"
  const rule = diagnose(texts)
  const firstError = errors[0]
  const trigger = results.find(
    (r) => CHANGE_EVENT.test(r.content) && (!firstError || r.eventTime <= firstError.eventTime),
  )

  const out: string[] = []
  out.push(`### 1. ${t.summary}`)
  out.push(t.summaryLine(services, errors.length, warns.length, results.length) + (rule ? ` **${rule.title[lang]}**.` : ""))

  out.push(`\n### 2. ${t.timeline}`)
  for (const r of results.slice(0, 12)) {
    const sev = r.severity ?? "info"
    out.push(`- \`${hhmmss(r.eventTime)}\` **${r.source}/${sev}** — ${oneLine(r.content)}`)
  }

  out.push(`\n### 3. ${t.herrings}`)
  const herrings: string[] = []
  if (rule?.id !== "image" && texts.some((c) => /scaled up|rollout|successfulcreate/i.test(c))) herrings.push(t.deployHerring)
  if (rule?.id !== "db" && texts.some((c) => /timed out/i.test(c)) && context.some((c) => /no failover|cpuutilization/i.test(c)))
    herrings.push(t.dbHerring)
  out.push(herrings.length ? herrings.map((h) => `- ${h}`).join("\n") : t.noHerrings)

  out.push(`\n### 4. ${t.root}`)
  if (rule) {
    out.push(rule.cause[lang])
    if (trigger) out.push(t.trigger(hhmmss(trigger.eventTime), oneLine(trigger.content, 160).replace(/\*\*/g, "")))
  } else {
    out.push(`${t.unknownCause}\n\n> ${oneLine(firstError?.content ?? results[results.length - 1].content, 300)}`)
  }

  out.push(`\n### 5. ${t.fix}`)
  const fixes = rule?.fix[lang] ?? (lang === "es" ? ["Revisar los logs del error anterior y su dependencia."] : ["Review the error above and its dependency."])
  out.push(fixes.map((f) => `- ${f}`).join("\n"))

  out.push(`\n${t.demo}`)
  return out.join("\n")
}

// ---------------------------------------------------------------------------
// Chat model
// ---------------------------------------------------------------------------

const USAGE: LanguageModelV4Usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
}

let callSeq = 0

function planSearches(question: string, service?: string, firstSeen?: string) {
  const scope = service ? { service } : {}
  const startTime = firstSeen ? new Date(new Date(firstSeen).getTime() - 60 * 60 * 1000).toISOString() : undefined
  return [
    { query: question || "why is the service failing", ...scope, limit: 8 },
    { query: "error fatal exception failed denied crashloopbackoff exit code", ...scope, limit: 8 },
    { query: "accessdenied kms decrypt putkeypolicy iam policy permission change", source: "aws", ...scope, limit: 6, ...(startTime ? { startTime } : {}) },
    { query: "backoff unhealthy readiness probe restart deploy scaled rollout", source: "k8s", ...scope, limit: 6 },
    { query: "rds database cpu connections failover reboot maintenance", limit: 4 },
  ]
}

function streamOf(parts: LanguageModelV4StreamPart[], delayMs = 0): ReadableStream<LanguageModelV4StreamPart> {
  return new ReadableStream({
    async start(controller) {
      for (const p of parts) {
        if (delayMs && p.type === "text-delta") await new Promise((r) => setTimeout(r, delayMs))
        controller.enqueue(p)
      }
      controller.close()
    },
  })
}

function chatParts(options: LanguageModelV4CallOptions): LanguageModelV4StreamPart[] {
  const { question, searched, results } = splitLastTurn(options.prompt)
  const hasSearchTool = options.tools?.some((tool) => tool.name === "searchLogs")

  // Step 1: gather evidence with several searchLogs calls.
  if (!searched && hasSearchTool) {
    const { service, firstSeen } = incidentScope(options.prompt)
    return [
      { type: "stream-start", warnings: [] },
      ...planSearches(question, service, firstSeen).map(
        (input): LanguageModelV4StreamPart => ({
          type: "tool-call",
          toolCallId: `demo-call-${++callSeq}`,
          toolName: "searchLogs",
          input: JSON.stringify(input),
        }),
      ),
      { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage: USAGE },
    ]
  }

  // Step 2: write the diagnosis from what the tool returned.
  const answer = composeAnswer(question, results, incidentScope(options.prompt).service)
  const id = `demo-text-${++callSeq}`
  const words = answer.match(/\S+\s*/g) ?? [answer]
  const deltas: LanguageModelV4StreamPart[] = []
  for (let i = 0; i < words.length; i += 4) deltas.push({ type: "text-delta", id, delta: words.slice(i, i + 4).join("") })
  return [
    { type: "stream-start", warnings: [] },
    { type: "text-start", id },
    ...deltas,
    { type: "text-end", id },
    { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage: USAGE },
  ]
}

// Incident titles (lib/incidents.ts uses generateObject with this same model id).
function incidentObject(options: LanguageModelV4CallOptions): string {
  const text = options.prompt
    .map((m) => (typeof m.content === "string" ? m.content : textOf(m.content as Array<{ type: string; text?: string }>)))
    .join("\n")
  const service = text.match(/Service: (\S+)/)?.[1] ?? "unknown"
  const env = text.match(/Environment: (\S+)/)?.[1]
  const rule = diagnose([text])
  const where = `${service}${env && env !== "unknown" ? ` (${env})` : ""}`
  return JSON.stringify({
    title: rule ? `${where}: ${rule.title.en}` : `${where}: recurring errors`,
    summary: rule ? rule.cause.en : `Automatically detected cluster of recent error logs in ${where}.`,
  })
}

const demoChatModel: LanguageModelV4 = {
  specificationVersion: "v4",
  provider: "demo",
  modelId: CHAT_MODEL_ID,
  supportedUrls: {},
  async doStream(options) {
    return { stream: streamOf(chatParts(options), 25) }
  },
  async doGenerate(options) {
    if (options.responseFormat?.type === "json") {
      return {
        content: [{ type: "text", text: incidentObject(options) }],
        finishReason: { unified: "stop", raw: undefined },
        usage: USAGE,
        warnings: [],
      }
    }
    const parts = chatParts(options)
    const text = parts.map((p) => (p.type === "text-delta" ? p.delta : "")).join("")
    const calls = parts.filter((p) => p.type === "tool-call")
    return {
      content: calls.length ? calls : [{ type: "text", text }],
      finishReason: { unified: calls.length ? "tool-calls" : "stop", raw: undefined },
      usage: USAGE,
      warnings: [],
    }
  },
}

export function installDemoProvider() {
  globalThis.AI_SDK_DEFAULT_PROVIDER = customProvider({
    languageModels: { [CHAT_MODEL_ID]: demoChatModel },
    embeddingModels: { [EMBEDDING_MODEL_ID]: demoEmbeddingModel },
  })
  console.log("[demo] AI_DEMO_MODE on — using local embeddings and rule-based chat model (no AI Gateway)")
}
