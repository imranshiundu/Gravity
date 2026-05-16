import type { GravityCoreStatus, GravityModule, GravityModelProvider } from "@gravity/contracts"

export const gravCoreModules: GravityModule[] = [
  {
    id: "assistant",
    name: "Grav Assistant",
    description: "Conversation contract and operator-facing assistant surface.",
    sourcePath: "services/grav-core/src/ollama.ts",
    connectionState: "connected",
    capabilities: [
      {
        id: "assistant.chat",
        title: "Assistant chat",
        description: "Route user messages through Core orchestration before provider execution.",
        status: "connected",
      },
      {
        id: "assistant.chat.audit",
        title: "Chat audit events",
        description: "Record redacted audit events for Core chat attempts.",
        status: "connected",
      },
      {
        id: "assistant.chat.memory",
        title: "Memory-aware chat",
        description: "Retrieve relevant local memory snippets and inject them into the provider context.",
        status: "connected",
      },
    ],
  },
  {
    id: "memory",
    name: "Memory",
    description: "Shared local-first memory contract.",
    sourcePath: "services/grav-core/src/memory.ts, apps/web/app/api/memory",
    connectionState: "connected",
    capabilities: [
      {
        id: "memory.save",
        title: "Save memory",
        description: "Persist local memory entries through Gravity-owned routes.",
        status: "connected",
      },
      {
        id: "memory.search",
        title: "Search memory",
        description: "Search local memory entries through Gravity-owned routes and Core chat memory injection.",
        status: "connected",
      },
      {
        id: "memory.forget",
        title: "Forget memory",
        description: "Delete local memory entries by id or query.",
        status: "connected",
      },
    ],
  },
  {
    id: "coding",
    name: "Coding",
    description: "Repository and coding capability contract.",
    sourcePath: "apps/web/app/api/coding",
    connectionState: "connected",
    capabilities: [
      {
        id: "coding.scan",
        title: "Repository scan",
        description: "Guarded local repository inventory and route/fetch detection.",
        status: "connected",
      },
    ],
  },
  {
    id: "defense",
    name: "Defense",
    description: "Defensive security and local audit capability contract.",
    sourcePath: "apps/web/app/api/defense",
    connectionState: "connected",
    capabilities: [
      {
        id: "defense.scan",
        title: "Defensive scan",
        description: "Guarded local checks for secret-like assignments, TODOs, and large skipped files.",
        status: "connected",
      },
    ],
  },
  {
    id: "voice",
    name: "Voice",
    description: "Realtime voice session contract.",
    sourcePath: "apps/web/app/api/voice",
    connectionState: "registered",
    capabilities: [
      {
        id: "voice.session",
        title: "Voice session",
        description: "Proxy or create realtime sessions when configured.",
        status: "registered",
      },
    ],
  },
  {
    id: "channels",
    name: "Channels",
    description: "External channel service adapter contract.",
    sourcePath: "apps/web/app/api/channels",
    connectionState: "registered",
    capabilities: [
      {
        id: "channels.inbox",
        title: "Channel inbox",
        description: "Proxy inbox reads/writes to the configured channels service.",
        status: "registered",
      },
    ],
  },
  {
    id: "gateway",
    name: "Gateway",
    description: "Gateway and traffic-control module contract.",
    sourcePath: "modules/gateway",
    connectionState: "registered",
    capabilities: [
      {
        id: "gateway.status",
        title: "Gateway status",
        description: "Registered only; route/control adapter not implemented yet.",
        status: "registered",
      },
    ],
  },
]

export const gravCoreProviders: GravityModelProvider[] = [
  {
    id: "ollama.local",
    name: "Ollama Local",
    kind: "local",
    statusEndpoint: "/providers",
  },
]

export function getGravCoreStatus(mode: GravityCoreStatus["mode"] = "standalone"): GravityCoreStatus {
  return {
    ok: true,
    service: "grav-core",
    version: "0.0.1",
    timestamp: new Date().toISOString(),
    mode,
    modules: gravCoreModules,
    providers: gravCoreProviders,
    endpoints: {
      status: "/status",
      health: "/health",
      modules: "/modules",
      providers: "/providers",
      chat: "/chat",
      audit: "/audit",
    },
  }
}
