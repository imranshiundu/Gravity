import type { CoreToolRunInput } from "./tool-bus.js"

type ToolRunResult = {
  ok?: boolean
  status?: number
  error?: string
  [key: string]: unknown
}

type ToolExecutor = (payload: CoreToolRunInput) => Promise<ToolRunResult>

type CoreWorkflowInput = Record<string, unknown>

type WorkflowStep = {
  id: string
  title: string
  toolName: string
  input?: Record<string, unknown>
  optional?: boolean
}

export type WorkflowDefinition = {
  id: string
  title: string
  description: string
  risk: "safe" | "medium" | "dangerous"
  requiresApproval: boolean
  allowedToolNames: string[]
  blockedToolKinds: string[]
  buildSteps: (input: CoreWorkflowInput) => WorkflowStep[]
}

function getString(input: unknown) {
  return typeof input === "string" ? input : ""
}

function getBoolean(input: unknown, fallback = false) {
  return typeof input === "boolean" ? input : fallback
}

function getNumber(input: unknown, fallback: number) {
  return typeof input === "number" && Number.isFinite(input) ? Math.trunc(input) : fallback
}

function getObject(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {}
}

function safeJsonPreview(value: unknown, limit = 12000) {
  try {
    const json = JSON.stringify(value)
    if (!json) return value
    if (json.length <= limit) return value
    return {
      truncated: true,
      originalBytes: json.length,
      preview: json.slice(0, limit),
    }
  } catch {
    return {
      truncated: true,
      preview: String(value).slice(0, limit),
    }
  }
}

function healthCheckSteps(input: CoreWorkflowInput): WorkflowStep[] {
  const includeRoutes = getBoolean(input.includeRoutes, false)
  const includeAudit = getBoolean(input.includeAudit, true)
  const includeOllama = getBoolean(input.includeOllama, false)
  const auditLimit = getNumber(input.auditLimit, 10)
  const memoryQuery = getString(input.memoryQuery)

  const steps: WorkflowStep[] = [
    {
      id: "core-status",
      title: "Read Core status",
      toolName: "core.status",
    },
    {
      id: "module-registry",
      title: "Read Core module registry",
      toolName: "core.modules.list",
    },
    {
      id: "module-inventory",
      title: "Inventory known module source bindings",
      toolName: "modules.inventory",
      input: { includeRoutes, includeFiles: false },
    },
  ]

  if (includeAudit) {
    steps.push({
      id: "recent-audit",
      title: "Read recent audit events",
      toolName: "core.audit.read",
      input: { limit: auditLimit },
      optional: true,
    })
  }

  if (memoryQuery) {
    steps.push({
      id: "memory-context",
      title: "Search MemPalace for workflow context",
      toolName: "memory.search",
      input: { query: memoryQuery, limit: getNumber(input.memoryLimit, 5) },
      optional: true,
    })
  }

  if (includeOllama) {
    steps.push({
      id: "ollama-models",
      title: "Probe Ollama model list",
      toolName: "ollama.models",
      optional: true,
    })
  }

  return steps
}

function moduleInventorySteps(input: CoreWorkflowInput): WorkflowStep[] {
  const moduleId = getString(input.moduleId)
  return [
    {
      id: "module-inventory",
      title: moduleId ? `Inventory ${moduleId}` : "Inventory all known modules",
      toolName: "modules.inventory",
      input: {
        moduleId: moduleId || undefined,
        includeRoutes: getBoolean(input.includeRoutes, true),
        includeFiles: getBoolean(input.includeFiles, false),
      },
    },
    {
      id: "module-search",
      title: "Search module contracts for route and tool hints",
      toolName: "modules.search",
      input: {
        moduleId: moduleId || undefined,
        query: getString(input.query) || "route endpoint tool cli contract service",
        limit: getNumber(input.limit, 20),
      },
      optional: true,
    },
  ]
}

function providerHealthSteps(input: CoreWorkflowInput): WorkflowStep[] {
  return [
    {
      id: "ollama-contract",
      title: "Read reviewed Ollama contract",
      toolName: "ollama.contract",
    },
    {
      id: "ollama-models",
      title: "List Ollama models from configured provider",
      toolName: "ollama.models",
      input: getObject(input.ollamaInput),
      optional: true,
    },
  ]
}

