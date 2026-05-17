import type { GravityTool } from "@gravity/contracts"

type WorkflowLike = {
  id: string
  title: string
  description: string
  risk: "safe" | "medium" | "dangerous"
  requiresApproval: boolean
  allowedToolNames: string[]
  blockedToolKinds: string[]
}

type CapabilityGraphInput = {
  tools: GravityTool[]
  workflows: WorkflowLike[]
}

type ResolveInput = {
  intent?: string
  query?: string
  safeOnly?: boolean
  includeWorkflows?: boolean
  maxResults?: number
}

type CapabilityMatch = {
  id: string
  type: "tool" | "workflow"
  title: string
  description: string
  moduleId: string
  risk: "safe" | "medium" | "dangerous" | "disallowed"
  requiresApproval: boolean
  score: number
  matchedTags: string[]
  status: "candidate" | "requires-approval" | "excluded-by-safe-policy"
  runHint?: Record<string, unknown>
}

const CAPABILITY_TAGS: Record<string, string[]> = {
  "core.status": ["core", "status", "health", "system", "registry", "state"],
  "core.modules.list": ["core", "modules", "list", "registry", "capabilities"],
  "core.audit.read": ["audit", "events", "logs", "history", "trace"],
  "core.workflow.list": ["workflow", "workflows", "list", "plan", "orchestration", "coordination"],
  "core.workflow.run": ["workflow", "run", "execute", "coordinate", "plan", "health", "inventory"],
  "core.module.inventory": ["core", "module", "inventory", "routes", "endpoints", "contracts"],
  "core.module.search": ["core", "module", "search", "routes", "endpoints", "code"],
  "core.module.read": ["core", "module", "read", "file", "source", "code"],
  "modules.inventory": ["modules", "inventory", "routes", "endpoints", "tools", "skills", "features", "contracts", "scan"],
  "modules.search": ["modules", "search", "routes", "endpoints", "tools", "skills", "features", "contracts", "code"],
  "modules.read": ["modules", "read", "file", "source", "code"],
  "memory.search": ["memory", "mempalace", "remember", "recall", "context", "search", "knowledge"],
  "coding.scan": ["coding", "code", "repo", "repository", "scan", "routes", "commands", "endpoints"],
  "coding.modules.inventory": ["coding", "openhands", "aider", "claw", "inventory", "cli", "tools", "routes"],
  "coding.modules.search": ["coding", "openhands", "aider", "claw", "search", "code", "routes", "cli"],
  "coding.modules.read": ["coding", "openhands", "aider", "claw", "read", "file", "source"],
  "coding.execution.contracts": ["coding", "execution", "contracts", "openhands", "aider", "claw", "approval", "run"],
  "coding.openhands.run": ["openhands", "coding", "run", "agent", "edit", "proxy"],
  "coding.aider.run": ["aider", "coding", "run", "dry-run", "edit", "cli"],
  "coding.claw.run": ["claw", "coding", "run", "edit", "agent"],
  "defense.inventory": ["defense", "security", "inventory", "policy", "scanner", "routes"],
  "defense.search": ["defense", "security", "search", "policy", "scanner", "source"],
  "defense.read": ["defense", "security", "read", "file", "source"],
  "defense.scan": ["defense", "security", "scan", "secrets", "audit", "risk", "workspace"],
  "defense.module.scan": ["defense", "security", "scan", "module", "findings"],
  "channels.inventory": ["channels", "inbox", "email", "chat", "message", "inventory"],
  "channels.contract": ["channels", "contract", "send", "inbox", "message", "routes"],
  "channels.search": ["channels", "search", "source", "routes", "messages"],
  "channels.read": ["channels", "read", "source", "file"],
  "channels.inbox": ["channels", "inbox", "read", "messages"],
  "channels.send": ["channels", "send", "message", "outbound", "approval"],
  "voice.inventory": ["voice", "audio", "speech", "inventory", "session", "tts", "stt"],
  "voice.contract": ["voice", "contract", "audio", "speech", "session", "tts", "stt"],
  "voice.search": ["voice", "search", "audio", "speech", "source"],
  "voice.read": ["voice", "read", "source", "file"],
  "voice.session": ["voice", "session", "realtime", "audio", "speech"],
  "voice.tts": ["voice", "tts", "text-to-speech", "audio", "speak"],
  "voice.stt": ["voice", "stt", "speech-to-text", "transcribe", "audio"],
  "gateway.inventory": ["gateway", "inventory", "routes", "proxy", "traffic"],
  "gateway.contract": ["gateway", "contract", "proxy", "routes", "traffic"],
  "gateway.search": ["gateway", "search", "routes", "proxy", "source"],
  "gateway.read": ["gateway", "read", "source", "file"],
  "gateway.status": ["gateway", "status", "health", "routes"],
  "gateway.proxy": ["gateway", "proxy", "traffic", "route", "approval"],
  "orchestration.inventory": ["orchestration", "workflow", "agent", "handoff", "inventory", "routes"],
  "orchestration.contract": ["orchestration", "workflow", "agent", "contract", "handoff", "routes"],
  "orchestration.search": ["orchestration", "workflow", "agent", "search", "source"],
  "orchestration.read": ["orchestration", "workflow", "agent", "read", "file", "source"],
  "orchestration.workflow.run": ["orchestration", "workflow", "run", "agent", "dispatch", "approval"],
  "ollama.inventory": ["ollama", "model", "llm", "provider", "inventory", "local"],
  "ollama.contract": ["ollama", "model", "llm", "provider", "contract", "local"],
  "ollama.search": ["ollama", "search", "source", "model", "provider"],
  "ollama.read": ["ollama", "read", "source", "file", "provider"],
  "ollama.models": ["ollama", "models", "model", "llm", "provider", "tags", "local"],
  "ollama.generate": ["ollama", "generate", "llm", "model", "prompt", "completion"],
  "ollama.chat": ["ollama", "chat", "llm", "model", "conversation"],
}

