import type { GravityApprovalRequest, GravityChatMessage, GravityTool } from "@gravity/contracts"

import { gravityCoreTools, runGravityTool } from "./tool-bus.js"

export type AssistantToolUseResult = {
  handled: boolean
  status: number
  payload?: {
    ok: boolean
    assistant: "Grav"
    runtime: "grav-core"
    mode: "tool-use"
    content: string
    toolUse: {
      strategy: "deterministic-intent"
      intent: string
      toolName?: string
      executed: boolean
      requiresApproval: boolean
      result?: unknown
      error?: string
    }
    approvalRequests?: GravityApprovalRequest[]
  }
}

type ToolIntent = {
  intent: string
  toolName: string
  input: Record<string, unknown>
  confidence: number
  reason: string
}

function getLastUserMessage(messages: GravityChatMessage[]) {
  return [...messages].reverse().find((message) => message.role === "user")?.content.trim() || ""
}

function getTool(toolName: string) {
  return gravityCoreTools.find((tool) => tool.name === toolName)
}

function cleanQuery(message: string) {
  return message
    .replace(/^(search|find|look up|lookup|check|scan|show|get|list|read)\s+/i, "")
    .replace(/\b(memory|mempalace|modules?|routes?|tools?|skills?|status|audit|events?)\b/gi, "")
    .trim()
}

function parseExplicitToolIntent(message: string): ToolIntent | null {
  const match = message.match(/(?:^|\b)(?:tool|run tool|use tool)\s*[:=]\s*([a-z0-9._-]+)/i)
  if (!match?.[1]) return null

  const toolName = match[1]
  const input: Record<string, unknown> = {}
  const jsonMatch = message.match(/```json\s*([\s\S]*?)```/i) || message.match(/\binput\s*[:=]\s*(\{[\s\S]*\})/i)

  if (jsonMatch?.[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.assign(input, parsed)
      }
    } catch {
      input.__parseWarning = "Input JSON could not be parsed; running with empty input."
    }
  }

  return {
    intent: "explicit-tool-call",
    toolName,
    input,
    confidence: 1,
    reason: `User explicitly requested Core tool ${toolName}.`,
  }
}

function inferToolIntent(message: string): ToolIntent | null {
  const normalized = message.toLowerCase()
  const explicit = parseExplicitToolIntent(message)
  if (explicit) return explicit

  if (/\b(audit|events?|logs?)\b/.test(normalized) && /\b(core|gravity|grav|system|recent|show|list|read)\b/.test(normalized)) {
    return {
      intent: "audit-events",
      toolName: "core.audit.read",
      input: { limit: 25 },
      confidence: 0.82,
      reason: "User asked for recent Core/system audit events.",
    }
  }

  if (/\b(health|status|running|online|core)\b/.test(normalized) && /\b(core|gravity|grav|system|service)\b/.test(normalized)) {
    return {
      intent: "core-status",
      toolName: "core.status",
      input: {},
      confidence: 0.8,
      reason: "User asked for Gravity/Core status.",
    }
  }

  if (/\b(route matrix|routes?|endpoints?|module map|all modules|modules inventory|connected modules|tool bus|skills|tools)\b/.test(normalized)) {
    return {
      intent: "module-inventory",
      toolName: "modules.inventory",
      input: { includeRoutes: true },
      confidence: 0.86,
      reason: "User asked about module routes, endpoints, tools, skills, or connection state.",
    }
  }

  if (/\b(search|find|lookup|look up)\b/.test(normalized) && /\b(memory|mempalace)\b/.test(normalized)) {
    return {
      intent: "memory-search",
      toolName: "memory.search",
      input: { query: cleanQuery(message) || message, limit: 5 },
      confidence: 0.78,
      reason: "User asked to search memory through MemPalace.",
    }
  }

  if (/\b(ollama|models?|local llm)\b/.test(normalized) && /\b(list|show|get|available|installed)\b/.test(normalized)) {
    return {
      intent: "ollama-models",
      toolName: "ollama.models",
      input: {},
      confidence: 0.8,
      reason: "User asked for available Ollama models.",
    }
  }

  if (/\b(gateway)\b/.test(normalized) && /\b(status|health|running|online)\b/.test(normalized)) {
    return {
      intent: "gateway-status",
      toolName: "gateway.status",
      input: {},
      confidence: 0.78,
      reason: "User asked for gateway status.",
    }
  }

  if (/\b(channels?|inbox|messages?)\b/.test(normalized) && /\b(inbox|read|show|list|get)\b/.test(normalized)) {
    return {
      intent: "channels-inbox",
      toolName: "channels.inbox",
      input: {},
      confidence: 0.76,
      reason: "User asked to read the configured channels inbox.",
    }
  }

  if (/\b(defense|security|secret|secrets|risk)\b/.test(normalized) && /\b(scan|check|audit|inspect)\b/.test(normalized)) {
    return {
      intent: "defense-scan",
      toolName: "defense.scan",
      input: {},
      confidence: 0.79,
      reason: "User asked for a defensive scan.",
    }
  }

  if (/\b(coding|openhands|aider|claw|repo|repository)\b/.test(normalized) && /\b(scan|inventory|inspect|search|routes?|entrypoints?)\b/.test(normalized)) {
    return {
      intent: "coding-inventory",
      toolName: "coding.modules.inventory",
      input: { includeFiles: false },
      confidence: 0.78,
      reason: "User asked to inspect coding module capabilities.",
    }
  }

  if (/\b(send|post|publish|reply|message)\b/.test(normalized) && /\b(channel|channels|telegram|discord|slack|email)\b/.test(normalized)) {
    return {
      intent: "channels-send-approval",
      toolName: "channels.send",
      input: { body: { request: message } },
      confidence: 0.72,
      reason: "User asked for an outbound channel action, which requires approval.",
    }
  }

  if (/\b(proxy|forward|route request)\b/.test(normalized) && /\bgateway\b/.test(normalized)) {
    return {
      intent: "gateway-proxy-approval",
      toolName: "gateway.proxy",
      input: { body: { request: message } },
      confidence: 0.72,
      reason: "User asked for a gateway proxy action, which requires approval.",
    }
  }

  if (/\b(run|start|execute|dispatch)\b/.test(normalized) && /\b(workflow|orchestration|agent)\b/.test(normalized)) {
    return {
      intent: "workflow-run-approval",
      toolName: "orchestration.workflow.run",
      input: { body: { request: message } },
      confidence: 0.73,
      reason: "User asked to run an orchestration workflow, which requires approval.",
    }
  }

  if (/\b(run|execute|edit|modify|write|patch)\b/.test(normalized) && /\b(aider|openhands|claw|coding)\b/.test(normalized)) {
    const toolName = normalized.includes("openhands")
      ? "coding.openhands.run"
      : normalized.includes("claw")
        ? "coding.claw.run"
        : "coding.aider.run"

    return {
      intent: "coding-execution-approval",
      toolName,
      input: { body: { request: message } },
      confidence: 0.72,
      reason: "User asked for coding execution/editing, which is dangerous and not enabled without contract review.",
    }
  }

  return null
}

