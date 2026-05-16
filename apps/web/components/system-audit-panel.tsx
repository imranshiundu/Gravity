"use client"

import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type AuditEvent = {
  id: string
  workspaceId: string
  userId?: string
  sessionId: string
  mode: string[]
  eventType: string
  summary: string
  toolName?: string
  moduleId?: string
  risk?: "safe" | "medium" | "dangerous" | "disallowed"
  inputRedacted?: {
    model?: string
    messageCount?: number
    roles?: string[]
    lastUserMessagePreview?: string
  }
  outputSummary?: string
  createdAt: string
}

type AuditResponse = {
  ok: boolean
  service?: string
  timestamp?: string
  auditFile?: string
  count?: number
  events?: AuditEvent[]
  error?: string
}

const riskVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  safe: "secondary",
  medium: "outline",
  dangerous: "destructive",
  disallowed: "destructive",
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function AuditEventRow({ event }: { event: AuditEvent }) {
  const preview = event.inputRedacted?.lastUserMessagePreview

  return (
    <article className="rounded-xl border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{event.eventType}</h3>
            {event.moduleId ? <Badge variant="outline">{event.moduleId}</Badge> : null}
            {event.risk ? <Badge variant={riskVariant[event.risk] ?? "outline"}>{event.risk}</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(event.createdAt)}</p>
        </div>
        <code className="max-w-full truncate rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground sm:max-w-48">
          {event.id}
        </code>
      </div>

      <p className="mt-3 text-sm leading-6 text-foreground">{event.summary}</p>

      {preview ? (
        <div className="mt-3 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last user preview</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{preview}</p>
        </div>
      ) : null}

      {event.outputSummary ? (
        <div className="mt-3 rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Output summary</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{event.outputSummary}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border px-2 py-1">workspace: {event.workspaceId}</span>
        <span className="rounded-full border px-2 py-1">session: {event.sessionId}</span>
        {event.inputRedacted?.model ? (
          <span className="rounded-full border px-2 py-1">model: {event.inputRedacted.model}</span>
        ) : null}
        {typeof event.inputRedacted?.messageCount === "number" ? (
          <span className="rounded-full border px-2 py-1">
            messages: {event.inputRedacted.messageCount}
          </span>
        ) : null}
      </div>
    </article>
  )
}

export function SystemAuditPanel() {
  const [payload, setPayload] = useState<AuditResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadAuditEvents() {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/core/audit?limit=10", {
        method: "GET",
        cache: "no-store",
      })
      const data = (await response.json()) as AuditResponse
      setPayload(data)

      if (!response.ok || !data.ok) {
        setError(data.error || `Core audit returned HTTP ${response.status}.`)
      }
    } catch (auditError) {
      setError(auditError instanceof Error ? auditError.message : "Unable to load Core audit events.")
      setPayload(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadAuditEvents()
  }, [])

  const events = useMemo(() => payload?.events ?? [], [payload])

  return (
    <section className="rounded-xl border bg-background p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Core audit events</h2>
            <Badge variant={error ? "destructive" : "secondary"}>
              {error ? "Unavailable" : `${events.length} recent`}
            </Badge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Recent redacted events from Grav Core. This panel only shows real events when `GRAVITY_CORE_BASE_URL` is configured and the Core service is running.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadAuditEvents()} disabled={isLoading}>
            {isLoading ? "Refreshing" : "Refresh"}
          </Button>
          <Button variant="outline" size="sm" render={<a href="/api/core/audit?limit=50" target="_blank" rel="noreferrer" />}>
            Raw audit
          </Button>
        </div>
      </div>

      {payload?.auditFile ? (
        <code className="mt-4 block break-all rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {payload.auditFile}
        </code>
      ) : null}

      {isLoading ? (
        <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          Loading Core audit events…
        </div>
      ) : error ? (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-6 text-destructive">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          No Core audit events yet. Send a chat request through Core, then refresh this panel.
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {events.map((event) => (
            <AuditEventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  )
}
