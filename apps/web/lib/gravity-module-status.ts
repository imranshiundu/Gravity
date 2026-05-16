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
    sourcePath: "modules/core",
    language: "typescript",
    endpoint: "/api/core/status",
    connectionState: "missing",
    interfaceRole: "missing",
    capabilities: ["assistant-core-patterns", "terminal-agent-ux", "sessions", "tools"],
    adapter: {
      implemented: false,
      notes:
        "The module registry names modules/core, but no Gravity Core service package or web adapter is present yet. Build services/grav-core before marking this connected.",
    },
  },
  memory: {
    id: "memory",
    name: "Memory",
    sourcePath: "modules/memory",
    language: "python",
    endpoint: "/api/memory/status",
    connectionState: "registered",
    interfaceRole: "backend-only",
    capabilities: ["memory", "retrieval", "indexing"],
    adapter: {
      implemented: false,
      notes:
        "MemPalace exists in the repository, but the web app does not yet expose save, search, or forget adapters through Gravity-owned routes.",
    },
  },
  channels: {
    id: "channels",
    name: "Channels",
    sourcePath: "modules/channels",
    language: "python",
    endpoint: "/api/channels/status",
    connectionState: "registered",
    interfaceRole: "backend-only",
    capabilities: ["chat", "plugins", "multi-platform"],
    adapter: {
      implemented: false,
      notes:
        "AstrBot/channel code is present as a backend/reference module. Its dashboard and channel actions have not yet been folded into Gravity-owned web endpoints.",
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
    capabilities: ["realtime", "streaming-voice", "voice-agents"],
    adapter: {
      implemented: false,
      notes:
        "Voice prototypes expose their own /session, /token, /api/session, and /api/responses routes. Gravity Web does not yet proxy them through /api/voice/*.",
    },
  },
  coding: {
    id: "coding",
    name: "Coding",
    sourcePath: "modules/coding-openhands, modules/coding-aider, modules/coding-claw",
    language: "python/rust",
    endpoint: "/api/coding/status",
    connectionState: "registered",
    interfaceRole: "reference",
    capabilities: ["coding", "agent-execution", "repository-editing"],
    adapter: {
      implemented: false,
      notes:
        "Coding modules are imported as capability sources, but Gravity Web does not yet expose repository scan, edit, or run contracts for them.",
    },
  },
  defense: {
    id: "defense",
    name: "Defense",
    sourcePath: "modules/defense",
    language: "python",
    endpoint: "/api/defense/status",
    connectionState: "registered",
    interfaceRole: "reference",
    capabilities: ["defensive-security", "audit", "system-tooling"],
    adapter: {
      implemented: false,
      notes:
        "Defense/ODK code is present as a reference capability, but Gravity-owned defensive scan and report endpoints are not implemented yet.",
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
