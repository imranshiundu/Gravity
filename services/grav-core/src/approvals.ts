import { randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import type { GravityApprovalRequest, GravityApprovalStatus, GravityTool, GravityToolRisk } from "@gravity/contracts"

import { runGravityTool } from "./tool-bus.js"

const DEFAULT_WORKSPACE_ID = "local"
const DEFAULT_SESSION_ID = "grav-core"
const DEFAULT_APPROVAL_LIMIT = 100
const MAX_APPROVAL_LIMIT = 500

type CreateApprovalInput = {
  tool: GravityTool
  reason: string
  proposedInput: unknown
  summary?: string
  workspaceId?: string
  userId?: string
  sessionId?: string
  source?: GravityApprovalRequest["source"]
  expiresInMs?: number
}

type ApprovalMutationInput = {
  id: string
  userId?: string
  reason?: string
}

type ApprovalExecuteInput = {
  id: string
  userId?: string
}

function getDataDir() {
  return process.env.GRAV_CORE_DATA_DIR?.trim() || path.join(process.cwd(), ".grav-core")
}

function getApprovalsFilePath() {
  return path.join(getDataDir(), "approval-requests.json")
}

async function ensureApprovalsFile() {
  await mkdir(getDataDir(), { recursive: true })

  try {
    await readFile(getApprovalsFilePath(), "utf-8")
  } catch {
    await writeFile(getApprovalsFilePath(), "[]\n", "utf-8")
  }
}

function normalizeLimit(value: unknown) {
  const limit = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : DEFAULT_APPROVAL_LIMIT
  return Math.min(Math.max(limit, 1), MAX_APPROVAL_LIMIT)
}

function normalizeStatus(value: unknown): GravityApprovalStatus | "all" {
  if (value === "all") return "all"
  if (
    value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "expired" ||
    value === "executed" ||
    value === "failed"
  ) {
    return value
  }

  return "pending"
}

function isExpired(approval: GravityApprovalRequest, now = new Date()) {
  return Boolean(approval.expiresAt && new Date(approval.expiresAt).getTime() <= now.getTime())
}

function refreshStatus(approval: GravityApprovalRequest): GravityApprovalRequest {
  if (approval.status === "pending" && isExpired(approval)) {
    return {
      ...approval,
      status: "expired",
    }
  }

  return approval
}

function trimSummary(value: string, limit = 220) {
  return value.length > limit ? `${value.slice(0, limit)}…` : value
}

function summarizeRunResult(result: Awaited<ReturnType<typeof runGravityTool>>) {
  if (!result.ok) {
    return result.error || `Tool failed with status ${result.status}.`
  }

  return `Tool executed with status ${result.status}.`
}

async function readApprovalsRaw() {
  await ensureApprovalsFile()

  const raw = await readFile(getApprovalsFilePath(), "utf-8")

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as GravityApprovalRequest[]).map(refreshStatus) : []
  } catch {
    return []
  }
}

async function writeApprovals(approvals: GravityApprovalRequest[]) {
  await ensureApprovalsFile()
  await writeFile(getApprovalsFilePath(), `${JSON.stringify(approvals.map(refreshStatus), null, 2)}\n`, "utf-8")
}

async function updateApproval(id: string, update: (approval: GravityApprovalRequest) => GravityApprovalRequest) {
  const approvals = await readApprovalsRaw()
  const index = approvals.findIndex((approval) => approval.id === id)

  if (index < 0) {
    return null
  }

  const updated = refreshStatus(update(approvals[index]))
  approvals[index] = updated
  await writeApprovals(approvals)

  return updated
}

export async function createStoredApprovalRequest(input: CreateApprovalInput) {
  const now = new Date()
  const approval: GravityApprovalRequest = {
    id: `approval_${now.getTime()}_${randomUUID().slice(0, 8)}_${input.tool.name.replace(/[^a-z0-9]/gi, "_")}`,
    toolName: input.tool.name,
    risk: input.tool.risk as GravityToolRisk,
    summary: input.summary || `Approval required for ${input.tool.name}`,
    reason: input.reason,
    proposedInput: input.proposedInput,
    status: "pending",
    workspaceId: input.workspaceId || DEFAULT_WORKSPACE_ID,
    userId: input.userId,
    sessionId: input.sessionId || DEFAULT_SESSION_ID,
    source: input.source || "assistant",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + (input.expiresInMs || 10 * 60_000)).toISOString(),
  }

  const approvals = await readApprovalsRaw()
  approvals.push(approval)
  await writeApprovals(approvals)

  return approval
}

