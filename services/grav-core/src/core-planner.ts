import type { GravityTool } from "@gravity/contracts"

import { resolveCoreCapabilities } from "./core-capabilities.js"

type WorkflowLike = {
  id: string
  title: string
  description: string
  risk: "safe" | "medium" | "dangerous"
  requiresApproval: boolean
  allowedToolNames: string[]
  blockedToolKinds: string[]
}

type CapabilityGraphInput = {
  tools: GravityTool[]
  workflows: WorkflowLike[]
}

type ToolExecutor = (payload: { toolName?: string; input?: Record<string, unknown> }) => Promise<{
  ok?: boolean
  status?: number
  error?: string
  [key: string]: unknown
}>

type PlannerInput = {
  intent?: string
  query?: string
  safeOnly?: boolean
  includeWorkflows?: boolean
  maxResults?: number
  preferWorkflow?: boolean
  workflowInput?: Record<string, unknown>
  toolInputs?: Record<string, Record<string, unknown>>
}

type CapabilityCandidate = {
  id: string
  type: "tool" | "workflow"
  title: string
  description: string
  moduleId: string
  risk: "safe" | "medium" | "dangerous" | "disallowed"
  requiresApproval: boolean
  score: number
  matchedTags: string[]
  status: "candidate" | "requires-approval" | "excluded-by-safe-policy"
}

type PlanStep = {
  id: string
  title: string
  kind: "tool" | "workflow"
  capabilityId: string
  moduleId: string
  risk: "safe" | "medium" | "dangerous" | "disallowed"
  requiresApproval: boolean
  input: Record<string, unknown>
  run: {
    endpoint: string
    toolName?: string
    workflowId?: string
    body: Record<string, unknown>
  }
}

type CorePlan = {
  id: string
  ok: boolean
  service: "grav-core"
  generatedAt: string
  intent: string
  policy: {
    safeOnly: boolean
    includeWorkflows: boolean
    preferWorkflow: boolean
    noFakeSuccess: boolean
    execution: string
  }
  summary: {
    totalSteps: number
    workflowSteps: number
    toolSteps: number
    excludedCandidates: number
    approvalCandidates: number
  }
  steps: PlanStep[]
  resolver: Record<string, unknown>
  warnings: string[]
}

function getText(input: PlannerInput) {
  return `${input.intent || ""} ${input.query || ""}`.trim()
}

function stablePlanId(text: string, steps: PlanStep[]) {
  const seed = `${text}:${steps.map((step) => step.capabilityId).join(",")}`
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  return `grav-plan-${hash.toString(16).padStart(8, "0")}`
}

function getObject(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {}
}

function getToolInput(toolName: string, input: PlannerInput, text: string) {
  const explicit = getObject(input.toolInputs?.[toolName])
  if (Object.keys(explicit).length > 0) return explicit

  if (toolName === "modules.inventory") {
    const wantsRoutes = /route|routes|endpoint|endpoints|api/i.test(text)
    return { includeRoutes: wantsRoutes, includeFiles: false }
  }

  if (toolName === "modules.search") return { query: text || "route endpoint tool contract", limit: 20 }
  if (toolName === "memory.search") return { query: text, limit: 5 }
  if (toolName === "core.audit.read") return { limit: 25 }
  if (toolName.endsWith(".search")) return { query: text, limit: 20 }
  if (toolName.endsWith(".inventory")) return { includeRoutes: true, includeFiles: false }
  return {}
}

function isExecutableCandidate(candidate: CapabilityCandidate) {
  return candidate.status === "candidate" && candidate.risk === "safe" && candidate.requiresApproval === false
}

function isPlannerMetaTool(candidate: CapabilityCandidate) {
  return [
    "core.capabilities.list",
    "core.capabilities.resolve",
    "core.plan.create",
    "core.plan.run",
    "core.workflow.list",
  ].includes(candidate.id)
}

function candidateToStep(candidate: CapabilityCandidate, index: number, input: PlannerInput, text: string): PlanStep {
  if (candidate.type === "workflow") {
    const workflowInput = getObject(input.workflowInput)
    return {
      id: `step-${index + 1}`,
      title: candidate.title,
      kind: "workflow",
      capabilityId: candidate.id,
      moduleId: candidate.moduleId,
      risk: candidate.risk,
      requiresApproval: candidate.requiresApproval,
      input: workflowInput,
      run: {
        endpoint: "POST /workflows/run",
        toolName: "core.workflow.run",
        workflowId: candidate.id,
        body: { workflowId: candidate.id, input: workflowInput },
      },
    }
  }

  const toolInput = getToolInput(candidate.id, input, text)
  return {
    id: `step-${index + 1}`,
    title: candidate.title,
    kind: "tool",
    capabilityId: candidate.id,
    moduleId: candidate.moduleId,
    risk: candidate.risk,
    requiresApproval: candidate.requiresApproval,
    input: toolInput,
    run: {
      endpoint: "POST /tools/run",
      toolName: candidate.id,
      body: { toolName: candidate.id, input: toolInput },
    },
  }
}

