import { randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import type { GravityAuditEvent, GravityChatInput, GravityMode, GravityToolRisk } from "@gravity/contracts"

const DEFAULT_WORKSPACE_ID = "local"
const DEFAULT_SESSION_ID = "grav-core"
const DEFAULT_AUDIT_LIMIT = 50
const MAX_AUDIT_LIMIT = 500

export type GravCoreAuditInput = {
  workspaceId?: string
  userId?: string
  sessionId?: string
  mode?: GravityMode[]
  eventType: string
  summary: string
  toolName?: string
  moduleId?: string
  risk?: GravityToolRisk
  inputRedacted?: unknown
  outputSummary?: string
}

function getDataDir() {
  return process.env.GRAV_CORE_DATA_DIR?.trim() || path.join(process.cwd(), ".grav-core")
}

function getAuditFilePath() {
  return path.join(getDataDir(), "audit-events.jsonl")
}

async function ensureAuditFile() {
  await mkdir(getDataDir(), { recursive: true })

  try {
    await readFile(getAuditFilePath(), "utf-8")
  } catch {
    await writeFile(getAuditFilePath(), "", "utf-8")
  }
}

function normalizeLimit(value: unknown) {
  const limit = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : DEFAULT_AUDIT_LIMIT
  return Math.min(Math.max(limit, 1), MAX_AUDIT_LIMIT)
}

function trimText(value: string, limit = 180) {
  return value.length > limit ? `${value.slice(0, limit)}…` : value
}

export function redactChatInput(input: unknown) {
  const candidate = input as Partial<GravityChatInput>
  const messages = Array.isArray(candidate.messages) ? candidate.messages : []
  const lastUserMessage = [...messages]
    .reverse()
    .find(
      (message): message is { role: string; content: string } =>
        Boolean(message) &&
        typeof message === "object" &&
        (message as { role?: unknown }).role === "user" &&
        typeof (message as { content?: unknown }).content === "string"
    )

  return {
    model: typeof candidate.model === "string" ? candidate.model : undefined,
    messageCount: messages.length,
    roles: messages
      .map((message) => {
        if (!message || typeof message !== "object") {
          return "invalid"
        }

        const role = (message as { role?: unknown }).role
        return typeof role === "string" ? role : "invalid"
      })
      .slice(-12),
    lastUserMessagePreview: lastUserMessage
      ? trimText(lastUserMessage.content.replace(/\s+/g, " ").trim())
      : undefined,
  }
}

export function summarizeChatOutput(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "No structured payload returned."
  }

  const candidate = payload as {
    ok?: unknown
    provider?: unknown
    model?: unknown
    content?: unknown
    error?: unknown
  }

  if (candidate.ok === false) {
    return `Chat failed: ${typeof candidate.error === "string" ? trimText(candidate.error) : "unknown error"}`
  }

  return `Chat completed via ${typeof candidate.provider === "string" ? candidate.provider : "unknown provider"}${
    typeof candidate.model === "string" ? ` using ${candidate.model}` : ""
  }; output preview: ${
    typeof candidate.content === "string" ? trimText(candidate.content.replace(/\s+/g, " ").trim()) : "no content"
  }`
}

export function getAuditContext(input: unknown) {
  const candidate = input as Partial<GravityChatInput>
  const context = candidate.context && typeof candidate.context === "object" ? candidate.context : {}

  return {
    workspaceId:
      typeof context.workspaceId === "string" && context.workspaceId.trim()
        ? context.workspaceId.trim()
        : DEFAULT_WORKSPACE_ID,
    userId:
      typeof context.userId === "string" && context.userId.trim() ? context.userId.trim() : undefined,
    sessionId:
      typeof context.sessionId === "string" && context.sessionId.trim()
        ? context.sessionId.trim()
        : DEFAULT_SESSION_ID,
    modes: Array.isArray(context.modes) && context.modes.length > 0 ? context.modes : (["personal"] as GravityMode[]),
  }
}

export async function writeAuditEvent(input: GravCoreAuditInput): Promise<GravityAuditEvent> {
  await ensureAuditFile()

  const event: GravityAuditEvent = {
    id: randomUUID(),
    workspaceId: input.workspaceId || DEFAULT_WORKSPACE_ID,
    userId: input.userId,
    sessionId: input.sessionId || DEFAULT_SESSION_ID,
    mode: input.mode && input.mode.length > 0 ? input.mode : ["personal"],
    eventType: input.eventType,
    summary: input.summary,
    toolName: input.toolName,
    moduleId: input.moduleId,
    risk: input.risk,
    inputRedacted: input.inputRedacted,
    outputSummary: input.outputSummary,
    createdAt: new Date().toISOString(),
  }

  const current = await readFile(getAuditFilePath(), "utf-8")
  await writeFile(getAuditFilePath(), `${current}${JSON.stringify(event)}\n`, "utf-8")

  return event
}

export async function readAuditEvents(limitInput?: unknown) {
  await ensureAuditFile()

  const limit = normalizeLimit(limitInput)
  const raw = await readFile(getAuditFilePath(), "utf-8")

  const events = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as GravityAuditEvent
      } catch {
        return null
      }
    })
    .filter((event): event is GravityAuditEvent => Boolean(event))
    .slice(-limit)
    .reverse()

  return {
    ok: true,
    service: "grav-core",
    timestamp: new Date().toISOString(),
    auditFile: getAuditFilePath(),
    count: events.length,
    events,
  }
}
