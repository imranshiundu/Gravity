import { getAllGravityModuleStatuses } from "@/lib/gravity-module-status"

export type GravityCoreBridgeStatus = {
  ok: boolean
  service: "grav-core"
  version: string
  timestamp: string
  mode: "standalone" | "in-process" | "unavailable"
  modules: unknown[]
  providers: unknown[]
  endpoints: Record<string, string>
  upstream?: {
    configured: boolean
    url?: string
    error?: string
  }
}

export type GravityCoreChatInput = {
  model?: string
  messages: Array<{
    role: "system" | "user" | "assistant" | "tool"
    content: string
  }>
  context?: {
    workspaceId?: string
    sessionId?: string
    userId?: string
    modes?: string[]
  }
}

export type GravityCoreChatBridgeResult = {
  attempted: boolean
  ok: boolean
  status: number
  payload?: unknown
  error?: string
}

export type GravityCoreAuditBridgeResult = {
  attempted: boolean
  ok: boolean
  status: number
  payload?: unknown
  error?: string
}

function getCoreBaseUrl() {
  return process.env.GRAVITY_CORE_BASE_URL?.trim().replace(/\/$/, "") || ""
}

export function isGravityCoreConfigured() {
  return Boolean(getCoreBaseUrl())
}

function getInProcessCoreStatus(): GravityCoreBridgeStatus {
  const registry = getAllGravityModuleStatuses()

  return {
    ok: true,
    service: "grav-core",
    version: "0.0.1",
    timestamp: new Date().toISOString(),
    mode: "in-process",
    modules: registry.modules,
    providers: [
      {
        id: "ollama.local",
        name: "Ollama Local",
        kind: "local",
        statusEndpoint: "/api/ollama/status",
      },
    ],
    endpoints: {
      status: "/api/core/status",
      modules: "/api/modules/status",
      assistant: "/api/assistant/chat",
      memorySave: "/api/memory/save",
      memorySearch: "/api/memory/search",
      memoryForget: "/api/memory/forget",
      codingScan: "/api/coding/scan",
      defenseScan: "/api/defense/scan",
      voiceSession: "/api/voice/session",
      channelsInbox: "/api/channels/inbox",
    },
    upstream: {
      configured: false,
      error: "GRAVITY_CORE_BASE_URL is not set. Reporting in-process Gravity Web registry state.",
    },
  }
}

export async function getGravityCoreStatus(): Promise<GravityCoreBridgeStatus> {
  const baseUrl = getCoreBaseUrl()

  if (!baseUrl) {
    return getInProcessCoreStatus()
  }

  try {
    const response = await fetch(`${baseUrl}/status`, {
      method: "GET",
      cache: "no-store",
    })

    const payload = (await response.json()) as GravityCoreBridgeStatus

    if (!response.ok) {
      return {
        ...getInProcessCoreStatus(),
        ok: false,
        mode: "unavailable",
        upstream: {
          configured: true,
          url: baseUrl,
          error: `Grav Core returned HTTP ${response.status}.`,
        },
      }
    }

    return {
      ...payload,
      upstream: {
        configured: true,
        url: baseUrl,
      },
    }
  } catch (error) {
    return {
      ...getInProcessCoreStatus(),
      ok: false,
      mode: "unavailable",
      upstream: {
        configured: true,
        url: baseUrl,
        error: error instanceof Error ? error.message : "Unable to reach Grav Core.",
      },
    }
  }
}

export async function runGravityCoreChat(
  input: GravityCoreChatInput
): Promise<GravityCoreChatBridgeResult> {
  const baseUrl = getCoreBaseUrl()

  if (!baseUrl) {
    return {
      attempted: false,
      ok: false,
      status: 0,
      error: "GRAVITY_CORE_BASE_URL is not set.",
    }
  }

  try {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      cache: "no-store",
    })

    const payload = await response.json().catch(() => ({}))

    return {
      attempted: true,
      ok: response.ok,
      status: response.status,
      payload,
      error: response.ok
        ? undefined
        : typeof payload?.error === "string"
          ? payload.error
          : `Grav Core chat failed with status ${response.status}.`,
    }
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : "Unable to reach Grav Core chat.",
    }
  }
}

export async function getGravityCoreAuditEvents(limit = 50): Promise<GravityCoreAuditBridgeResult> {
  const baseUrl = getCoreBaseUrl()

  if (!baseUrl) {
    return {
      attempted: false,
      ok: false,
      status: 0,
      error: "GRAVITY_CORE_BASE_URL is not set.",
    }
  }

  try {
    const response = await fetch(`${baseUrl}/audit?limit=${encodeURIComponent(String(limit))}`, {
      method: "GET",
      cache: "no-store",
    })

    const payload = await response.json().catch(() => ({}))

    return {
      attempted: true,
      ok: response.ok,
      status: response.status,
      payload,
      error: response.ok
        ? undefined
        : typeof payload?.error === "string"
          ? payload.error
          : `Grav Core audit failed with status ${response.status}.`,
    }
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : "Unable to reach Grav Core audit.",
    }
  }
}
