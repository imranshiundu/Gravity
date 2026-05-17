import type { GravityCoreStatus, GravityModule, GravityModelProvider } from "@gravity/contracts"

export const gravCoreModules: GravityModule[] = [
  {
    id: "assistant",
    name: "Grav Assistant",
    description: "Conversation contract and operator-facing assistant surface.",
    sourcePath: "services/grav-core/src/ollama.ts",
    connectionState: "connected",
    capabilities: [
      { id: "assistant.chat", title: "Assistant chat", description: "Route user messages through Core orchestration before provider execution.", status: "connected" },
      { id: "assistant.chat.audit", title: "Chat audit events", description: "Record redacted audit events for Core chat attempts.", status: "connected" },
      { id: "assistant.chat.memory", title: "MemPalace-aware chat", description: "Retrieve relevant snippets from modules/memory MemPalace and inject them into provider context.", status: "connected" },
      { id: "assistant.tools", title: "Module skill/tool access", description: "Expose connected module capabilities through Core /skills, /tools, and /tools/run.", status: "connected" },
    ],
  },
  {
    id: "core-bindings",
    name: "Universal Module Bindings",
    description: "Core-owned binding layer that inventories all known modules before routing, proxying, importing, or executing anything.",
    sourcePath: "services/grav-core/src/module-bindings.ts, services/grav-core/src/adapters",
    connectionState: "connected",
    capabilities: [
      { id: "modules.inventory", title: "Inventory all modules", description: "Inspect every known module source path for manifests, route files, route hints, CLI entrypoints, tool files, config, docs, service envs, and dangerous actions.", status: "connected" },
      { id: "modules.search", title: "Search all modules", description: "Search all known module source trees without executing code or modifying files.", status: "connected" },
      { id: "modules.read", title: "Read module file", description: "Safely read small text/code files from known module source paths only. Path escapes and credential-style files are blocked.", status: "connected" },
    ],
  },
  {
    id: "memory",
    name: "MemPalace Memory",
    description: "Memory, retrieval, and indexing module owned under modules/memory.",
    sourcePath: "modules/memory/mempalace",
    connectionState: "connected",
    capabilities: [
      { id: "memory.search", title: "Search MemPalace", description: "Search modules/memory through mempalace.searcher.search_memories.", status: "connected" },
      { id: "memory.inject", title: "Inject memory into chat", description: "Core uses MemPalace search results as context before provider execution.", status: "connected" },
      { id: "memory.mine", title: "Mine memory", description: "MemPalace CLI remains the ingestion path for mining projects and conversations.", status: "registered" },
    ],
  },
  {
    id: "coding",
    name: "Coding",
    description: "Repository and coding capability contract across OpenHands, Aider, and Claw modules.",
    sourcePath: "modules/coding-openhands, modules/coding-aider, modules/coding-claw, services/grav-core/src/coding-execution.ts",
    connectionState: "connected",
    capabilities: [
      { id: "coding.scan", title: "Repository scan", description: "Guarded local repository inventory for routes, commands, fetch callers, and module entries.", status: "connected" },
      { id: "coding.modules.inventory", title: "Coding module inventory", description: "Inventories the real OpenHands, Aider, and Claw module source trees for manifests, CLI entrypoints, routes, tools, and HTTP clients.", status: "connected" },
      { id: "coding.modules.search", title: "Search coding modules", description: "Searches the real coding module source trees without executing code or modifying files.", status: "connected" },
      { id: "coding.modules.read", title: "Read coding module file", description: "Reads small text/code files from coding modules only; credential-style files and workspace escape paths are blocked.", status: "connected" },
      { id: "coding.execution.contracts", title: "Coding execution contracts", description: "Reports reviewed execution contracts, env gates, supported actions, and safety policy for coding modules.", status: "connected" },
      { id: "coding.openhands.run", title: "OpenHands execution", description: "Approval-gated service proxy through GRAVITY_OPENHANDS_BASE_URL. It allows only reviewed OpenHands route prefixes and never starts OpenHands itself.", status: "registered" },
      { id: "coding.aider.run", title: "Aider dry-run execution", description: "Approval-gated dry-run through the real modules/coding-aider CLI contract when GRAVITY_ENABLE_CODING_EXECUTION=true. Write/edit mode is not enabled.", status: "registered" },
      { id: "coding.claw.run", title: "Claw execution", description: "Registered as dangerous and approval-gated, but still returns honest 501 until the module route/CLI contract is verified.", status: "registered" },
    ],
  },
  {
    id: "defense",
    name: "Defense",
    description: "Defensive security and local audit capability contract.",
    sourcePath: "modules/defense",
    connectionState: "connected",
    capabilities: [
      { id: "defense.scan", title: "Defensive scan", description: "Guarded local checks for secret-like assignments, TODO markers, and large skipped files.", status: "connected" },
    ],
  },
  {
    id: "voice",
    name: "Voice",
    description: "Realtime voice session contract.",
    sourcePath: "modules/voice, services/grav-core/src/adapters/voice-adapter.ts",
    connectionState: "registered",
    capabilities: [
      { id: "voice.inventory", title: "Voice inventory", description: "Inspect voice module source and probe configured voice service routes.", status: "connected" },
      { id: "voice.session", title: "Voice session", description: "Proxy or create realtime sessions when GRAVITY_VOICE_BASE_URL is configured.", status: "registered" },
      { id: "voice.tts", title: "Voice TTS", description: "Proxy text-to-speech through the configured voice module service.", status: "registered" },
      { id: "voice.stt", title: "Voice STT", description: "Proxy speech-to-text through the configured voice module service.", status: "registered" },
    ],
  },
  {
    id: "channels",
    name: "Channels",
    description: "External channel service adapter contract.",
    sourcePath: "modules/channels, services/grav-core/src/adapters/channels-adapter.ts",
    connectionState: "registered",
    capabilities: [
      { id: "channels.inventory", title: "Channels inventory", description: "Inspect channels module source and probe configured channels service routes.", status: "connected" },
      { id: "channels.inbox", title: "Channel inbox", description: "Proxy inbox reads/writes to GRAVITY_CHANNELS_BASE_URL when configured.", status: "registered" },
      { id: "channels.send", title: "Channel send", description: "Proxy outbound channel send calls after operator approval.", status: "registered" },
    ],
  },
  {
    id: "gateway",
    name: "Gateway",
    description: "Gateway and traffic-control module contract.",
    sourcePath: "modules/gateway, services/grav-core/src/adapters/gateway-adapter.ts",
    connectionState: "registered",
    capabilities: [
      { id: "gateway.inventory", title: "Gateway inventory", description: "Inspect gateway module source and probe configured gateway service routes.", status: "connected" },
      { id: "gateway.status", title: "Gateway status", description: "Read configured gateway service status.", status: "registered" },
      { id: "gateway.proxy", title: "Gateway proxy", description: "Proxy configured gateway calls after operator approval.", status: "registered" },
    ],
  },
  {
    id: "orchestration",
    name: "Orchestration",
    description: "Agent and workflow orchestration capability contract.",
    sourcePath: "modules/orchestration, services/grav-core/src/adapters/orchestration-adapter.ts",
    connectionState: "registered",
    capabilities: [
      { id: "orchestration.inventory", title: "Orchestration inventory", description: "Inspect orchestration source and probe configured agent/workflow routes.", status: "connected" },
      { id: "orchestration.workflow.run", title: "Run workflow", description: "Dispatch workflows to the configured orchestration service after operator approval.", status: "registered" },
    ],
  },
  {
    id: "ollama",
    name: "Ollama",
    description: "Local LLM provider contract and optional modules/ollama source binding.",
    sourcePath: "modules/ollama, services/grav-core/src/adapters/ollama-adapter.ts",
    connectionState: "registered",
    capabilities: [
      { id: "ollama.inventory", title: "Ollama inventory", description: "Inspect modules/ollama if present and probe OLLAMA_BASE_URL.", status: "connected" },
      { id: "ollama.models", title: "Ollama models", description: "List models through OLLAMA_BASE_URL /api/tags.", status: "registered" },
      { id: "ollama.generate", title: "Ollama generate", description: "Proxy generate requests through OLLAMA_BASE_URL /api/generate.", status: "registered" },
      { id: "ollama.chat", title: "Ollama chat", description: "Proxy chat requests through OLLAMA_BASE_URL /api/chat.", status: "registered" },
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
