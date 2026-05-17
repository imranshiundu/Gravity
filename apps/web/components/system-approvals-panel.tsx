"use client"

import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { gravityEndpoints } from "@/lib/gravity-endpoints"

type ApprovalRequest = {
  id: string
  toolName: string
  risk: "safe" | "medium" | "dangerous" | "disallowed"
  summary: string
  reason: string
  proposedInput: unknown
  status?: "pending" | "approved" | "rejected" | "expired" | "executed" | "failed"
  source?: string
  createdAt?: string
  expiresAt?: string
  resultSummary?: string
}

type ApprovalsResponse = {
  ok: boolean
  service?: string
  timestamp?: string
  approvalsFile?: string
  status?: string
  count?: number
  approvals?: ApprovalRequest[]
  error?: string
}

const riskVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  safe: "secondary",
  medium: "outline",
  dangerous: "destructive",
  disallowed: "destructive",
}

function formatDate(value?: string) {
  if (!value) return "-"

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function stringifyPreview(value: unknown, maxLength = 900) {
  try {
    const text = JSON.stringify(value, null, 2)
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
  } catch {
    return String(value)
  }
}

function ApprovalRow({ approval, onChanged }: { approval: ApprovalRequest; onChanged: () => void }) {
  const [state, setState] = useState<"idle" | "executing" | "rejecting">("idle")
  const [error, setError] = useState("")

  async function mutate(action: "execute" | "reject") {
    setState(action === "execute" ? "executing" : "rejecting")
    setError("")

    try {
      const response = await fetch(
        action === "execute" ? gravityEndpoints.core.approvalExecute(approval.id) : gravityEndpoints.core.approvalReject(approval.id),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "system-panel",
            reason: action === "reject" ? "Rejected from system approval panel." : undefined,
          }),
        }
      )
      const payload = await response.json()

      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || `Approval ${action} failed.`)
      }

      onChanged()
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : `Approval ${action} failed.`)
    } finally {
      setState("idle")
    }
  }

  const disabled = approval.status !== "pending" || approval.risk === "disallowed" || state !== "idle"

  return (
    <article className="rounded-xl border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{approval.toolName}</h3>
            <Badge variant={riskVariant[approval.risk] ?? "outline"}>{approval.risk}</Badge>
            <Badge variant="outline">{approval.status || "pending"}</Badge>
            {approval.source ? <Badge variant="secondary">{approval.source}</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{approval.summary}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" disabled={disabled} onClick={() => void mutate("reject")}>
            {state === "rejecting" ? "Rejecting" : "Reject"}
          </Button>
          <Button size="sm" disabled={disabled} onClick={() => void mutate("execute")}>
            {state === "executing" ? "Executing" : "Approve & execute"}
          </Button>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">{approval.reason}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border px-2 py-1">created: {formatDate(approval.createdAt)}</span>
        <span className="rounded-full border px-2 py-1">expires: {formatDate(approval.expiresAt)}</span>
      </div>

      <code className="mt-3 block break-all rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        {approval.id}
      </code>

      <details className="mt-3 rounded-lg border bg-muted/30 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-muted-foreground">Proposed input</summary>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
          {stringifyPreview(approval.proposedInput, 1400)}
        </pre>
      </details>

      {approval.resultSummary ? (
        <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          {approval.resultSummary}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
    </article>
  )
}

export function SystemApprovalsPanel() {
  const [payload, setPayload] = useState<ApprovalsResponse | null>(null)
  const [statusFilter, setStatusFilter] = useState("pending")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadApprovals() {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`${gravityEndpoints.core.approvals}?status=${encodeURIComponent(statusFilter)}&limit=25`, {
        method: "GET",
        cache: "no-store",
      })
      const data = (await response.json()) as ApprovalsResponse
      setPayload(data)

      if (!response.ok || !data.ok) {
        setError(data.error || `Core approvals returned HTTP ${response.status}.`)
      }
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : "Unable to load Core approvals.")
      setPayload(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadApprovals()
  }, [statusFilter])

  const approvals = useMemo(() => payload?.approvals ?? [], [payload])

  return (
    <section className="rounded-xl border bg-background p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Core approval queue</h2>
            <Badge variant={error ? "destructive" : "secondary"}>
              {error ? "Unavailable" : `${approvals.length} ${statusFilter}`}
            </Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Stored approval requests created by Grav chat and Core tools. Risky tools are executed from here instead of bypassing the queue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            "pending",
            "approved",
            "executed",
            "failed",
            "rejected",
            "expired",
            "all",
          ].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => void loadApprovals()} disabled={isLoading}>
            {isLoading ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </div>

      {payload?.approvalsFile ? (
        <code className="mt-4 block break-all rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {payload.approvalsFile}
        </code>
      ) : null}

      {isLoading ? (
        <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          Loading Core approvals…
        </div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6 text-destructive">
          {error}
        </div>
      ) : approvals.length === 0 ? (
        <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          No approval requests in this state yet.
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {approvals.map((approval) => (
            <ApprovalRow key={approval.id} approval={approval} onChanged={() => void loadApprovals()} />
          ))}
        </div>
      )}
    </section>
  )
}
