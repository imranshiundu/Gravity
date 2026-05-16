export type GravityToolRisk = "safe" | "medium" | "dangerous" | "disallowed"

export type GravityMode =
  | "personal"
  | "business"
  | "coding"
  | "system"
  | "memory"
  | "voice"
  | "defense"
  | "gateway"
  | "channel"

export type GravityConnectionState = "connected" | "registered" | "missing" | "planned"

export type GravityApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "executed" | "failed"

export type GravityContext = {
  workspaceId: string
  sessionId: string
  userId?: string
  modes: GravityMode[]
}

export type GravityToolResult = {
  ok: boolean
  data?: unknown
  error?: string
  auditEventId?: string
}

export type GravityTool = {
  name: string
  title: string
  description: string
  moduleId: string
  risk: GravityToolRisk
  requiresApproval: boolean
  inputSchema: unknown
  outputSchema?: unknown
}

export type GravityChatMessage = {
  role: "system" | "user" | "assistant" | "tool"
  content: string
}

export type GravityChatInput = {
  model?: string
  messages: GravityChatMessage[]
  context?: Partial<GravityContext>
}

export type GravityChatOutput = {
  ok: boolean
  message?: GravityChatMessage
  error?: string
  providerId?: string
}

export type GravityModelProvider = {
  id: string
  name: string
  kind: "local" | "cloud" | "hybrid"
  statusEndpoint?: string
}

export type GravityMemoryEntry = {
  id: string
  workspaceId: string
  userId?: string
  projectId?: string
  type: string
  source: string
  content: string
  confidence?: number
  privacyLevel: "local" | "private" | "shared"
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type GravityMemoryQuery = {
  workspaceId?: string
  query?: string
  type?: string
  tag?: string
  limit?: number
}

export type GravityForgetRequest = {
  workspaceId?: string
  id?: string
  query?: string
}

export type GravityCapability = {
  id: string
  title: string
  description: string
  status: GravityConnectionState
}

export type GravityUISurface = {
  id: string
  moduleId: string
  title: string
  route: string
  kind: "page" | "panel" | "widget" | "console"
  requiredMode?: GravityMode
}

export type GravityModule = {
  id: string
  name: string
  description: string
  sourcePath: string
  connectionState: GravityConnectionState
  capabilities: GravityCapability[]
  tools?: GravityTool[]
  modelProviders?: GravityModelProvider[]
  uiSurfaces?: GravityUISurface[]
}

export type GravityApprovalRequest = {
  id: string
  toolName: string
  risk: GravityToolRisk
  summary: string
  reason: string
  proposedInput: unknown
  status?: GravityApprovalStatus
  workspaceId?: string
  userId?: string
  sessionId?: string
  source?: "assistant" | "system" | "api"
  createdAt?: string
  expiresAt?: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
  executedAt?: string
  failedAt?: string
  resultSummary?: string
  auditEventId?: string
}

export type GravityAuditEvent = {
  id: string
  workspaceId: string
  userId?: string
  sessionId: string
  mode: GravityMode[]
  eventType: string
  summary: string
  toolName?: string
  moduleId?: string
  risk?: GravityToolRisk
  inputRedacted?: unknown
  outputSummary?: string
  createdAt: string
}

export type GravityCoreStatus = {
  ok: boolean
  service: "grav-core"
  version: string
  timestamp: string
  mode: "standalone" | "in-process" | "unavailable"
  modules: GravityModule[]
  providers: GravityModelProvider[]
  endpoints: Record<string, string>
}