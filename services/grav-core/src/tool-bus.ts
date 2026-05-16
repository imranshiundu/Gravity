import type { GravityTool, GravityToolRisk } from "@gravity/contracts"

import { readAuditEvents } from "./audit.js"
import {
  getCodingExecutionUnavailable,
  getCodingModuleInventory,
  readCodingModuleFile,
  searchCodingModules,
} from "./coding-modules.js"
import { searchMempalaceMemories } from "./memory.js"
import { getUnifiedModuleInventory, readUnifiedModuleFile, searchUnifiedModules } from "./module-bindings.js"
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

const moduleIdEnum = [
  "memory",
  "coding-openhands",
  "coding-aider",
  "coding-claw",
  "core-module",
  "defense",
  "gateway",
  "channels",
  "ollama",
  "orchestration",
  "voice",
]

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
    name: "modules.inventory",
    title: "Inventory all module bindings",
    description:
      "Inventory all known Gravity module source trees, manifests, routes, CLI entrypoints, tool files, service envs, and connection state without executing module code.",
    moduleId: "core",
    risk: "safe",
    requiresApproval: false,
    inputSchema: {
      type: "object",
      properties: {
        moduleId: { type: "string", enum: moduleIdEnum },
        includeFiles: { type: "boolean" },
        includeRoutes: { type: "boolean" },
      },
    },
  },
  {
    name: "modules.search",
    title: "Search all module source trees",
    description:
      "Search known module source trees for routes, tools, CLI entrypoints, configs, and capability contracts without executing module code.",
    moduleId: "core",
    risk: "safe",
    requiresApproval: false,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        moduleId: { type: "string", enum: moduleIdEnum },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "modules.read",
    title: "Read module source file",
    description:
      "Read a small text/code file from known module source paths only. Credential-style files and path escapes are blocked.",
    moduleId: "core",
    risk: "safe",
    requiresApproval: false,
    inputSchema: { type: "object", properties: { file: { type: "string" } }, required: ["file"] },
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
    name: "coding.modules.inventory",
    title: "Inventory coding modules",
    description:
      "Inspect real coding module manifests, CLI entrypoints, routes, tool files, HTTP clients, and warnings under modules/coding-openhands, modules/coding-aider, and modules/coding-claw.",
    moduleId: "coding",
    risk: "safe",
    requiresApproval: false,
    inputSchema: {
      type: "object",
      properties: {
        moduleId: {
          type: "string",
          enum: ["coding-openhands", "coding-aider", "coding-claw"],
        },
        includeFiles: { type: "boolean" },
      },
    },
  },
  {
    name: "coding.modules.search",
    title: "Search coding modules",
    description:
      "Search within the actual coding module source trees without executing code or modifying files.",
    moduleId: "coding",
    risk: "safe",
    requiresApproval: false,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        moduleId: {
          type: "string",
          enum: ["coding-openhands", "coding-aider", "coding-claw"],
        },
        limit: { type: "number" },
      },
      required: ["query"],
    },
  },
  {
    name: "coding.modules.read",
    title: "Read coding module file",
    description:
      "Read a small text/code file only from modules/coding-openhands, modules/coding-aider, or modules/coding-claw. Credential-style files are blocked.",
    moduleId: "coding",
    risk: "safe",
    requiresApproval: false,
    inputSchema: {
      type: "object",
      properties: {
        file: { type: "string" },
      },
      required: ["file"],
    },
  },
  {
    name: "coding.openhands.run",
    title: "Run OpenHands action",
    description:
      "Approval-gated placeholder for future OpenHands execution. Currently returns 501 until the real module contract and sandbox policy are reviewed.",
    moduleId: "coding-openhands",
    risk: "dangerous",
    requiresApproval: true,
    inputSchema: { type: "object", properties: { approved: { type: "boolean" }, body: { type: "object" } } },
  },
  {
    name: "coding.aider.run",
    title: "Run Aider action",
    description:
      "Approval-gated placeholder for future Aider execution. Currently returns 501 until the real CLI contract and edit policy are reviewed.",
    moduleId: "coding-aider",
    risk: "dangerous",
    requiresApproval: true,
    inputSchema: { type: "object", properties: { approved: { type: "boolean" }, body: { type: "object" } } },
  },
  {
    name: "coding.claw.run",
    title: "Run Claw action",
    description:
      "Approval-gated placeholder for future Claw execution. Currently returns 501 until the real module contract and sandbox policy are reviewed.",
    moduleId: "coding-claw",
    risk: "dangerous",
    requiresApproval: true,
    inputSchema: { type: "object", properties: { approved: { type: "boolean" }, body: { type: "object" } } },
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

    if (tool.name === "modules.inventory") {
      const result = await getUnifiedModuleInventory({
        moduleId: getString(input.moduleId) || undefined,
        includeFiles: input.includeFiles === true,
        includeRoutes: input.includeRoutes !== false,
      })
      return { ok: result.ok, status: result.status, tool, data: result }
    }

    if (tool.name === "modules.search") {
      const result = await searchUnifiedModules({
        query: getString(input.query),
        moduleId: getString(input.moduleId) || undefined,
        limit: normalizeLimit(input.limit, 30),
      })
      return { ok: result.ok, status: result.status, tool, data: result }
    }

    if (tool.name === "modules.read") {
      const result = await readUnifiedModuleFile({ file: getString(input.file) })
      return { ok: result.ok, status: result.status, tool, data: result }
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

    if (tool.name === "coding.modules.inventory") {
      const result = await getCodingModuleInventory({
        moduleId: getString(input.moduleId) || undefined,
        includeFiles: input.includeFiles === true,
      })
      return { ok: result.ok, status: result.status, tool, data: result }
    }

    if (tool.name === "coding.modules.search") {
      const result = await searchCodingModules({
        query: getString(input.query),
        moduleId: getString(input.moduleId) || undefined,
        limit: normalizeLimit(input.limit, 20),
      })
      return { ok: result.ok, status: result.status, tool, data: result }
    }

    if (tool.name === "coding.modules.read") {
      const result = await readCodingModuleFile({
        file: getString(input.file),
      })
      return { ok: result.ok, status: result.status, tool, data: result }
    }

    if (tool.name === "coding.openhands.run") {
      const result = getCodingExecutionUnavailable("coding-openhands", tool.name)
      return { ok: result.ok, status: result.status, tool, data: result, error: result.error }
    }

    if (tool.name === "coding.aider.run") {
      const result = getCodingExecutionUnavailable("coding-aider", tool.name)
      return { ok: result.ok, status: result.status, tool, data: result, error: result.error }
    }

    if (tool.name === "coding.claw.run") {
      const result = getCodingExecutionUnavailable("coding-claw", tool.name)
      return { ok: result.ok, status: result.status, tool, data: result, error: result.error }
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
