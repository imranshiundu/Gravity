import type { GravityChatInput, GravityChatMessage } from "@gravity/contracts"

import { maybeRunAssistantToolIntent } from "./assistant-tool-use.js"
import { buildMemoryContextMessage, searchCoreMemories, summarizeMemoryUse } from "./memory.js"

const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434"

export type GravCoreChatResult = {
  ok: boolean
  status: number
  payload: {
    ok: boolean
    assistant: "Grav"
    runtime: "grav-core"
    provider?: "ollama.local"
    model?: string
    content?: string
    memory?: ReturnType<typeof summarizeMemoryUse>
    toolUse?: unknown
    approvalRequests?: unknown[]
    raw?: unknown
    error?: string
  }
}

function getOllamaBaseUrl() {
  return process.env.OLLAMA_BASE_URL?.trim().replace(/\/$/, "") || DEFAULT_OLLAMA_BASE_URL
}

function getDefaultModel() {
  return process.env.GRAV_DEFAULT_MODEL?.trim() || ""
}

function isValidMessage(message: unknown): message is GravityChatMessage {
  if (!message || typeof message !== "object") {
    return false
  }

  const candidate = message as Partial<GravityChatMessage>

  return (
    typeof candidate.content === "string" &&
    ["system", "user", "assistant", "tool"].includes(candidate.role || "")
  )
}

function normalizeMessages(messages: unknown): GravityChatMessage[] {
  if (!Array.isArray(messages)) {
    return []
  }

  return messages.filter(isValidMessage).map((message) => ({
    role: message.role,
    content: message.content,
  }))
}

export async function runOllamaChat(input: GravityChatInput): Promise<GravCoreChatResult> {
  const model = input.model?.trim() || getDefaultModel()
  const messages = normalizeMessages(input.messages)

  if (messages.length === 0) {
    return {
      ok: false,
      status: 400,
      payload: {
        ok: false,
        assistant: "Grav",
        runtime: "grav-core",
        provider: "ollama.local",
        model,
        error: "At least one valid message is required.",
      },
    }
  }

  const toolUseResult = await maybeRunAssistantToolIntent(messages, input.context)
  if (toolUseResult.handled && toolUseResult.payload) {
    return {
      ok: toolUseResult.payload.ok,
      status: toolUseResult.status,
      payload: toolUseResult.payload,
    }
  }

  const memoryResult = await searchCoreMemories({ ...input, messages })
  const memoryContextMessage = buildMemoryContextMessage(memoryResult)
  const providerMessages = memoryContextMessage ? [memoryContextMessage, ...messages] : messages
  const memorySummary = summarizeMemoryUse(memoryResult)

  if (!model) {
    return {
      ok: false,
      status: 400,
      payload: {
        ok: false,
        assistant: "Grav",
        runtime: "grav-core",
        provider: "ollama.local",
        memory: memorySummary,
        error: "A model is required. Provide model or set GRAV_DEFAULT_MODEL.",
      },
    }
  }

  try {
    const response = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: providerMessages,
        stream: false,
      }),
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        payload: {
          ok: false,
          assistant: "Grav",
          runtime: "grav-core",
          provider: "ollama.local",
          model,
          memory: memorySummary,
          error:
            typeof payload?.error === "string"
              ? payload.error
              : `Ollama request failed with status ${response.status}.`,
          raw: payload,
        },
      }
    }

    return {
      ok: true,
      status: 200,
      payload: {
        ok: true,
        assistant: "Grav",
        runtime: "grav-core",
        provider: "ollama.local",
        model,
        memory: memorySummary,
        content:
          typeof payload?.message?.content === "string" ? payload.message.content : "",
        raw: payload,
      },
    }
  } catch (error) {
    return {
      ok: false,
      status: 502,
      payload: {
        ok: false,
        assistant: "Grav",
        runtime: "grav-core",
        provider: "ollama.local",
        model,
        memory: memorySummary,
        error: error instanceof Error ? error.message : "Unable to reach Ollama.",
      },
    }
  }
}