export async function listApprovalRequests(input: { status?: unknown; limit?: unknown } = {}) {
  const approvals = await readApprovalsRaw()
  await writeApprovals(approvals)

  const status = normalizeStatus(input.status)
  const limit = normalizeLimit(input.limit)
  const filtered = approvals
    .filter((approval) => status === "all" || approval.status === status)
    .slice(-limit)
    .reverse()

  return {
    ok: true,
    service: "grav-core",
    timestamp: new Date().toISOString(),
    approvalsFile: getApprovalsFilePath(),
    status,
    count: filtered.length,
    approvals: filtered,
  }
}

export async function getApprovalRequest(id: string) {
  const approvals = await readApprovalsRaw()
  const approval = approvals.find((item) => item.id === id)

  if (!approval) {
    return {
      ok: false,
      status: 404,
      error: `Approval request not found: ${id}`,
    }
  }

  return {
    ok: true,
    status: 200,
    approval,
  }
}

export async function approveRequest(input: ApprovalMutationInput) {
  const updated = await updateApproval(input.id, (approval) => {
    if (approval.status !== "pending") return approval

    return {
      ...approval,
      status: "approved",
      approvedAt: new Date().toISOString(),
      approvedBy: input.userId || "operator",
    }
  })

  if (!updated) {
    return { ok: false, status: 404, error: `Approval request not found: ${input.id}` }
  }

  if (updated.status !== "approved") {
    return { ok: false, status: 409, approval: updated, error: `Approval request is ${updated.status}, not pending.` }
  }

  return { ok: true, status: 200, approval: updated }
}

export async function rejectRequest(input: ApprovalMutationInput) {
  const updated = await updateApproval(input.id, (approval) => {
    if (approval.status !== "pending") return approval

    return {
      ...approval,
      status: "rejected",
      rejectedAt: new Date().toISOString(),
      rejectedBy: input.userId || "operator",
      rejectionReason: input.reason || "Rejected by operator.",
    }
  })

  if (!updated) {
    return { ok: false, status: 404, error: `Approval request not found: ${input.id}` }
  }

  if (updated.status !== "rejected") {
    return { ok: false, status: 409, approval: updated, error: `Approval request is ${updated.status}, not pending.` }
  }

  return { ok: true, status: 200, approval: updated }
}

export async function executeApprovalRequest(input: ApprovalExecuteInput) {
  const found = await getApprovalRequest(input.id)
  if (!found.ok || !found.approval) {
    return { ok: false, status: found.status, error: found.error }
  }

  const approval = found.approval

  if (approval.status === "pending") {
    const approved = await approveRequest({ id: input.id, userId: input.userId })
    if (!approved.ok || !approved.approval) return approved
    return executeApprovalRequest({ id: approved.approval.id, userId: input.userId })
  }

  if (approval.status !== "approved") {
    return {
      ok: false,
      status: 409,
      approval,
      error: `Approval request is ${approval.status}, not approved.`,
    }
  }

  const proposedInput =
    approval.proposedInput && typeof approval.proposedInput === "object" && !Array.isArray(approval.proposedInput)
      ? (approval.proposedInput as Record<string, unknown>)
      : { body: { proposedInput: approval.proposedInput } }

  const result = await runGravityTool({
    toolName: approval.toolName,
    input: {
      ...proposedInput,
      approved: true,
    },
  })

  const status: GravityApprovalStatus = result.ok ? "executed" : "failed"
  const executed = await updateApproval(input.id, (current) => ({
    ...current,
    status,
    executedAt: result.ok ? new Date().toISOString() : current.executedAt,
    failedAt: result.ok ? current.failedAt : new Date().toISOString(),
    resultSummary: trimSummary(summarizeRunResult(result)),
  }))

  return {
    ok: result.ok,
    status: result.status,
    approval: executed || approval,
    result,
    error: result.error,
  }
}
