import { getUnifiedModuleInventory, readUnifiedModuleFile, searchUnifiedModules } from "./module-bindings.js"

const GATEWAY_MODULE_ID = "gateway"
const GATEWAY_PREFIX = "modules/gateway/"

export const REVIEWED_GATEWAY_PATH_PREFIXES = ["/health", "/status", "/routes", "/proxy"] as const

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

function assertGatewayFile(file: string) {
  if (!file) {
    return { ok: false as const, status: 400, error: "file is required for gateway.read." }
  }

  if (!file.startsWith(GATEWAY_PREFIX)) {
    return {
      ok: false as const,
      status: 403,
      error: "gateway.read only reads files under modules/gateway. Use modules.read for other known module source paths.",
    }
  }

  return undefined
}

function getReviewedGatewayContract() {
  return {
    moduleId: GATEWAY_MODULE_ID,
    sourcePath: "modules/gateway",
    serviceEnv: "GRAVITY_GATEWAY_BASE_URL",
    executionState: "service-proxy-approval-gated",
    allowedPathPrefixes: [...REVIEWED_GATEWAY_PATH_PREFIXES],
    defaultStatusPath: "/status",
    defaultProxyPath: "/proxy",
    safetyPolicy: [
      "gateway.status is read-only and uses the configured gateway service only when GRAVITY_GATEWAY_BASE_URL exists",
      "gateway.proxy remains approval-gated",
      "Core refuses absolute URLs, protocol-relative URLs, and path traversal before proxying",
      "Core no longer allows broad / or /api gateway proxy prefixes without a reviewed module route contract",
      "modules/gateway source inventory reports missing source honestly instead of pretending a gateway service exists",
    ],
  }
}

export async function getGatewayModuleInventory(input: Record<string, unknown> = {}) {
  const inventory = await getUnifiedModuleInventory({
    moduleId: GATEWAY_MODULE_ID,
    includeFiles: input.includeFiles === true,
    includeRoutes: input.includeRoutes !== false,
  })

  return {
    ...inventory,
    gatewayContract: getReviewedGatewayContract(),
  }
}

export async function searchGatewayModule(input: Record<string, unknown> = {}) {
  return searchUnifiedModules({
    moduleId: GATEWAY_MODULE_ID,
    query: getString(input.query),
    limit: normalizeLimit(input.limit, 30),
  })
}

export async function readGatewayModuleFile(input: Record<string, unknown> = {}) {
  const file = normalizeModuleFile(input.file)
  const invalid = assertGatewayFile(file)
  if (invalid) return invalid
  return readUnifiedModuleFile({ file })
}

export async function getGatewayReviewedContract() {
  const inventory = await getGatewayModuleInventory({ includeRoutes: true, includeFiles: false })
  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    contract: getReviewedGatewayContract(),
    inventory,
  }
}
