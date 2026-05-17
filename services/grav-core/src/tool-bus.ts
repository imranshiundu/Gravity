import type { GravityTool } from "@gravity/contracts"

import { getChannelsInventory, readChannelsInbox, sendChannelMessage } from "./adapters/channels-adapter.js"
import { getGatewayInventory, getGatewayStatus, proxyGatewayRequest } from "./adapters/gateway-adapter.js"
import { getOllamaInventory, listOllamaModels, runOllamaChatAdapter, runOllamaGenerate } from "./adapters/ollama-adapter.js"
import { getOrchestrationInventory, runOrchestrationWorkflow } from "./adapters/orchestration-adapter.js"
import { getVoiceInventory, createVoiceSession, runVoiceStt, runVoiceTts } from "./adapters/voice-adapter.js"
import { readAuditEvents } from "./audit.js"
import { getCodingExecutionContracts, runAiderAction, runClawAction, runOpenHandsAction } from "./coding-execution.js"
import {
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

function tool(
  name: string,
  title: string,
  description: string,
  moduleId: string,
  risk: GravityTool["risk"] = "safe",
  requiresApproval = false,
  inputSchema: Record<string, unknown> = { type: "object", properties: {} }
): GravityTool {
  return { name, title, description, moduleId, risk, requiresApproval, inputSchema }
}

const safeReadSchema = { type: "object", properties: { file: { type: "string" } }, required: ["file"] }
const serviceInputSchema = {
  type: "object",
  properties: {
    method: { type: "string" },
    path: { type: "string" },
    body: { type: "object" },
  },
}
const approvedServiceInputSchema = {
  type: "object",
  properties: {
    approved: { type: "boolean" },
    method: { type: "string" },
    path: { type: "string" },
    body: { type: "object" },
  },
}
const codingExecutionContractSchema = {
  type: "object",
  properties: { moduleId: { type: "string", enum: ["coding-openhands", "coding-aider", "coding-claw"] } },
}
const aiderRunSchema = {
  type: "object",
  properties: {
    approved: { type: "boolean" },
    action: { type: "string", enum: ["dry-run"] },
    prompt: { type: "string" },
    message: { type: "string" },
    cwd: { type: "string" },
    files: { type: "array", items: { type: "string" } },
    model: { type: "string" },
    timeoutMs: { type: "number" },
  },
}
const openHandsRunSchema = {
  type: "object",
  properties: {
    approved: { type: "boolean" },
    action: { type: "string", enum: ["proxy"] },
    method: { type: "string" },
    path: { type: "string" },
    body: { type: "object" },
    timeoutMs: { type: "number" },
  },
}

export const gravityCoreTools: GravityTool[] = [
  tool("core.status", "Core status", "Return Gravity Core status, module registry, provider registry, and route map.", "core"),
  tool("core.modules.list", "List modules", "List Gravity modules and their exposed capabilities.", "core"),
  tool("core.audit.read", "Read audit events", "Read recent Core audit events.", "core", "safe", false, {
    type: "object",
    properties: { limit: { type: "number" } },
  }),
  tool(
    "modules.inventory",
    "Inventory all module bindings",
    "Inventory all known Gravity module source trees, manifests, routes, CLI entrypoints, tool files, service envs, and connection state without executing module code.",
    "core",
    "safe",
    false,
    { type: "object", properties: { moduleId: { type: "string", enum: moduleIdEnum }, includeFiles: { type: "boolean" }, includeRoutes: { type: "boolean" } } }
  ),
  tool(
    "modules.search",
    "Search all module source trees",
    "Search known module source trees for routes, tools, CLI entrypoints, configs, and capability contracts without executing module code.",
    "core",
    "safe",
    false,
    { type: "object", properties: { query: { type: "string" }, moduleId: { type: "string", enum: moduleIdEnum }, limit: { type: "number" } }, required: ["query"] }
  ),
  tool("modules.read", "Read module source file", "Read a small text/code file from known module source paths only. Credential-style files and path escapes are blocked.", "core", "safe", false, safeReadSchema),

  tool("memory.search", "Search MemPalace", "Search the real modules/memory MemPalace backend.", "memory", "safe", false, {
    type: "object",
    properties: { query: { type: "string" }, wing: { type: "string" }, room: { type: "string" }, limit: { type: "number" } },
    required: ["query"],
  }),

  tool("coding.scan", "Scan coding workspace", "Guarded repository inventory for routes, commands, fetch callers, and module entries.", "coding"),
  tool("coding.modules.inventory", "Inventory coding modules", "Inspect real coding module manifests, CLI entrypoints, routes, tool files, HTTP clients, and warnings under modules/coding-openhands, modules/coding-aider, and modules/coding-claw.", "coding", "safe", false, {
    type: "object",
    properties: { moduleId: { type: "string", enum: ["coding-openhands", "coding-aider", "coding-claw"] }, includeFiles: { type: "boolean" } },
  }),
  tool("coding.modules.search", "Search coding modules", "Search within the actual coding module source trees without executing code or modifying files.", "coding", "safe", false, {
    type: "object",
    properties: { query: { type: "string" }, moduleId: { type: "string", enum: ["coding-openhands", "coding-aider", "coding-claw"] }, limit: { type: "number" } },
    required: ["query"],
  }),
  tool("coding.modules.read", "Read coding module file", "Read a small text/code file only from modules/coding-openhands, modules/coding-aider, or modules/coding-claw. Credential-style files are blocked.", "coding", "safe", false, safeReadSchema),
  tool("coding.execution.contracts", "Inspect coding execution contracts", "Return the reviewed execution contracts for OpenHands, Aider, and Claw, including required envs, supported actions, and safety policy.", "coding", "safe", false, codingExecutionContractSchema),
  tool("coding.openhands.run", "Run OpenHands action", "Approval-gated OpenHands service proxy. Requires GRAVITY_OPENHANDS_BASE_URL and only allows reviewed route prefixes. Core does not start OpenHands or fake success.", "coding-openhands", "dangerous", true, openHandsRunSchema),
  tool("coding.aider.run", "Run Aider dry-run", "Approval-gated Aider dry-run through the real modules/coding-aider CLI contract. Real write/edit mode is still unavailable.", "coding-aider", "dangerous", true, aiderRunSchema),
  tool("coding.claw.run", "Run Claw action", "Approval-gated Claw placeholder. Currently returns 501 until the real module route/CLI contract is verified.", "coding-claw", "dangerous", true, approvedServiceInputSchema),

  tool("defense.scan", "Run defensive scan", "Guarded defensive scan for secret risks, TODO markers, and large skipped files.", "defense"),

  tool("channels.inventory", "Channels inventory", "Inspect channels module source and probe configured channel service routes.", "channels"),
  tool("channels.inbox", "Channels inbox", "Read inbox data through the configured channels module service.", "channels", "safe", false, serviceInputSchema),
  tool("channels.send", "Channels send", "Send outbound messages through the configured channels module service. Approval is required.", "channels", "medium", true, approvedServiceInputSchema),

  tool("voice.inventory", "Voice inventory", "Inspect voice module source and probe configured voice service routes.", "voice"),
  tool("voice.session", "Voice session", "Create or proxy a realtime voice session through the configured voice module service.", "voice", "medium", false, serviceInputSchema),
  tool("voice.tts", "Voice TTS", "Run text-to-speech through the configured voice module service.", "voice", "medium", false, serviceInputSchema),
  tool("voice.stt", "Voice STT", "Run speech-to-text through the configured voice module service.", "voice", "medium", false, serviceInputSchema),

  tool("gateway.inventory", "Gateway inventory", "Inspect gateway module source and probe configured gateway service routes.", "gateway"),
  tool("gateway.status", "Gateway status", "Read configured gateway service status.", "gateway", "safe", false, serviceInputSchema),
  tool("gateway.proxy", "Gateway proxy", "Proxy a request through the configured gateway service. Approval is required.", "gateway", "medium", true, approvedServiceInputSchema),

  tool("orchestration.inventory", "Orchestration inventory", "Inspect orchestration module source and probe configured agent/workflow service routes.", "orchestration"),
  tool("orchestration.workflow.run", "Run orchestration workflow", "Dispatch a workflow to the configured orchestration module service. Approval is required.", "orchestration", "medium", true, approvedServiceInputSchema),

  tool("ollama.inventory", "Ollama inventory", "Inspect Ollama module source if present and probe local Ollama API routes.", "ollama"),
  tool("ollama.models", "List Ollama models", "List models through OLLAMA_BASE_URL /api/tags.", "ollama", "safe", false, serviceInputSchema),
  tool("ollama.generate", "Ollama generate", "Run a direct Ollama generate request through the configured provider endpoint.", "ollama", "medium", false, serviceInputSchema),
  tool("ollama.chat", "Ollama chat", "Run a direct Ollama chat request through the configured provider endpoint.", "ollama", "medium", false, serviceInputSchema),
]

function getTool(name: string) {
  return gravityCoreTools.find((item) => item.name === name)
}

function normalizeLimit(input: unknown, fallback = 50) {
  return typeof input === "number" && Number.isFinite(input) ? Math.trunc(input) : fallback
}

function getString(input: unknown) {
  return typeof input === "string" ? input : ""
}

function approvalMissing(selectedTool: GravityTool, input: Record<string, unknown>) {
  return selectedTool.requiresApproval && input.approved !== true
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
  const selectedTool = getTool(toolName)

  if (!selectedTool) {
    return {
      ok: false,
      status: 404,
      error: `Tool not found: ${toolName || "missing toolName"}`,
      availableTools: gravityCoreTools.map((item) => item.name),
    }
  }

  if (approvalMissing(selectedTool, input)) {
    return {
      ok: false,
      status: 403,
      approvalRequired: true,
      tool: selectedTool,
      error: `${selectedTool.name} requires approval. Re-run with input.approved=true after operator approval.`,
    }
  }

  try {
    if (selectedTool.name === "core.status") return { ok: true, status: 200, tool: selectedTool, data: getGravCoreStatus("standalone") }
    if (selectedTool.name === "core.modules.list") return { ok: true, status: 200, tool: selectedTool, data: gravCoreModules }
    if (selectedTool.name === "core.audit.read") return { ok: true, status: 200, tool: selectedTool, data: await readAuditEvents(normalizeLimit(input.limit)) }

    if (selectedTool.name === "modules.inventory") {
      const result = await getUnifiedModuleInventory({ moduleId: getString(input.moduleId) || undefined, includeFiles: input.includeFiles === true, includeRoutes: input.includeRoutes !== false })
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "modules.search") {
      const result = await searchUnifiedModules({ query: getString(input.query), moduleId: getString(input.moduleId) || undefined, limit: normalizeLimit(input.limit, 30) })
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "modules.read") {
      const result = await readUnifiedModuleFile({ file: getString(input.file) })
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }

    if (selectedTool.name === "memory.search") {
      return { ok: true, status: 200, tool: selectedTool, data: await searchMempalaceMemories({ query: getString(input.query), wing: getString(input.wing) || undefined, room: getString(input.room) || undefined, limit: normalizeLimit(input.limit, 5) }) }
    }

    if (selectedTool.name === "coding.scan") {
      const result = await scanGravityWorkspace({ mode: "coding" })
      return { ok: result.ok, status: result.ok ? 200 : result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "coding.modules.inventory") {
      const result = await getCodingModuleInventory({ moduleId: getString(input.moduleId) || undefined, includeFiles: input.includeFiles === true })
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "coding.modules.search") {
      const result = await searchCodingModules({ query: getString(input.query), moduleId: getString(input.moduleId) || undefined, limit: normalizeLimit(input.limit, 20) })
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "coding.modules.read") {
      const result = await readCodingModuleFile({ file: getString(input.file) })
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "coding.execution.contracts") {
      const result = getCodingExecutionContracts({ moduleId: getString(input.moduleId) || undefined })
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result, error: result.ok ? undefined : result.error }
    }
    if (selectedTool.name === "coding.openhands.run") {
      const result = await runOpenHandsAction(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result, error: result.error }
    }
    if (selectedTool.name === "coding.aider.run") {
      const result = await runAiderAction(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result, error: result.error }
    }
    if (selectedTool.name === "coding.claw.run") {
      const result = await runClawAction(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result, error: result.error }
    }

    if (selectedTool.name === "defense.scan") {
      const result = await scanGravityWorkspace({ mode: "defense" })
      return { ok: result.ok, status: result.ok ? 200 : result.status, tool: selectedTool, data: result }
    }

    if (selectedTool.name === "channels.inventory") return { ok: true, status: 200, tool: selectedTool, data: await getChannelsInventory() }
    if (selectedTool.name === "channels.inbox") {
      const result = await readChannelsInbox(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "channels.send") {
      const result = await sendChannelMessage(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }

    if (selectedTool.name === "voice.inventory") return { ok: true, status: 200, tool: selectedTool, data: await getVoiceInventory() }
    if (selectedTool.name === "voice.session") {
      const result = await createVoiceSession(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "voice.tts") {
      const result = await runVoiceTts(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "voice.stt") {
      const result = await runVoiceStt(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }

    if (selectedTool.name === "gateway.inventory") return { ok: true, status: 200, tool: selectedTool, data: await getGatewayInventory() }
    if (selectedTool.name === "gateway.status") {
      const result = await getGatewayStatus(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "gateway.proxy") {
      const result = await proxyGatewayRequest(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }

    if (selectedTool.name === "orchestration.inventory") return { ok: true, status: 200, tool: selectedTool, data: await getOrchestrationInventory() }
    if (selectedTool.name === "orchestration.workflow.run") {
      const result = await runOrchestrationWorkflow(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }

    if (selectedTool.name === "ollama.inventory") return { ok: true, status: 200, tool: selectedTool, data: await getOllamaInventory() }
    if (selectedTool.name === "ollama.models") {
      const result = await listOllamaModels(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "ollama.generate") {
      const result = await runOllamaGenerate(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "ollama.chat") {
      const result = await runOllamaChatAdapter(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }

    return { ok: false, status: 501, tool: selectedTool, error: `${selectedTool.name} is registered but not implemented yet.` }
  } catch (error) {
    return {
      ok: false,
      status: 500,
      tool: selectedTool,
      error: error instanceof Error ? error.message : `Unable to run ${selectedTool.name}.`,
    }
  }
}