export const coreWorkflowDefinitions: WorkflowDefinition[] = [
  {
    id: "gravity.system.health_check",
    title: "Gravity system health check",
    description: "Coordinates Core status, module registry, module inventory, optional audit, optional MemPalace search, and optional Ollama model probing through the internal tool bus.",
    risk: "safe",
    requiresApproval: false,
    allowedToolNames: ["core.status", "core.modules.list", "modules.inventory", "core.audit.read", "memory.search", "ollama.models"],
    blockedToolKinds: ["edit", "send", "proxy", "workflow-dispatch", "code-run", "shell-run", "dangerous"],
    buildSteps: healthCheckSteps,
  },
  {
    id: "gravity.modules.inventory_check",
    title: "Gravity module inventory check",
    description: "Inventories the known module bindings and optionally searches for route/tool/CLI contract hints without executing module code.",
    risk: "safe",
    requiresApproval: false,
    allowedToolNames: ["modules.inventory", "modules.search"],
    blockedToolKinds: ["edit", "send", "proxy", "workflow-dispatch", "code-run", "shell-run", "dangerous"],
    buildSteps: moduleInventorySteps,
  },
  {
    id: "gravity.providers.ollama_check",
    title: "Gravity Ollama provider check",
    description: "Reads the reviewed Ollama contract and optionally probes the configured Ollama model endpoint. Missing OLLAMA_BASE_URL is reported honestly.",
    risk: "safe",
    requiresApproval: false,
    allowedToolNames: ["ollama.contract", "ollama.models"],
    blockedToolKinds: ["generate", "chat", "edit", "send", "proxy", "workflow-dispatch", "dangerous"],
    buildSteps: providerHealthSteps,
  },
]

export function listCoreWorkflows() {
  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    timestamp: new Date().toISOString(),
    workflows: coreWorkflowDefinitions.map(({ buildSteps, ...definition }) => ({
      ...definition,
      stepPreview: buildSteps({}).map((step) => ({
        id: step.id,
        title: step.title,
        toolName: step.toolName,
        optional: Boolean(step.optional),
      })),
    })),
  }
}

function findWorkflow(id: string) {
  return coreWorkflowDefinitions.find((workflow) => workflow.id === id)
}

function validateWorkflowSteps(workflow: WorkflowDefinition, steps: WorkflowStep[]) {
  const blocked = steps.filter((step) => !workflow.allowedToolNames.includes(step.toolName))
  if (blocked.length > 0) {
    return {
      ok: false as const,
      status: 500,
      error: `Workflow ${workflow.id} has unapproved internal step tools: ${blocked.map((step) => step.toolName).join(", ")}`,
    }
  }
  return { ok: true as const, status: 200 }
}

export async function runCoreWorkflow(input: CoreWorkflowInput = {}, executeTool: ToolExecutor) {
  const workflowId = getString(input.workflowId) || getString(input.workflow) || "gravity.system.health_check"
  const workflow = findWorkflow(workflowId)

  if (!workflow) {
    return {
      ok: false as const,
      status: 404,
      service: "grav-core",
      error: `Workflow not found: ${workflowId}`,
      availableWorkflows: coreWorkflowDefinitions.map((item) => item.id),
    }
  }

  if (workflow.requiresApproval && input.approved !== true) {
    return {
      ok: false as const,
      status: 403,
      service: "grav-core",
      workflowId,
      approvalRequired: true,
      error: `Workflow ${workflowId} requires approval. Re-run with approved=true after operator approval.`,
    }
  }

  const workflowInput = getObject(input.input)
  const steps = workflow.buildSteps(workflowInput)
  const validation = validateWorkflowSteps(workflow, steps)
  if (!validation.ok) return validation

  const startedAt = new Date().toISOString()
  const results = []

  for (const step of steps) {
    const stepStartedAt = Date.now()
    const result = await executeTool({
      toolName: step.toolName,
      input: step.input || {},
    })
    const durationMs = Date.now() - stepStartedAt

    results.push({
      id: step.id,
      title: step.title,
      toolName: step.toolName,
      optional: Boolean(step.optional),
      ok: Boolean(result.ok),
      status: typeof result.status === "number" ? result.status : result.ok ? 200 : 500,
      durationMs,
      error: typeof result.error === "string" ? result.error : undefined,
      output: safeJsonPreview(result),
    })
  }

  const requiredFailures = results.filter((step) => !step.optional && !step.ok)
  const optionalFailures = results.filter((step) => step.optional && !step.ok)
  const completedAt = new Date().toISOString()

  return {
    ok: requiredFailures.length === 0,
    status: requiredFailures.length === 0 ? 200 : 502,
    service: "grav-core",
    workflow: {
      id: workflow.id,
      title: workflow.title,
      description: workflow.description,
      risk: workflow.risk,
      requiresApproval: workflow.requiresApproval,
      allowedToolNames: workflow.allowedToolNames,
      blockedToolKinds: workflow.blockedToolKinds,
    },
    startedAt,
    completedAt,
    degraded: optionalFailures.length > 0,
    summary: {
      totalSteps: results.length,
      completedSteps: results.filter((step) => step.ok).length,
      requiredFailures: requiredFailures.length,
      optionalFailures: optionalFailures.length,
    },
    steps: results,
  }
}
