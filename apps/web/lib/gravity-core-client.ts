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

function getCoreBaseUrl() {
  return process.env.GRAVITY_CORE_BASE_URL?.trim().replace(/\/$/, "") || ""
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
