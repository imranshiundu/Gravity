import { getUnifiedModuleInventory, readUnifiedModuleFile, searchUnifiedModules } from "./module-bindings.js"

const CHANNELS_MODULE_ID = "channels"
const CHANNELS_PREFIX = "modules/channels/"

export const REVIEWED_CHANNELS_READ_PATH_PREFIXES = ["/health", "/status", "/providers", "/plugins", "/inbox"] as const
export const REVIEWED_CHANNELS_SEND_PATH_PREFIXES = ["/send", "/webhook"] as const
export const REVIEWED_CHANNELS_PATH_PREFIXES = [...REVIEWED_CHANNELS_READ_PATH_PREFIXES, ...REVIEWED_CHANNELS_SEND_PATH_PREFIXES] as const

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

function assertChannelsFile(file: string) {
  if (!file) {
    return { ok: false as const, status: 400, error: "file is required for channels.read." }
  }

  if (!file.startsWith(CHANNELS_PREFIX)) {
    return {
      ok: false as const,
      status: 403,
      error: "channels.read only reads files under modules/channels. Use modules.read for other known module source paths.",
    }
  }

  return undefined
}

function getReviewedChannelsContract() {
  return {
    moduleId: CHANNELS_MODULE_ID,
    sourcePath: "modules/channels",
    serviceEnv: "GRAVITY_CHANNELS_BASE_URL",
    executionState: "service-proxy-partitioned-by-risk",
    readOnlyTools: ["channels.inventory", "channels.contract", "channels.search", "channels.read", "channels.inbox"],
    approvalGatedTools: ["channels.send"],
    readAllowedPathPrefixes: [...REVIEWED_CHANNELS_READ_PATH_PREFIXES],
    sendAllowedPathPrefixes: [...REVIEWED_CHANNELS_SEND_PATH_PREFIXES],
    removedBroadPrefixes: ["/", "/api"],
    safetyPolicy: [
      "channels.inbox is read-only and forces GET semantics through the adapter",
      "channels.send remains approval-gated and only uses reviewed outbound/inbound delivery paths",
      "Core refuses absolute URLs, protocol-relative URLs, and path traversal before proxying",
      "Core does not treat GRAVITY_CHANNELS_BASE_URL as a general open messaging proxy",
      "modules/channels source inventory reports missing source honestly instead of pretending a channels service exists",
    ],
  }
}

export async function getChannelsModuleInventory(input: Record<string, unknown> = {}) {
  const inventory = await getUnifiedModuleInventory({
    moduleId: CHANNELS_MODULE_ID,
    includeFiles: input.includeFiles === true,
    includeRoutes: input.includeRoutes !== false,
  })

  return {
    ...inventory,
    channelsContract: getReviewedChannelsContract(),
  }
}

export async function searchChannelsModule(input: Record<string, unknown> = {}) {
  return searchUnifiedModules({
    moduleId: CHANNELS_MODULE_ID,
    query: getString(input.query),
    limit: normalizeLimit(input.limit, 30),
  })
}

export async function readChannelsModuleFile(input: Record<string, unknown> = {}) {
  const file = normalizeModuleFile(input.file)
  const invalid = assertChannelsFile(file)
  if (invalid) return invalid
  return readUnifiedModuleFile({ file })
}

export async function getChannelsReviewedContract() {
  const inventory = await getChannelsModuleInventory({ includeRoutes: true, includeFiles: false })
  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    contract: getReviewedChannelsContract(),
    inventory,
  }
}
