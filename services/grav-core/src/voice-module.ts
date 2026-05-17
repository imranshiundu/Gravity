import { getUnifiedModuleInventory, readUnifiedModuleFile, searchUnifiedModules } from "./module-bindings.js"

const VOICE_MODULE_ID = "voice"
const VOICE_PREFIX = "modules/voice/"

export const REVIEWED_VOICE_READ_PATH_PREFIXES = ["/health", "/status", "/models"] as const
export const REVIEWED_VOICE_SESSION_PATH_PREFIXES = ["/session", "/sessions"] as const
export const REVIEWED_VOICE_TTS_PATH_PREFIXES = ["/tts"] as const
export const REVIEWED_VOICE_STT_PATH_PREFIXES = ["/stt"] as const
export const REVIEWED_VOICE_PATH_PREFIXES = [
  ...REVIEWED_VOICE_READ_PATH_PREFIXES,
  ...REVIEWED_VOICE_SESSION_PATH_PREFIXES,
  ...REVIEWED_VOICE_TTS_PATH_PREFIXES,
  ...REVIEWED_VOICE_STT_PATH_PREFIXES,
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

function assertVoiceFile(file: string) {
  if (!file) {
    return { ok: false as const, status: 400, error: "file is required for voice.read." }
  }

  if (!file.startsWith(VOICE_PREFIX)) {
    return {
      ok: false as const,
      status: 403,
      error: "voice.read only reads files under modules/voice. Use modules.read for other known module source paths.",
    }
  }

  return undefined
}

function getReviewedVoiceContract() {
  return {
    moduleId: VOICE_MODULE_ID,
    sourcePath: "modules/voice",
    serviceEnv: "GRAVITY_VOICE_BASE_URL",
    executionState: "service-proxy-partitioned-by-voice-capability",
    sourceTools: ["voice.inventory", "voice.contract", "voice.search", "voice.read"],
    serviceTools: ["voice.session", "voice.tts", "voice.stt"],
    readAllowedPathPrefixes: [...REVIEWED_VOICE_READ_PATH_PREFIXES],
    sessionAllowedPathPrefixes: [...REVIEWED_VOICE_SESSION_PATH_PREFIXES],
    ttsAllowedPathPrefixes: [...REVIEWED_VOICE_TTS_PATH_PREFIXES],
    sttAllowedPathPrefixes: [...REVIEWED_VOICE_STT_PATH_PREFIXES],
    removedBroadPrefixes: ["/", "/api"],
    defaultPaths: {
      statusProbe: "/status",
      modelProbe: "/models",
      session: "/session",
      tts: "/tts",
      stt: "/stt",
    },
    safetyPolicy: [
      "voice.session only uses reviewed session paths and defaults to POST /session",
      "voice.tts only uses reviewed TTS paths and defaults to POST /tts",
      "voice.stt only uses reviewed STT paths and defaults to POST /stt",
      "Core refuses absolute URLs, protocol-relative URLs, and path traversal before proxying",
      "Core no longer allows broad / or /api voice proxy prefixes without a reviewed module route contract",
      "modules/voice source inventory reports missing source honestly instead of pretending a voice service exists",
    ],
  }
}

export async function getVoiceModuleInventory(input: Record<string, unknown> = {}) {
  const inventory = await getUnifiedModuleInventory({
    moduleId: VOICE_MODULE_ID,
    includeFiles: input.includeFiles === true,
    includeRoutes: input.includeRoutes !== false,
  })

  return {
    ...inventory,
    voiceContract: getReviewedVoiceContract(),
  }
}

export async function searchVoiceModule(input: Record<string, unknown> = {}) {
  return searchUnifiedModules({
    moduleId: VOICE_MODULE_ID,
    query: getString(input.query),
    limit: normalizeLimit(input.limit, 30),
  })
}

export async function readVoiceModuleFile(input: Record<string, unknown> = {}) {
  const file = normalizeModuleFile(input.file)
  const invalid = assertVoiceFile(file)
  if (invalid) return invalid
  return readUnifiedModuleFile({ file })
}

export async function getVoiceReviewedContract() {
  const inventory = await getVoiceModuleInventory({ includeRoutes: true, includeFiles: false })
  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    contract: getReviewedVoiceContract(),
    inventory,
  }
}
