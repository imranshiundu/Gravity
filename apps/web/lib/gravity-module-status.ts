export type GravityModuleStatusId =
  | "core"
  | "memory"
  | "channels"
  | "voice"
  | "coding"
  | "defense"
  | "gateway"

export type GravityModuleConnectionState =
  | "connected"
  | "registered"
  | "missing"
  | "planned"

export type GravityModuleStatus = {
  id: GravityModuleStatusId
  name: string
  sourcePath: string
  language: string
  endpoint: string
  connectionState: GravityModuleConnectionState
  interfaceRole:
    | "primary"
    | "secondary"
    | "backend-only"
    | "engine-only"
    | "reference"
    | "missing"
  capabilities: string[]
  adapter: {
    implemented: boolean
    notes: string
  }
}

export const gravityModuleStatuses: Record<
  GravityModuleStatusId,
  GravityModuleStatus
> = {
  core: {
    id: "core",
    name: "Gravity Core",
    sourcePath: "services/grav-core",
    language: "typescript/node-http",
    endpoint: "/api/core/status",
    connectionState: "registered",
    interfaceRole: "backend-only",
    capabilities: ["module-registry", "provider-registry", "core-health", "shared-contracts"],
    adapter: {
      implemented: true,
      notes:
        "services/grav-core now exists and exposes /health, /status, /modules, /providers, /audit, /chat, and /memory/search. The web route /api/core/status bridges to GRAVITY_CORE_BASE_URL when configured, otherwise it reports the in-process Gravity Web registry honestly.",
    },
  },
  memory: {
    id: "memory",
    name: "MemPalace Memory",
    sourcePath: "modules/memory/mempalace",
    language: "python module bridged through services/grav-core",
    endpoint: "/api/memory/status, /api/memory/search, Core POST /memory/search",
    connectionState: "connected",
    interfaceRole: "backend-only",
    capabilities: ["memory", "retrieval", "indexing", "mempalace-search", "chat-context-injection"],
    adapter: {
      implemented: true,
      notes:
        "Gravity now routes memory retrieval through the actual modules/memory MemPalace module when GRAVITY_CORE_BASE_URL is configured. Core calls mempalace.searcher.search_memories and injects those results into chat context. The web local JSON store is now only an honest fallback when Core is not configured.",
    },
  },
  channels: {
    id: "channels",
    name: "Channels",
    sourcePath: "modules/channels",
    language: "python service behind proxy adapter",
    endpoint: "/api/channels/status",
    connectionState: "registered",
    interfaceRole: "backend-only",
    capabilities: ["chat", "plugins", "multi-platform", "inbox-proxy"],
    adapter: {
      implemented: true,
      notes:
        "Gravity Web now exposes /api/channels/inbox as an honest proxy adapter. It requires GRAVITY_CHANNELS_BASE_URL; without that environment variable it returns 503 instead of fake inbox data.",
    },
  },
  voice: {
    id: "voice",
    name: "Voice",
    sourcePath: "apps/voice-console, apps/voice-realtime-agents",
    language: "javascript/typescript",
    endpoint: "/api/voice/status",
    connectionState: "registered",
    interfaceRole: "secondary",
    capabilities: ["realtime", "streaming-voice", "voice-agents", "session-adapter"],
    adapter: {
      implemented: true,
      notes:
        "Gravity Web now exposes /api/voice/session. It can proxy GRAVITY_VOICE_BASE_URL or create OpenAI Realtime sessions directly when OPENAI_API_KEY is configured.",
    },
  },
  coding: {
    id: "coding",
    name: "Coding",
    sourcePath: "modules/coding-openhands, modules/coding-aider, modules/coding-claw",
    language: "typescript adapter; python/rust modules remain source capabilities",
    endpoint: "/api/coding/status",
    connectionState: "connected",
    interfaceRole: "reference",
    capabilities: ["coding", "agent-execution", "repository-scanning", "route-inventory"],
    adapter: {
      implemented: true,
      notes:
        "Gravity Web now exposes /api/coding/scan for guarded local repository inspection. It requires GRAVITY_ENABLE_LOCAL_TOOLS=true and GRAVITY_WORKSPACE_ROOT. Edit/run actions are still intentionally not implemented.",
    },
  },
  defense: {
    id: "defense",
    name: "Defense",
    sourcePath: "modules/defense",
    language: "typescript adapter; python module remains source capability",
    endpoint: "/api/defense/status",
    connectionState: "connected",
    interfaceRole: "reference",
    capabilities: ["defensive-security", "audit", "secret-risk-scan", "todo-scan"],
    adapter: {
      implemented: true,
      notes:
        "Gravity Web now exposes /api/defense/scan for guarded defensive repository checks. It reports secret-like assignments, TODO markers, and skipped large files. It does not run offensive scans.",
    },
  },
  gateway: {
    id: "gateway",
    name: "Gateway",
    sourcePath: "modules/gateway",
    language: "rust",
    endpoint: "/api/gateway/status",
    connectionState: "registered",
    interfaceRole: "backend-only",
    capabilities: ["gateway", "proxy", "traffic-control"],
    adapter: {
      implemented: false,
      notes:
        "Gateway code is registered, but no web-facing route control or proxy adapter is connected to Gravity Web yet.",
    },
  },
}

export function getGravityModuleStatus(moduleId: GravityModuleStatusId) {
  return {
    ok: true,
    system: "Gravity",
    assistant: "Grav",
    timestamp: new Date().toISOString(),
    module: gravityModuleStatuses[moduleId],
  }
}

export function getAllGravityModuleStatuses() {
  return {
    ok: true,
    system: "Gravity",
    assistant: "Grav",
    timestamp: new Date().toISOString(),
    modules: Object.values(gravityModuleStatuses),
  }
}
