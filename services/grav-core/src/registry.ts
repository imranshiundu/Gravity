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
        title: "MemPalace-aware chat",
        description: "Retrieve relevant snippets from modules/memory MemPalace and inject them into provider context.",
        status: "connected",
      },
      {
        id: "assistant.tools",
        title: "Module skill/tool access",
        description: "Expose connected module capabilities through Core /skills, /tools, and /tools/run.",
        status: "connected",
      },
    ],
  },
  {
    id: "memory",
    name: "MemPalace Memory",
    description: "Memory, retrieval, and indexing module owned under modules/memory.",
    sourcePath: "modules/memory/mempalace",
    connectionState: "connected",
    capabilities: [
      {
        id: "memory.search",
        title: "Search MemPalace",
        description: "Search modules/memory through mempalace.searcher.search_memories.",
        status: "connected",
      },
      {
        id: "memory.inject",
        title: "Inject memory into chat",
        description: "Core uses MemPalace search results as context before provider execution.",
        status: "connected",
      },
      {
        id: "memory.mine",
        title: "Mine memory",
        description: "MemPalace CLI remains the ingestion path for mining projects and conversations.",
        status: "registered",
      },
    ],
  },
  {
    id: "coding",
    name: "Coding",
    description: "Repository and coding capability contract across OpenHands, Aider, and Claw references.",
    sourcePath: "modules/coding-openhands, modules/coding-aider, modules/coding-claw",
    connectionState: "connected",
    capabilities: [
      {
        id: "coding.scan",
        title: "Repository scan",
        description: "Guarded local repository inventory for routes, commands, fetch callers, and module entries.",
        status: "connected",
      },
      {
        id: "coding.edit",
        title: "Repository editing",
        description: "Registered from coding modules but not executable through Core until approval/edit gates are implemented.",
        status: "registered",
      },
    ],
  },
  {
    id: "defense",
    name: "Defense",
    description: "Defensive security and local audit capability contract.",
    sourcePath: "modules/defense",
    connectionState: "connected",
    capabilities: [
      {
        id: "defense.scan",
        title: "Defensive scan",
        description: "Guarded local checks for secret-like assignments, TODO markers, and large skipped files.",
        status: "connected",
      },
    ],
  },
  {
    id: "voice",
    name: "Voice",
    description: "Realtime voice session contract.",
    sourcePath: "modules/voice, apps/voice-console, apps/voice-realtime-agents",
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
    sourcePath: "modules/channels",
    connectionState: "registered",
    capabilities: [
      {
        id: "channels.inbox",
        title: "Channel inbox",
        description: "Proxy inbox reads/writes to the configured channels service.",
        status: "registered",
      },
      {
        id: "channels.send",
        title: "Channel send",
        description: "Proxy outbound channel send calls after operator approval.",
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
        description: "Read configured gateway service status.",
        status: "registered",
      },
      {
        id: "gateway.proxy",
        title: "Gateway proxy",
        description: "Proxy configured gateway calls after operator approval.",
        status: "registered",
      },
    ],
  },
  {
    id: "orchestration",
    name: "Orchestration",
    description: "Agent and workflow orchestration capability contract.",
    sourcePath: "modules/orchestration",
    connectionState: "registered",
    capabilities: [
      {
        id: "orchestration.workflow.run",
        title: "Run workflow",
        description: "Dispatch workflows to the configured orchestration service after operator approval.",
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
      skills: "/skills",
      tools: "/tools",
      runTool: "/tools/run",
      chat: "/chat",
      audit: "/audit",
      memorySearch: "/memory/search",
    },
  }
}