const WORKFLOW_TAGS: Record<string, string[]> = {
  "gravity.system.health_check": ["system", "health", "check", "status", "audit", "memory", "ollama", "modules", "overall"],
  "gravity.modules.inventory_check": ["modules", "inventory", "routes", "endpoints", "tools", "skills", "contracts", "scan"],
  "gravity.providers.ollama_check": ["ollama", "provider", "model", "models", "llm", "health", "check"],
}

function unique<T>(items: T[]) {
  return [...new Set(items)]
}

function getText(input: ResolveInput) {
  return `${input.intent || ""} ${input.query || ""}`.toLowerCase().trim()
}

function tokenize(text: string) {
  return unique(
    text
      .toLowerCase()
      .replace(/[^a-z0-9_.-]+/g, " ")
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
  )
}

function normalizeMaxResults(input: unknown) {
  return typeof input === "number" && Number.isFinite(input) ? Math.max(1, Math.min(30, Math.trunc(input))) : 12
}

function isRiskAllowed(risk: GravityTool["risk"] | WorkflowLike["risk"], safeOnly: boolean) {
  if (!safeOnly) return true
  return risk === "safe"
}

function scoreCapability(tokens: string[], tags: string[], haystack: string) {
  let score = 0
  const matchedTags: string[] = []

  for (const token of tokens) {
    if (tags.includes(token)) {
      score += 12
      matchedTags.push(token)
      continue
    }

    if (haystack.includes(token)) {
      score += token.length > 3 ? 4 : 1
      continue
    }

    const fuzzyTag = tags.find((tag) => tag.includes(token) || token.includes(tag))
    if (fuzzyTag && token.length > 3) {
      score += 5
      matchedTags.push(fuzzyTag)
    }
  }

  return { score, matchedTags: unique(matchedTags) }
}

function getRunHint(match: Omit<CapabilityMatch, "runHint">) {
  if (match.type === "workflow") {
    return {
      endpoint: "POST /workflows/run",
      toolRunner: "core.workflow.run",
      body: { workflowId: match.id, input: {} },
    }
  }

  return {
    endpoint: "POST /tools/run",
    body: { toolName: match.id, input: {} },
  }
}

function toolToCapability(tool: GravityTool) {
  return {
    id: tool.name,
    type: "tool" as const,
    title: tool.title,
    description: tool.description,
    moduleId: tool.moduleId,
    risk: tool.risk,
    requiresApproval: tool.requiresApproval,
    tags: CAPABILITY_TAGS[tool.name] || [],
    inputSchema: tool.inputSchema,
  }
}

function workflowToCapability(workflow: WorkflowLike) {
  return {
    id: workflow.id,
    type: "workflow" as const,
    title: workflow.title,
    description: workflow.description,
    moduleId: "core-workflows",
    risk: workflow.risk,
    requiresApproval: workflow.requiresApproval,
    tags: WORKFLOW_TAGS[workflow.id] || [],
    allowedToolNames: workflow.allowedToolNames,
    blockedToolKinds: workflow.blockedToolKinds,
  }
}

