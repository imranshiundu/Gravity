import type { GravityTool } from "@gravity/contracts"

import { getChannelsInventory, readChannelsInbox, sendChannelMessage } from "./adapters/channels-adapter.js"
import { getGatewayInventory, getGatewayStatus, proxyGatewayRequest } from "./adapters/gateway-adapter.js"
import { getOllamaInventory, listOllamaModels, runOllamaChatAdapter, runOllamaGenerate } from "./adapters/ollama-adapter.js"
import { getOrchestrationInventory, runOrchestrationWorkflow } from "./adapters/orchestration-adapter.js"
import { getVoiceInventory, createVoiceSession, runVoiceStt, runVoiceTts } from "./adapters/voice-adapter.js"
import { readAuditEvents } from "./audit.js"
import { getChannelsReviewedContract, readChannelsModuleFile, searchChannelsModule } from "./channels-module.js"
import { getCodingExecutionContracts, runAiderAction, runClawAction, runOpenHandsAction } from "./coding-execution.js"
import {
  getCodingModuleInventory,
  readCodingModuleFile,
  searchCodingModules,
} from "./coding-modules.js"
import {
  getCoreModuleInventory,
  getDefenseModuleInventory,
  readCoreModuleFile,
  readDefenseModuleFile,
  scanDefenseModuleFindings,
  searchCoreModule,
  searchDefenseModule,
} from "./core-defense-modules.js"
import { getGatewayReviewedContract, readGatewayModuleFile, searchGatewayModule } from "./gateway-module.js"
import { searchMempalaceMemories } from "./memory.js"
import { getUnifiedModuleInventory, readUnifiedModuleFile, searchUnifiedModules } from "./module-bindings.js"
import { getOllamaReviewedContract, readOllamaModuleFile, searchOllamaModule } from "./ollama-module.js"
import { getOrchestrationReviewedContract, readOrchestrationModuleFile, searchOrchestrationModule } from "./orchestration-module.js"
import { getGravCoreStatus, gravCoreModules } from "./registry.js"
import { getVoiceReviewedContract, readVoiceModuleFile, searchVoiceModule } from "./voice-module.js"
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
const inventorySchema = { type: "object", properties: { includeFiles: { type: "boolean" }, includeRoutes: { type: "boolean" } } }
const searchSchema = { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } }, required: ["query"] }
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
  tool("core.module.inventory", "Core module inventory", "Inspect the real modules/core source tree for manifests, routes, contracts, configs, docs, and CLI/tooling signals.", "core-module", "safe", false, inventorySchema),
  tool("core.module.search", "Search core module", "Search inside modules/core only without executing code or modifying files.", "core-module", "safe", false, searchSchema),
  tool("core.module.read", "Read core module file", "Read a small text/code file from modules/core only. Credential-style files and path escapes are blocked.", "core-module", "safe", false, safeReadSchema),
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
  tool("coding.execution.contracts", "Inspect coding execution contracts", "Return the reviewed execution contracts for OpenHands, Aider, and Claw, including required envs, supported actions, source verification, and safety policy.", "coding", "safe", false, codingExecutionContractSchema),
  tool("coding.openhands.run", "Run OpenHands action", "Approval-gated OpenHands service proxy. Requires GRAVITY_OPENHANDS_BASE_URL and only allows reviewed route prefixes. Core does not start OpenHands or fake success.", "coding-openhands", "dangerous", true, openHandsRunSchema),
  tool("coding.aider.run", "Run Aider dry-run", "Approval-gated Aider dry-run through the real modules/coding-aider CLI contract. Real write/edit mode is still unavailable.", "coding-aider", "dangerous", true, aiderRunSchema),
  tool("coding.claw.run", "Run Claw action", "Approval-gated Claw execution contract check. Returns 404 when modules/coding-claw is missing and 501 when no reviewed CLI/API contract exists.", "coding-claw", "dangerous", true, approvedServiceInputSchema),

  tool("defense.inventory", "Defense module inventory", "Inspect the real modules/defense source tree for manifests, routes, scanners, policy/config files, docs, and CLI/tooling signals.", "defense", "safe", false, inventorySchema),
  tool("defense.search", "Search defense module", "Search inside modules/defense only without executing code or modifying files.", "defense", "safe", false, searchSchema),
  tool("defense.read", "Read defense module file", "Read a small text/code file from modules/defense only. Credential-style files and path escapes are blocked.", "defense", "safe", false, safeReadSchema),
  tool("defense.scan", "Run defensive scan", "Guarded defensive scan for secret risks, TODO markers, and large skipped files across the configured workspace.", "defense"),
  tool("defense.module.scan", "Scan defense module findings", "Guarded defensive scan filtered to modules/defense findings only. Reports missing/no-finding states honestly.", "defense"),

  tool("channels.inventory", "Channels inventory", "Inspect channels module source and probe configured channel service routes.", "channels"),
  tool("channels.contract", "Channels reviewed contract", "Return the reviewed Channels service contract, current source inventory, and read/send path partitions.", "channels"),
  tool("channels.search", "Search channels module", "Search inside modules/channels only without executing code or modifying files.", "channels", "safe", false, searchSchema),
  tool("channels.read", "Read channels module file", "Read a small text/code file from modules/channels only. Credential-style files and path escapes are blocked.", "channels", "safe", false, safeReadSchema),
  tool("channels.inbox", "Channels inbox", "Read inbox data through the configured channels module service using reviewed read-only paths.", "channels", "safe", false, serviceInputSchema),
  tool("channels.send", "Channels send", "Send outbound messages through the configured channels module service. Approval is required and only reviewed send paths are allowed.", "channels", "medium", true, approvedServiceInputSchema),

  tool("voice.inventory", "Voice inventory", "Inspect voice module source and probe configured voice service routes.", "voice"),
  tool("voice.contract", "Voice reviewed contract", "Return the reviewed Voice service contract, current source inventory, and session/TTS/STT path partitions.", "voice"),
  tool("voice.search", "Search voice module", "Search inside modules/voice only without executing code or modifying files.", "voice", "safe", false, searchSchema),
  tool("voice.read", "Read voice module file", "Read a small text/code file from modules/voice only. Credential-style files and path escapes are blocked.", "voice", "safe", false, safeReadSchema),
  tool("voice.session", "Voice session", "Create or proxy a realtime voice session through the configured voice module service using reviewed session paths only.", "voice", "medium", false, serviceInputSchema),
  tool("voice.tts", "Voice TTS", "Run text-to-speech through the configured voice module service using reviewed TTS paths only.", "voice", "medium", false, serviceInputSchema),
  tool("voice.stt", "Voice STT", "Run speech-to-text through the configured voice module service using reviewed STT paths only.", "voice", "medium", false, serviceInputSchema),

  tool("gateway.inventory", "Gateway inventory", "Inspect gateway module source and probe configured gateway service routes.", "gateway"),
  tool("gateway.contract", "Gateway reviewed contract", "Return the reviewed Gateway service contract, current source inventory, and allowed proxy path prefixes.", "gateway"),
  tool("gateway.search", "Search gateway module", "Search inside modules/gateway only without executing code or modifying files.", "gateway", "safe", false, searchSchema),
  tool("gateway.read", "Read gateway module file", "Read a small text/code file from modules/gateway only. Credential-style files and path escapes are blocked.", "gateway", "safe", false, safeReadSchema),
  tool("gateway.status", "Gateway status", "Read configured gateway service status.", "gateway", "safe", false, serviceInputSchema),
  tool("gateway.proxy", "Gateway proxy", "Proxy an approved request through the configured gateway service. Only reviewed path prefixes are allowed.", "gateway", "medium", true, approvedServiceInputSchema),

  tool("orchestration.inventory", "Orchestration inventory", "Inspect orchestration module source and probe configured agent/workflow service routes.", "orchestration"),
  tool("orchestration.contract", "Orchestration reviewed contract", "Return the reviewed orchestration service contract, current source inventory, and read/workflow path partitions.", "orchestration"),
  tool("orchestration.search", "Search orchestration module", "Search inside modules/orchestration only without executing code or modifying files.", "orchestration", "safe", false, searchSchema),
  tool("orchestration.read", "Read orchestration module file", "Read a small text/code file from modules/orchestration only. Credential-style files and path escapes are blocked.", "orchestration", "safe", false, safeReadSchema),
  tool("orchestration.workflow.run", "Run orchestration workflow", "Dispatch a workflow to the configured orchestration module service. Approval is required and only reviewed workflow/run paths are allowed.", "orchestration", "medium", true, approvedServiceInputSchema),

  tool("ollama.inventory", "Ollama inventory", "Inspect Ollama module source if present and probe local Ollama API routes.", "ollama"),
  tool("ollama.contract", "Ollama reviewed contract", "Return the reviewed Ollama provider contract, current source inventory, and model/generate/chat path partitions.", "ollama"),
  tool("ollama.search", "Search Ollama module", "Search inside modules/ollama only without executing code or modifying files.", "ollama", "safe", false, searchSchema),
  tool("ollama.read", "Read Ollama module file", "Read a small text/code file from modules/ollama only. Credential-style files and path escapes are blocked.", "ollama", "safe", false, safeReadSchema),
  tool("ollama.models", "List Ollama models", "List models through OLLAMA_BASE_URL /api/tags using reviewed model-read paths only.", "ollama", "safe", false, serviceInputSchema),
  tool("ollama.generate", "Ollama generate", "Run a direct Ollama generate request through OLLAMA_BASE_URL /api/generate using reviewed generation paths only.", "ollama", "medium", false, serviceInputSchema),
  tool("ollama.chat", "Ollama chat", "Run a direct Ollama chat request through OLLAMA_BASE_URL /api/chat using reviewed chat paths only.", "ollama", "medium", false, serviceInputSchema),
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
    if (selectedTool.name === "core.module.inventory") {
      const result = await getCoreModuleInventory(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "core.module.search") {
      const result = await searchCoreModule(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "core.module.read") {
      const result = await readCoreModuleFile(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }

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
      const result = await getCodingExecutionContracts({ moduleId: getString(input.moduleId) || undefined })
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

    if (selectedTool.name === "defense.inventory") {
      const result = await getDefenseModuleInventory(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "defense.search") {
      const result = await searchDefenseModule(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "defense.read") {
      const result = await readDefenseModuleFile(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "defense.scan") {
      const result = await scanGravityWorkspace({ mode: "defense" })
      return { ok: result.ok, status: result.ok ? 200 : result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "defense.module.scan") {
      const result = await scanDefenseModuleFindings()
      return { ok: result.ok, status: result.ok ? 200 : result.status, tool: selectedTool, data: result }
    }

    if (selectedTool.name === "channels.inventory") return { ok: true, status: 200, tool: selectedTool, data: await getChannelsInventory() }
    if (selectedTool.name === "channels.contract") {
      const result = await getChannelsReviewedContract()
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "channels.search") {
      const result = await searchChannelsModule(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "channels.read") {
      const result = await readChannelsModuleFile(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "channels.inbox") {
      const result = await readChannelsInbox(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "channels.send") {
      const result = await sendChannelMessage(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }

    if (selectedTool.name === "voice.inventory") return { ok: true, status: 200, tool: selectedTool, data: await getVoiceInventory() }
    if (selectedTool.name === "voice.contract") {
      const result = await getVoiceReviewedContract()
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "voice.search") {
      const result = await searchVoiceModule(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "voice.read") {
      const result = await readVoiceModuleFile(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
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
    if (selectedTool.name === "gateway.contract") {
      const result = await getGatewayReviewedContract()
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "gateway.search") {
      const result = await searchGatewayModule(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "gateway.read") {
      const result = await readGatewayModuleFile(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "gateway.status") {
      const result = await getGatewayStatus(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "gateway.proxy") {
      const result = await proxyGatewayRequest(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }

    if (selectedTool.name === "orchestration.inventory") return { ok: true, status: 200, tool: selectedTool, data: await getOrchestrationInventory() }
    if (selectedTool.name === "orchestration.contract") {
      const result = await getOrchestrationReviewedContract()
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "orchestration.search") {
      const result = await searchOrchestrationModule(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "orchestration.read") {
      const result = await readOrchestrationModuleFile(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "orchestration.workflow.run") {
      const result = await runOrchestrationWorkflow(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }

    if (selectedTool.name === "ollama.inventory") return { ok: true, status: 200, tool: selectedTool, data: await getOllamaInventory() }
    if (selectedTool.name === "ollama.contract") {
      const result = await getOllamaReviewedContract()
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "ollama.search") {
      const result = await searchOllamaModule(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
    if (selectedTool.name === "ollama.read") {
      const result = await readOllamaModuleFile(input)
      return { ok: result.ok, status: result.status, tool: selectedTool, data: result }
    }
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