function createApprovalRequest(intent: ToolIntent, selectedTool: GravityTool): GravityApprovalRequest {
  const now = Date.now()
  return {
    id: `approval_${now}_${selectedTool.name.replace(/[^a-z0-9]/gi, "_")}`,
    toolName: selectedTool.name,
    risk: selectedTool.risk,
    summary: `Approval required for ${selectedTool.name}`,
    reason: intent.reason,
    proposedInput: intent.input,
    expiresAt: new Date(now + 10 * 60_000).toISOString(),
  }
}

function summarizeToolResult(toolName: string, result: Awaited<ReturnType<typeof runGravityTool>>) {
  if (!result.ok) {
    return `${toolName} returned ${result.status}: ${result.error || "The tool did not complete successfully."}`
  }

  return `${toolName} completed. I attached the structured tool result in toolUse.result so the UI can render the details.`
}

export async function maybeRunAssistantToolIntent(messages: GravityChatMessage[]): Promise<AssistantToolUseResult> {
  const lastUserMessage = getLastUserMessage(messages)
  if (!lastUserMessage) return { handled: false, status: 200 }

  const intent = inferToolIntent(lastUserMessage)
  if (!intent || intent.confidence < 0.7) return { handled: false, status: 200 }

  const selectedTool = getTool(intent.toolName)
  if (!selectedTool) {
    return {
      handled: true,
      status: 404,
      payload: {
        ok: false,
        assistant: "Grav",
        runtime: "grav-core",
        mode: "tool-use",
        content: `I understood the tool intent, but ${intent.toolName} is not registered in Core yet.`,
        toolUse: {
          strategy: "deterministic-intent",
          intent: intent.intent,
          toolName: intent.toolName,
          executed: false,
          requiresApproval: false,
          error: "Tool is not registered.",
        },
      },
    }
  }

  if (selectedTool.requiresApproval || selectedTool.risk === "dangerous" || selectedTool.risk === "disallowed") {
    const approvalRequest = createApprovalRequest(intent, selectedTool)
    return {
      handled: true,
      status: 202,
      payload: {
        ok: false,
        assistant: "Grav",
        runtime: "grav-core",
        mode: "tool-use",
        content: `${selectedTool.name} needs operator approval before Gravity can run it. I created an approval request instead of executing it blindly.`,
        toolUse: {
          strategy: "deterministic-intent",
          intent: intent.intent,
          toolName: selectedTool.name,
          executed: false,
          requiresApproval: true,
        },
        approvalRequests: [approvalRequest],
      },
    }
  }

  if (selectedTool.risk !== "safe") {
    const approvalRequest = createApprovalRequest(intent, selectedTool)
    return {
      handled: true,
      status: 202,
      payload: {
        ok: false,
        assistant: "Grav",
        runtime: "grav-core",
        mode: "tool-use",
        content: `${selectedTool.name} is not marked safe, so Gravity will not run it automatically from chat. Operator approval is required.`,
        toolUse: {
          strategy: "deterministic-intent",
          intent: intent.intent,
          toolName: selectedTool.name,
          executed: false,
          requiresApproval: true,
        },
        approvalRequests: [approvalRequest],
      },
    }
  }

  const result = await runGravityTool({ toolName: selectedTool.name, input: intent.input })

  return {
    handled: true,
    status: result.status,
    payload: {
      ok: result.ok,
      assistant: "Grav",
      runtime: "grav-core",
      mode: "tool-use",
      content: summarizeToolResult(selectedTool.name, result),
      toolUse: {
        strategy: "deterministic-intent",
        intent: intent.intent,
        toolName: selectedTool.name,
        executed: true,
        requiresApproval: false,
        result: result.data,
        error: result.error,
      },
    },
  }
}
