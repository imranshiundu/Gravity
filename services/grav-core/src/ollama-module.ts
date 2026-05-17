import { getUnifiedModuleInventory, readUnifiedModuleFile, searchUnifiedModules } from "./module-bindings.js"

const OLLAMA_MODULE_ID = "ollama"
const OLLAMA_PREFIX = "modules/ollama/"

export const REVIEWED_OLLAMA_READ_PATH_PREFIXES = ["/api/tags", "/api/version"] as const
export const REVIEWED_OLLAMA_GENERATE_PATH_PREFIXES = ["/api/generate"] as const
export const REVIEWED_OLLAMA_CHAT_PATH_PREFIXES = ["/api/chat"] as const
export const REVIEWED_OLLAMA_PATH_PREFIXES = [
  ...REVIEWED_OLLAMA_READ_PATH_PREFIXES,
  ...REVIEWED_OLLAMA_GENERATE_PATH_PREFIXES,
  ...REVIEWED_OLLAMA_CHAT_PATH_PREFIXES,
] as const

function getString(input: unknown) {
  return typeof input === "string" ? input : ""
}

function normalizeLimit(input: unknown, fallback = 30) {
  if (typeof input !== "number" || !Number.isFinite(input)) return fallback
  return Math.max(1, Math.min(80, Math.trunc(input)))
}

function normalizeModuleFile(value: unknown) {
  return getString(value).replace(/\\/g, "/").replace(/^\/+/, "")
}

function assertOllamaFile(file: string) {
  if (!file) {
    return { ok: false as const, status: 400, error: "file is required for ollama.read." }
  }

  if (!file.startsWith(OLLAMA_PREFIX)) {
    return {
      ok: false as const,
      status: 403,
      error: "ollama.read only reads files under modules/ollama. Use modules.read for other known module source paths.",
    }
  }

  return undefined
}

function getReviewedOllamaContract() {
  return {
    moduleId: OLLAMA_MODULE_ID,
    sourcePath: "modules/ollama",
    serviceEnv: "OLLAMA_BASE_URL",
    executionState: "local-provider-proxy-partitioned-by-ollama-api-capability",
    sourceTools: ["ollama.inventory", "ollama.contract", "ollama.search", "ollama.read"],
    serviceTools: ["ollama.models", "ollama.generate", "ollama.chat"],
    readAllowedPathPrefixes: [...REVIEWED_OLLAMA_READ_PATH_PREFIXES],
    generateAllowedPathPrefixes: [...REVIEWED_OLLAMA_GENERATE_PATH_PREFIXES],
    chatAllowedPathPrefixes: [...REVIEWED_OLLAMA_CHAT_PATH_PREFIXES],
    removedBroadPrefixes: ["/", "/api", "/health", "/status"],
    defaultPaths: {
      models: "/api/tags",
      version: "/api/version",
      generate: "/api/generate",
      chat: "/api/chat",
    },
    safetyPolicy: [
      "ollama.models only uses reviewed model-read paths and defaults to GET /api/tags",
      "ollama.generate only uses reviewed generation paths and defaults to POST /api/generate",
      "ollama.chat only uses reviewed chat paths and defaults to POST /api/chat",
      "Core refuses absolute URLs, protocol-relative URLs, and path traversal before proxying",
      "Core no longer allows broad /api provider proxy prefixes without a reviewed Ollama route contract",
      "modules/ollama source inventory reports missing source honestly instead of pretending an Ollama module wrapper exists",
      "Ollama API calls return 503 when OLLAMA_BASE_URL is missing instead of faking model, chat, or generation responses",
    ],
  }
}

export async function getOllamaModuleInventory(input: Record<string, unknown> = {}) {
  const inventory = await getUnifiedModuleInventory({
    moduleId: OLLAMA_MODULE_ID,
    includeFiles: input.includeFiles === true,
    includeRoutes: input.includeRoutes !== false,
  })

  return {
    ...inventory,
    ollamaContract: getReviewedOllamaContract(),
  }
}

export async function searchOllamaModule(input: Record<string, unknown> = {}) {
  return searchUnifiedModules({
    moduleId: OLLAMA_MODULE_ID,
    query: getString(input.query),
    limit: normalizeLimit(input.limit, 30),
  })
}

export async function readOllamaModuleFile(input: Record<string, unknown> = {}) {
  const file = normalizeModuleFile(input.file)
  const invalid = assertOllamaFile(file)
  if (invalid) return invalid
  return readUnifiedModuleFile({ file })
}

export async function getOllamaReviewedContract() {
  const inventory = await getOllamaModuleInventory({ includeRoutes: true, includeFiles: false })
  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    contract: getReviewedOllamaContract(),
    inventory,
  }
}
