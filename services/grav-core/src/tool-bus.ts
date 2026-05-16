import type { GravityTool, GravityToolRisk } from "@gravity/contracts"

import { readAuditEvents } from "./audit.js"
import { searchMempalaceMemories } from "./memory.js"
import { getGravCoreStatus, gravCoreModules } from "./registry.js"
import { scanGravityWorkspace } from "./workspace-scan.js"

export type CoreToolRunInput = {
  toolName?: string
  input?: Record<string, unknown>
}

type ProxyTarget = {
  envName: string
  defaultPath: string
  moduleId: string
}

const proxyTargets: Record<string, ProxyTarget> = {
  "channels.inbox": {
    envName: "GRAVITY_CHANNELS_BASE_URL",
    defaultPath: "/inbox",
    moduleId: "channels",
  },
  "channels.send": {
    envName: "GRAVITY_CHANNELS_BASE_URL",
    defaultPath: "/send",
    moduleId: "channels",
  },
  "voice.session": {
    envName: "GRAVITY_VOICE_BASE_URL",
    defaultPath: "/session",
    moduleId: "voice",
  },
  "gateway.status": {
    envName: "GRAVITY_GATEWAY_BASE_URL",
    defaultPath: "/status",
    moduleId: "gateway",
  },
  "gateway.proxy": {
    envName: "GRAVITY_GATEWAY_BASE_URL",
    defaultPath: "/proxy",
    moduleId: "gateway",
  },
  "orchestration.workflow.run": {
    envName: "GRAVITY_ORCHESTRATION_BASE_URL",
    defaultPath: "/workflow/run",
    moduleId: "orchestration",
  },
}

export const gravityCoreTools: GravityTool[] = [
  {
    name: "core.status",
    title: "Core status",
    description: "Return Gravity Core status, module registry, provider registry, and route map.",
    moduleId: "core",
    risk: "safe",
    requiresApproval: false,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "core.modules.list",
    title: "List modules",
    description: "List Gravity modules and their exposed capabilities.",
    moduleId: "core",
    risk: "safe",
    requiresApproval: false,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "core.audit.read",
    title: "Read audit events",
    description: "Read recent Core audit events.",
    moduleId: "core",
    risk: "safe",
    requiresApproval: false,
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
  },
  {
    name: "memory.search",
    title: "Search MemPalace",
    description: "Search the real modules/memory MemPalace backend.",
    moduleId: "memory",
    risk: "safe",
    requiresApproval: false,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        wing: { type: "string" },
        room: { type: "string" },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "coding.scan",
    title: "Scan coding workspace",
    description: "Guarded repository inventory for routes, commands, fetch callers, and module entries.",
    moduleId: "coding",
    risk: "safe",
    requiresApproval: false,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "defense.scan",
    title: "Run defensive scan",
    description: "Guarded defensive scan for secret risks, TODO markers, and large skipped files.",
    moduleId: "defense",
    risk: "safe",
    requiresApproval: false,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "channels.inbox",
    title: "Channels inbox",
    description: "Proxy inbox reads to the configured channels module service.",
    moduleId: "channels",
    risk: "safe",
    requiresApproval: false,
    inputSchema: { type: "object", properties: { method: { type: "string" }, body: { type: "object" } } },
  },
  {
    name: "channels.send",
    title: "Channels send",
    description: "Proxy outbound messages to the configured channels module service. Approval is required.",
    moduleId: "channels",
    risk: "medium",
    requiresApproval: true,
    inputSchema: { type: "object", properties: { body: { type: "object" } } },
  },
  {
    name: "voice.session",
    title: "Voice session",
    description: "Create or proxy a realtime voice session through the configured voice module service.",
    moduleId: "voice",
    risk: "medium",
    requiresApproval: false,
    inputSchema: { type: "object", properties: { body: { type: "object" } } },
  },
  {
    name: "gateway.status",
    title: "Gateway status",
    description: "Read configured gateway service status.",
    moduleId: "gateway",
    risk: "safe",
    requiresApproval: false,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "gateway.proxy",
    title: "Gateway proxy",
    description: "Proxy a request through the configured gateway service. Approval is required.",
    moduleId: "gateway",
    risk: "medium",
    requiresApproval: true,
    inputSchema: { type: "object", properties: { body: { type: "object" } } },
  },
  {
    name: "orchestration.workflow.run",
    title: "Run orchestration workflow",
    description: "Dispatch a workflow to the configured orchestration module service. Approval is required.",
    moduleId: "orchestration",
    risk: "medium",
    requiresApproval: true,
    inputSchema: { type: "object", properties: { body: { type: "object" } } },
  },
]