function getCandidateList(value: unknown): CapabilityCandidate[] {
  if (!Array.isArray(value)) return []
  return value.filter((candidate): candidate is CapabilityCandidate => {
    return candidate && typeof candidate === "object" && typeof candidate.id === "string" && (candidate.type === "tool" || candidate.type === "workflow")
  })
}

export function createCorePlan(input: PlannerInput = {}, graph: CapabilityGraphInput) {
  const text = getText(input)
  const safeOnly = input.safeOnly !== false
  const includeWorkflows = input.includeWorkflows !== false
  const preferWorkflow = input.preferWorkflow !== false
  const resolver = resolveCoreCapabilities(
    {
      intent: input.intent,
      query: input.query,
      safeOnly,
      includeWorkflows,
      maxResults: input.maxResults || 12,
    },
    graph
  )

  if (!resolver.ok) {
    return {
      ok: false as const,
      status: resolver.status,
      service: "grav-core" as const,
      error: resolver.error,
      resolver,
    }
  }

  const selected = getCandidateList(resolver.selected)
  const excluded = getCandidateList(resolver.excludedMatches)
  const warnings: string[] = []
  const executable = selected.filter(isExecutableCandidate)
  const approvalCandidates = selected.filter((candidate) => candidate.status === "requires-approval" || candidate.requiresApproval)

  let plannedCandidates: CapabilityCandidate[] = []
  const workflowCandidate = preferWorkflow
    ? executable.find((candidate) => candidate.type === "workflow")
    : undefined

  if (workflowCandidate) {
    plannedCandidates = [workflowCandidate]
  } else {
    plannedCandidates = executable
      .filter((candidate) => candidate.type === "tool")
      .filter((candidate) => !isPlannerMetaTool(candidate))
      .slice(0, Math.max(1, Math.min(6, input.maxResults || 6)))
  }

  if (approvalCandidates.length > 0) {
    warnings.push(`${approvalCandidates.length} matching candidates require approval and were not added to the executable safe plan.`)
  }

  if (excluded.length > 0) {
    warnings.push(`${excluded.length} matching candidates were excluded by safe policy.`)
  }

  if (plannedCandidates.length === 0) {
    warnings.push("No safe executable plan steps could be built from the resolved capabilities.")
  }

  const steps = plannedCandidates.map((candidate, index) => candidateToStep(candidate, index, input, text))

  const plan: CorePlan = {
    id: stablePlanId(text, steps),
    ok: steps.length > 0,
    service: "grav-core",
    generatedAt: new Date().toISOString(),
    intent: text,
    policy: {
      safeOnly,
      includeWorkflows,
      preferWorkflow,
      noFakeSuccess: true,
      execution: "Plan creation does not execute tools. /plan/run executes only safe non-approval steps unless a future reviewed approval path is added.",
    },
    summary: {
      totalSteps: steps.length,
      workflowSteps: steps.filter((step) => step.kind === "workflow").length,
      toolSteps: steps.filter((step) => step.kind === "tool").length,
      excludedCandidates: excluded.length,
      approvalCandidates: approvalCandidates.length,
    },
    steps,
    resolver: resolver as unknown as Record<string, unknown>,
    warnings,
  }

  return {
    ok: plan.ok,
    status: plan.ok ? 200 : 422,
    service: "grav-core" as const,
    plan,
  }
}

export async function runCorePlan(input: PlannerInput & { plan?: CorePlan; approved?: boolean } = {}, graph: CapabilityGraphInput, executeTool: ToolExecutor) {
  const created = input.plan && typeof input.plan === "object" ? { ok: true as const, status: 200, service: "grav-core" as const, plan: input.plan } : createCorePlan(input, graph)

  if (!created.ok || !created.plan) return created

  const plan = created.plan
  const startedAt = new Date().toISOString()
  const results = []

  for (const step of plan.steps) {
    if (step.risk !== "safe" || step.requiresApproval) {
      results.push({
        id: step.id,
        capabilityId: step.capabilityId,
        ok: false,
        status: 403,
        skipped: true,
        error: `Step ${step.capabilityId} is not safe for automatic plan execution.`,
      })
      continue
    }

    const started = Date.now()
    const result = await executeTool({
      toolName: step.kind === "workflow" ? "core.workflow.run" : step.capabilityId,
      input: step.kind === "workflow" ? { workflowId: step.capabilityId, input: step.input } : step.input,
    })

    results.push({
      id: step.id,
      capabilityId: step.capabilityId,
      kind: step.kind,
      ok: Boolean(result.ok),
      status: typeof result.status === "number" ? result.status : result.ok ? 200 : 500,
      durationMs: Date.now() - started,
      error: typeof result.error === "string" ? result.error : undefined,
      output: result,
    })
  }

  const failures = results.filter((result) => !result.ok)

  return {
    ok: failures.length === 0,
    status: failures.length === 0 ? 200 : 502,
    service: "grav-core" as const,
    startedAt,
    completedAt: new Date().toISOString(),
    plan,
    summary: {
      totalSteps: results.length,
      completedSteps: results.filter((result) => result.ok).length,
      failedSteps: failures.length,
    },
    results,
  }
}
