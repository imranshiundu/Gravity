import { getUnifiedModuleInventory, readUnifiedModuleFile, searchUnifiedModules } from "./module-bindings.js"

const ORCHESTRATION_MODULE_ID = "orchestration"
const ORCHESTRATION_PREFIX = "modules/orchestration/"

export const REVIEWED_ORCHESTRATION_READ_PATH_PREFIXES = ["/health", "/status", "/agents", "/tools", "/workflows", "/runs"] as const
export const REVIEWED_ORCHESTRATION_WORKFLOW_PATH_PREFIXES = ["/workflow", "/workflows", "/runs"] as const
export const REVIEWED_ORCHESTRATION_PATH_PREFIXES = [
  ...REVIEWED_ORCHESTRATION_READ_PATH_PREFIXES,
  ...REVIEWED_ORCHESTRATION_WORKFLOW_PATH_PREFIXES,
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

function assertOrchestrationFile(file: string) {
  if (!file) {
    return { ok: false as const, status: 400, error: "file is required for orchestration.read." }
  }

  if (!file.startsWith(ORCHESTRATION_PREFIX)) {
    return {
      ok: false as const,
      status: 403,
      error: "orchestration.read only reads files under modules/orchestration. Use modules.read for other known module source paths.",
    }
  }

  return undefined
}

function getReviewedOrchestrationContract() {
  return {
    moduleId: ORCHESTRATION_MODULE_ID,
    sourcePath: "modules/orchestration",
    serviceEnv: "GRAVITY_ORCHESTRATION_BASE_URL",
    executionState: "approval-gated-service-workflow-dispatch",
    sourceTools: ["orchestration.inventory", "orchestration.contract", "orchestration.search", "orchestration.read"],
    serviceTools: ["orchestration.workflow.run"],
    readAllowedPathPrefixes: [...REVIEWED_ORCHESTRATION_READ_PATH_PREFIXES],
    workflowAllowedPathPrefixes: [...REVIEWED_ORCHESTRATION_WORKFLOW_PATH_PREFIXES],
    removedBroadPrefixes: ["/", "/api"],
    defaultPaths: {
      healthProbe: "/health",
      statusProbe: "/status",
      agentsProbe: "/agents",
      toolsProbe: "/tools",
      workflowsProbe: "/workflows",
      workflowRun: "/workflow/run",
    },
    safetyPolicy: [
      "orchestration.workflow.run remains approval-gated because it can coordinate tools, agents, module calls, and downstream side effects",
      "Core only proxies reviewed orchestration workflow/run paths and does not expose a broad / or /api proxy",
      "Core refuses absolute URLs, protocol-relative URLs, and path traversal before proxying",
      "Source inventory reports modules/orchestration missing honestly instead of pretending a workflow runtime exists",
      "Future agent/tool/handoff expansion must be based on reviewed routes discovered in modules/orchestration or a configured service contract",
    ],
  }
}

export async function getOrchestrationModuleInventory(input: Record<string, unknown> = {}) {
  const inventory = await getUnifiedModuleInventory({
    moduleId: ORCHESTRATION_MODULE_ID,
    includeFiles: input.includeFiles === true,
    includeRoutes: input.includeRoutes !== false,
  })

  return {
    ...inventory,
    orchestrationContract: getReviewedOrchestrationContract(),
  }
}

export async function searchOrchestrationModule(input: Record<string, unknown> = {}) {
  return searchUnifiedModules({
    moduleId: ORCHESTRATION_MODULE_ID,
    query: getString(input.query),
    limit: normalizeLimit(input.limit, 30),
  })
}

export async function readOrchestrationModuleFile(input: Record<string, unknown> = {}) {
  const file = normalizeModuleFile(input.file)
  const invalid = assertOrchestrationFile(file)
  if (invalid) return invalid
  return readUnifiedModuleFile({ file })
}

export async function getOrchestrationReviewedContract() {
  const inventory = await getOrchestrationModuleInventory({ includeRoutes: true, includeFiles: false })
  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    contract: getReviewedOrchestrationContract(),
    inventory,
  }
}