function getTool(name: string) {
  return gravityCoreTools.find((tool) => tool.name === name)
}

function getBaseUrl(envName: string) {
  return process.env[envName]?.trim().replace(/\/$/, "") || ""
}

function normalizeLimit(input: unknown, fallback = 50) {
  return typeof input === "number" && Number.isFinite(input) ? Math.trunc(input) : fallback
}

function getString(input: unknown) {
  return typeof input === "string" ? input : ""
}

function approvalMissing(tool: GravityTool, input: Record<string, unknown>) {
  return tool.requiresApproval && input.approved !== true
}

async function proxyTool(toolName: string, input: Record<string, unknown>) {
  const target = proxyTargets[toolName]
  if (!target) {
    return { ok: false, status: 404, error: `No proxy target registered for ${toolName}.` }
  }

  const baseUrl = getBaseUrl(target.envName)
  if (!baseUrl) {
    return {
      ok: false,
      status: 503,
      moduleId: target.moduleId,
      error: `${target.envName} is not configured. Gravity cannot reach the ${target.moduleId} module service yet.`,
    }
  }

  const method = getString(input.method).toUpperCase() || (input.body ? "POST" : "GET")
  const requestPath = getString(input.path) || target.defaultPath
  const response = await fetch(`${baseUrl}${requestPath}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(input.body || {}),
  })
  const payload = await response.json().catch(() => ({}))

  return {
    ok: response.ok,
    status: response.status,
    moduleId: target.moduleId,
    upstream: `${baseUrl}${requestPath}`,
    payload,
  }
}

export function listGravitySkillsAndTools() {
  return {
    ok: true,
    service: "grav-core",
    timestamp: new Date().toISOString(),
    modules: gravCoreModules,
    tools: gravityCoreTools,
  }
}

export async function runGravityTool(payload: CoreToolRunInput) {
  const toolName = payload.toolName || ""
  const input = payload.input && typeof payload.input === "object" ? payload.input : {}
  const tool = getTool(toolName)

  if (!tool) {
    return {
      ok: false,
      status: 404,
      error: `Tool not found: ${toolName || "missing toolName"}`,
      availableTools: gravityCoreTools.map((item) => item.name),
    }
  }

  if (approvalMissing(tool, input)) {
    return {
      ok: false,
      status: 403,
      approvalRequired: true,
      tool,
      error: `${tool.name} requires approval. Re-run with input.approved=true after operator approval.`,
    }
  }

  try {
    if (tool.name === "core.status") {
      return { ok: true, status: 200, tool, data: getGravCoreStatus("standalone") }
    }

    if (tool.name === "core.modules.list") {
      return { ok: true, status: 200, tool, data: gravCoreModules }
    }

    if (tool.name === "core.audit.read") {
      return { ok: true, status: 200, tool, data: await readAuditEvents(normalizeLimit(input.limit)) }
    }

    if (tool.name === "memory.search") {
      return {
        ok: true,
        status: 200,
        tool,
        data: await searchMempalaceMemories({
          query: getString(input.query),
          wing: getString(input.wing) || undefined,
          room: getString(input.room) || undefined,
          limit: normalizeLimit(input.limit, 5),
        }),
      }
    }

    if (tool.name === "coding.scan") {
      const result = await scanGravityWorkspace({ mode: "coding" })
      return { ok: result.ok, status: result.ok ? 200 : result.status, tool, data: result }
    }

    if (tool.name === "defense.scan") {
      const result = await scanGravityWorkspace({ mode: "defense" })
      return { ok: result.ok, status: result.ok ? 200 : result.status, tool, data: result }
    }

    if (proxyTargets[tool.name]) {
      const result = await proxyTool(tool.name, input)
      return { ok: result.ok, status: result.status, tool, data: result }
    }

    return { ok: false, status: 501, tool, error: `${tool.name} is registered but not implemented yet.` }
  } catch (error) {
    return {
      ok: false,
      status: 500,
      tool,
      error: error instanceof Error ? error.message : `Unable to run ${tool.name}.`,
    }
  }
}
