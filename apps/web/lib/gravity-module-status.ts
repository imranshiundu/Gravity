export type GravityModuleStatusId =
  | "core"
  | "core-bindings"
  | "memory"
  | "channels"
  | "voice"
  | "coding"
  | "defense"
  | "gateway"
  | "orchestration"
  | "ollama"

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

export const gravityModuleStatuses: Record<GravityModuleStatusId, GravityModuleStatus> = {
  core: {
    id: "core",
    name: "Gravity Core",
    sourcePath: "services/grav-core",
    language: "typescript/node-http",
    endpoint: "/api/core/status, /api/core/skills, /api/core/tools, /api/core/tools/run",
    connectionState: "registered",
    interfaceRole: "backend-only",
    capabilities: ["module-registry", "provider-registry", "core-health", "tool-bus", "audit", "chat"],
    adapter: {
      implemented: true,
      notes:
        "services/grav-core exposes /health, /status, /modules, /providers, /skills, /tools, /tools/run, /audit, /chat, and /memory/search. Web bridges call it through GRAVITY_CORE_BASE_URL when configured.",
    },
  },
  "core-bindings": {
    id: "core-bindings",
    name: "Universal Module Bindings",
    sourcePath: "services/grav-core/src/module-bindings.ts, services/grav-core/src/adapters",
    language: "typescript/core-adapters",
    endpoint: "Core tools: modules.inventory, modules.search, modules.read",
    connectionState: "connected",
    interfaceRole: "backend-only",
    capabilities: ["module-inventory", "route-discovery", "source-search", "safe-read", "service-probe", "service-proxy"],
    adapter: {
      implemented: true,
      notes:
        "Core now inventories all known /modules source trees and provides dedicated adapters for channels, voice, gateway, orchestration, and Ollama. Missing envs are reported as unavailable instead of faking success.",
    },
  },
  memory: {
    id: "memory",
    name: "MemPalace Memory",
    sourcePath: "modules/memory/mempalace",
    language: "python module bridged through services/grav-core",
    endpoint: "/api/memory/status, /api/memory/search, Core POST /memory/search, Core tool memory.search",
    connectionState: "connected",
    interfaceRole: "backend-only",
    capabilities: ["memory", "retrieval", "indexing", "mempalace-search", "chat-context-injection"],
    adapter: {
      implemented: true,
      notes:
        "Gravity routes memory retrieval through the actual modules/memory MemPalace module when GRAVITY_CORE_BASE_URL is configured. Core calls mempalace.searcher.search_memories and injects those results into chat context. Local JSON is only an honest fallback.",
    },
  },
  channels: {
    id: "channels",
    name: "Channels",
    sourcePath: "modules/channels, services/grav-core/src/adapters/channels-adapter.ts",
    language: "python service behind Core adapter",
    endpoint: "Core tools: channels.inventory, channels.inbox, channels.send",
    connectionState: "registered",
    interfaceRole: "backend-only",
    capabilities: ["chat", "plugins", "multi-platform", "inbox-proxy", "send-approval"],
    adapter: {
      implemented: true,
      notes:
        "Channels are now bound through the Core adapter. Inventory is connected; inbox/send require GRAVITY_CHANNELS_BASE_URL. channels.send is approval-gated.",
    },
  },
  voice: {
    id: "voice",
    name: "Voice",
    sourcePath: "modules/voice, services/grav-core/src/adapters/voice-adapter.ts",
    language: "javascript/typescript service behind Core adapter",
    endpoint: "Core tools: voice.inventory, voice.session, voice.tts, voice.stt",
    connectionState: "registered",
    interfaceRole: "secondary",
    capabilities: ["realtime", "streaming-voice", "voice-agents", "session-adapter", "tts", "stt"],
    adapter: {
      implemented: true,
      notes:
        "Voice is now bound through the Core adapter. Inventory is connected; session/TTS/STT require GRAVITY_VOICE_BASE_URL.",
    },
  },
  coding: {
    id: "coding",
    name: "Coding",
    sourcePath: "modules/coding-openhands, modules/coding-aider, modules/coding-claw",
    language: "typescript adapter; python/rust modules remain source capabilities",
    endpoint: "Core tools: coding.scan, coding.modules.inventory, coding.modules.search, coding.modules.read",
    connectionState: "connected",
    interfaceRole: "reference",
    capabilities: ["coding", "repository-scanning", "route-inventory", "safe-source-read", "execution-registered-not-enabled"],
    adapter: {
      implemented: true,
      notes:
        "Core safely inventories/searches/reads OpenHands, Aider, and Claw module source trees. Edit/run actions are registered but intentionally unavailable until sandbox, allowlist, rollback, and audit policy are reviewed.",
    },
  },
  defense: {
    id: "defense",
    name: "Defense",
    sourcePath: "modules/defense",
    language: "typescript adapter; python module remains source capability",
    endpoint: "Core tool: defense.scan",
    connectionState: "connected",
    interfaceRole: "reference",
    capabilities: ["defensive-security", "audit", "secret-risk-scan", "todo-scan"],
    adapter: {
      implemented: true,
      notes:
        "Core exposes guarded defensive repository checks for secret-like assignments, TODO markers, and skipped large files. It does not run offensive scans.",
    },
  },
  gateway: {
    id: "gateway",
    name: "Gateway",
    sourcePath: "modules/gateway, services/grav-core/src/adapters/gateway-adapter.ts",
    language: "rust service behind Core adapter",
    endpoint: "Core tools: gateway.inventory, gateway.status, gateway.proxy",
    connectionState: "registered",
    interfaceRole: "backend-only",
    capabilities: ["gateway", "proxy", "traffic-control", "route-control", "approval-gated-proxy"],
    adapter: {
      implemented: true,
      notes:
        "Gateway is now bound through the Core adapter. Inventory is connected; status/proxy require GRAVITY_GATEWAY_BASE_URL. gateway.proxy is approval-gated.",
    },
  },
  orchestration: {
    id: "orchestration",
    name: "Orchestration",
    sourcePath: "modules/orchestration, services/grav-core/src/adapters/orchestration-adapter.ts",
    language: "typescript service behind Core adapter",
    endpoint: "Core tools: orchestration.inventory, orchestration.workflow.run",
    connectionState: "registered",
    interfaceRole: "engine-only",
    capabilities: ["agents", "workflows", "handoffs", "guardrails", "approval-gated-workflows"],
    adapter: {
      implemented: true,
      notes:
        "Orchestration is now bound through the Core adapter. Inventory is connected; workflow execution requires GRAVITY_ORCHESTRATION_BASE_URL and operator approval.",
    },
  },
  ollama: {
    id: "ollama",
    name: "Ollama",
    sourcePath: "modules/ollama, services/grav-core/src/adapters/ollama-adapter.ts",
    language: "local model provider behind Core adapter",
    endpoint: "Core tools: ollama.inventory, ollama.models, ollama.generate, ollama.chat",
    connectionState: "registered",
    interfaceRole: "engine-only",
    capabilities: ["local-llm", "model-provider", "model-listing", "chat", "generation"],
    adapter: {
      implemented: true,
      notes:
        "Ollama is now bound through the Core adapter. Inventory is connected; models/generate/chat require OLLAMA_BASE_URL.",
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