export function listCoreCapabilities(graph: CapabilityGraphInput) {
  const tools = graph.tools.map(toolToCapability)
  const workflows = graph.workflows.map(workflowToCapability)
  const moduleIds = unique(tools.map((tool) => tool.moduleId).concat(workflows.map((workflow) => workflow.moduleId))).sort()

  const edges = [
    ...tools.map((tool) => ({ from: tool.moduleId, to: tool.id, relation: "module-exposes-tool" })),
    ...workflows.flatMap((workflow) =>
      workflow.allowedToolNames.map((toolName) => ({ from: workflow.id, to: toolName, relation: "workflow-can-call-tool" }))
    ),
  ]

  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    timestamp: new Date().toISOString(),
    policy: {
      connectedMeans: "The capability is registered in Core and resolves to a real Core tool/workflow. Service-backed tools may still return unavailable if their env/service is missing.",
      noFakeSuccess: true,
      defaultResolveMode: "safeOnly",
      dangerousActions: "edit/send/proxy/code-run/workflow-dispatch tools are visible in the graph but excluded from safe resolution unless safeOnly=false and approval is handled by the caller/tool.",
    },
    graph: {
      modules: moduleIds.map((id) => ({ id, type: "module" })),
      tools,
      workflows,
      edges,
    },
  }
}

export function resolveCoreCapabilities(input: ResolveInput = {}, graph: CapabilityGraphInput) {
  const text = getText(input)
  const tokens = tokenize(text)
  const safeOnly = input.safeOnly !== false
  const includeWorkflows = input.includeWorkflows !== false
  const maxResults = normalizeMaxResults(input.maxResults)
  const capabilities = listCoreCapabilities(graph).graph

  if (tokens.length === 0) {
    return {
      ok: false as const,
      status: 400,
      service: "grav-core",
      error: "intent or query is required to resolve capabilities.",
      examples: [
        "scan all module routes and endpoints",
        "search memory for Gravity context",
        "check local Ollama models",
        "run system health check",
      ],
    }
  }

  const toolMatches: CapabilityMatch[] = capabilities.tools
    .map((tool) => {
      const tags = tool.tags || []
      const haystack = `${tool.id} ${tool.title} ${tool.description} ${tool.moduleId} ${tags.join(" ")}`.toLowerCase()
      const { score, matchedTags } = scoreCapability(tokens, tags, haystack)
      const excluded = !isRiskAllowed(tool.risk, safeOnly)
      const match: Omit<CapabilityMatch, "runHint"> = {
        id: tool.id,
        type: "tool",
        title: tool.title,
        description: tool.description,
        moduleId: tool.moduleId,
        risk: tool.risk,
        requiresApproval: tool.requiresApproval,
        score: excluded ? Math.max(1, score - 8) : score,
        matchedTags,
        status: excluded ? "excluded-by-safe-policy" : tool.requiresApproval ? "requires-approval" : "candidate",
      }
      return { ...match, runHint: getRunHint(match) }
    })
    .filter((match) => match.score > 0)

  const workflowMatches: CapabilityMatch[] = includeWorkflows
    ? capabilities.workflows
        .map((workflow) => {
          const tags = workflow.tags || []
          const haystack = `${workflow.id} ${workflow.title} ${workflow.description} ${tags.join(" ")} ${workflow.allowedToolNames.join(" ")}`.toLowerCase()
          const { score, matchedTags } = scoreCapability(tokens, tags, haystack)
          const excluded = !isRiskAllowed(workflow.risk, safeOnly)
          const match: Omit<CapabilityMatch, "runHint"> = {
            id: workflow.id,
            type: "workflow",
            title: workflow.title,
            description: workflow.description,
            moduleId: "core-workflows",
            risk: workflow.risk,
            requiresApproval: workflow.requiresApproval,
            score: excluded ? Math.max(1, score - 8) : score + 2,
            matchedTags,
            status: excluded ? "excluded-by-safe-policy" : workflow.requiresApproval ? "requires-approval" : "candidate",
          }
          return { ...match, runHint: getRunHint(match) }
        })
        .filter((match) => match.score > 0)
    : []

  const allMatches = [...workflowMatches, ...toolMatches]
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))

  const safeMatches = allMatches.filter((match) => match.status !== "excluded-by-safe-policy")
  const excludedMatches = allMatches.filter((match) => match.status === "excluded-by-safe-policy")
  const selected = safeMatches.slice(0, maxResults)

  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    timestamp: new Date().toISOString(),
    intent: text,
    tokens,
    policy: {
      safeOnly,
      includeWorkflows,
      maxResults,
      excludedCount: excludedMatches.length,
      note: safeOnly
        ? "Medium/dangerous tools are visible in excludedMatches but not selected. Run with safeOnly=false only after an approval strategy is in place."
        : "Unsafe tools can be suggested, but tool execution still enforces per-tool approval requirements.",
    },
    selected,
    excludedMatches: excludedMatches.slice(0, Math.min(10, maxResults)),
    suggestedWorkflow:
      selected.find((match) => match.type === "workflow") ||
      selected.find((match) => match.id === "core.workflow.run") ||
      undefined,
    suggestedTools: selected.filter((match) => match.type === "tool"),
  }
}
