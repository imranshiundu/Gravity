"use client"

import * as React from "react"
import {
  IconAlertCircle,
  IconBrain,
  IconCheck,
  IconLoader2,
  IconPlayerPlayFilled,
  IconPlugConnected,
  IconPlugConnectedX,
  IconShieldCheck,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { gravityEndpoints } from "@/lib/gravity-endpoints"

type OllamaModel = {
  name: string
  size?: number
  modified_at?: string
}

type AssistantStatus = {
  assistant: string
  interface: string
  primaryRuntime: string
  ollama: {
    available: boolean
    baseUrl: string
    defaultModel: string | null
    models: OllamaModel[]
    error?: string
  }
}

type ApprovalRequest = {
  id: string
  toolName: string
  risk: "safe" | "medium" | "dangerous" | "disallowed"
  summary: string
  reason: string
  proposedInput: unknown
  expiresAt?: string
}

type ToolUsePayload = {
  strategy?: string
  intent?: string
  toolName?: string
  executed?: boolean
  requiresApproval?: boolean
  result?: unknown
  error?: string
}

type ChatPayload = {
  ok?: boolean
  content?: string
  error?: string
  mode?: string
  runtime?: string
  toolUse?: ToolUsePayload
  approvalRequests?: ApprovalRequest[]
}

type Message = {
  role: "user" | "assistant"
  content: string
  toolUse?: ToolUsePayload
  approvalRequests?: ApprovalRequest[]
}

type ApprovalExecution = {
  approvalId: string
  state: "running" | "approved" | "failed"
  message: string
  result?: unknown
}

function formatBytes(bytes?: number) {
  if (!bytes) return "Unknown size"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function getRiskBadgeVariant(risk?: ApprovalRequest["risk"]) {
  if (risk === "dangerous" || risk === "disallowed") return "destructive" as const
  if (risk === "medium") return "secondary" as const
  return "outline" as const
}

function stringifyPreview(value: unknown, maxLength = 900) {
  try {
    const text = JSON.stringify(value, null, 2)
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
  } catch {
    return String(value)
  }
}

function summarizeToolUse(toolUse?: ToolUsePayload) {
  if (!toolUse?.toolName) return null

  return [
    `Tool: ${toolUse.toolName}`,
    toolUse.intent ? `Intent: ${toolUse.intent}` : null,
    `Executed: ${toolUse.executed ? "yes" : "no"}`,
    `Approval: ${toolUse.requiresApproval ? "required" : "not required"}`,
  ]
    .filter(Boolean)
    .join(" • ")
}

export function AssistantWorkbench() {
  const [status, setStatus] = React.useState<AssistantStatus | null>(null)
  const [prompt, setPrompt] = React.useState("")
  const [messages, setMessages] = React.useState<Message[]>([])
  const [selectedModel, setSelectedModel] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [approvalExecutions, setApprovalExecutions] = React.useState<Record<string, ApprovalExecution>>({})

  const loadStatus = React.useCallback(async () => {
    setIsRefreshing(true)

    try {
      const response = await fetch(gravityEndpoints.assistant.status, {
        cache: "no-store",
      })
      const payload = (await response.json()) as AssistantStatus
      setStatus(payload)

      setSelectedModel((currentModel) => {
        if (currentModel) return currentModel
        return payload.ollama.defaultModel ?? payload.ollama.models[0]?.name ?? ""
      })
    } catch (loadError) {
      setStatus(null)
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Gravity assistant status."
      )
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  async function executeApproval(request: ApprovalRequest) {
    setApprovalExecutions((current) => ({
      ...current,
      [request.id]: {
        approvalId: request.id,
        state: "running",
        message: `Running ${request.toolName} with operator approval...`,
      },
    }))

    try {
      const proposedInput =
        request.proposedInput && typeof request.proposedInput === "object" && !Array.isArray(request.proposedInput)
          ? (request.proposedInput as Record<string, unknown>)
          : { body: { proposedInput: request.proposedInput } }

      const response = await fetch(gravityEndpoints.core.runTool, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toolName: request.toolName,
          input: {
            ...proposedInput,
            approved: true,
          },
        }),
      })

      const payload = await response.json()

      if (!response.ok || payload?.ok === false) {
        throw new Error(payload?.error || payload?.data?.error || `${request.toolName} failed after approval.`)
      }

      setApprovalExecutions((current) => ({
        ...current,
        [request.id]: {
          approvalId: request.id,
          state: "approved",
          message: `${request.toolName} executed after approval.`,
          result: payload,
        },
      }))
    } catch (approvalError) {
      setApprovalExecutions((current) => ({
        ...current,
        [request.id]: {
          approvalId: request.id,
          state: "failed",
          message:
            approvalError instanceof Error
              ? approvalError.message
              : `${request.toolName} failed after approval.`,
        },
      }))
    }
  }

  async function handleSend() {
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt) {
      return
    }

    const nextMessages = [...messages, { role: "user" as const, content: trimmedPrompt }]
    setMessages(nextMessages)
    setPrompt("")
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(gravityEndpoints.assistant.chat, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel || undefined,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      const payload = (await response.json()) as ChatPayload
      const isApprovalResponse = Array.isArray(payload.approvalRequests) && payload.approvalRequests.length > 0
      const isToolUseResponse = Boolean(payload.toolUse)

      if (!response.ok && !isApprovalResponse && !isToolUseResponse) {
        throw new Error(payload.error || "Gravity could not complete the request.")
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: payload.content?.trim() || payload.error || "No response returned.",
          toolUse: payload.toolUse,
          approvalRequests: payload.approvalRequests,
        },
      ])
    } catch (chatError) {
      setMessages((currentMessages) => currentMessages.slice(0, -1))
      setPrompt(trimmedPrompt)
      setError(
        chatError instanceof Error
          ? chatError.message
          : "Gravity could not complete the request."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const connected = Boolean(status?.ollama.available)
  const canUseModelChat = connected && Boolean(selectedModel)

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
      <Card className="border border-border/70 bg-card/90">
        <CardHeader className="border-b border-border/70">
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconBrain className="size-5 text-primary" />
            Grav Assistant
          </CardTitle>
          <CardDescription>
            Gravity speaks through one interface. Core can answer with safe tools,
            request approval for risky tools, or fall through to Ollama when model
            reasoning is needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <div className="text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase">
                Active model
              </div>
              <Select
                value={selectedModel}
                onValueChange={(value) => setSelectedModel(value ?? "")}
                disabled={!connected || status?.ollama.models.length === 0}
              >
                <SelectTrigger className="w-full justify-between rounded-4xl">
                  <SelectValue>
                    {selectedModel || "No model detected"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-72">
                  <SelectGroup>
                    {(status?.ollama.models ?? []).map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {!canUseModelChat ? (
                <p className="text-xs text-muted-foreground">
                  Model chat needs Ollama, but Core tool requests and approval
                  handling can still run through Gravity Core.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase">
                Runtime
              </div>
              <div className="flex h-10 items-center gap-2 rounded-4xl border border-border/70 bg-background/70 px-4">
                {isRefreshing ? (
                  <IconLoader2 className="size-4 animate-spin text-muted-foreground" />
                ) : connected ? (
                  <IconPlugConnected className="size-4 text-emerald-600" />
                ) : (
                  <IconPlugConnectedX className="size-4 text-amber-600" />
                )}
                <span className="text-sm">
                  {isRefreshing
                    ? "Checking runtime"
                    : connected
                      ? "Ollama connected"
                      : "Ollama unavailable"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-border/70 bg-background/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Conversation</div>
              <Badge variant={connected ? "secondary" : "outline"}>
                {selectedModel || "Core tools only"}
              </Badge>
            </div>

            <div className="scrollbar-hidden flex max-h-[34rem] min-h-56 flex-col gap-3 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="rounded-4xl border border-dashed border-border/80 bg-muted/40 p-4 text-sm text-muted-foreground">
                  Ask Grav for module routes, audit events, memory search,
                  gateway status, defense scans, or normal model reasoning. Tool
                  requests go through Core before Ollama.
                </div>
              ) : (
                messages.map((message, index) => {
                  const toolSummary = summarizeToolUse(message.toolUse)

                  return (
                    <div
                      key={`${message.role}-${index}`}
                      className={
                        message.role === "user"
                          ? "ml-auto max-w-[85%] rounded-[1.75rem] bg-primary px-4 py-3 text-sm text-primary-foreground"
                          : "max-w-[92%] rounded-[1.75rem] border border-border/70 bg-card px-4 py-3 text-sm"
                      }
                    >
                      <div className="mb-1 text-[11px] font-medium tracking-[0.18em] uppercase opacity-70">
                        {message.role === "user" ? "You" : "Grav"}
                      </div>
                      <div className="whitespace-pre-wrap">{message.content}</div>

                      {toolSummary ? (
                        <div className="mt-3 rounded-3xl border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                          {toolSummary}
                        </div>
                      ) : null}

                      {message.toolUse?.result ? (
                        <details className="mt-3 rounded-3xl border border-border/70 bg-background/70 px-3 py-2 text-xs">
                          <summary className="cursor-pointer font-medium text-muted-foreground">
                            View structured tool result
                          </summary>
                          <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
                            {stringifyPreview(message.toolUse.result, 2200)}
                          </pre>
                        </details>
                      ) : null}

                      {message.approvalRequests?.length ? (
                        <div className="mt-3 space-y-2">
                          {message.approvalRequests.map((request) => {
                            const execution = approvalExecutions[request.id]
                            const disabled =
                              request.risk === "disallowed" || execution?.state === "running" || execution?.state === "approved"

                            return (
                              <div key={request.id} className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <IconShieldCheck className="size-4 text-amber-700 dark:text-amber-300" />
                                    <span className="font-medium">{request.summary}</span>
                                    <Badge variant={getRiskBadgeVariant(request.risk)}>
                                      {request.risk}
                                    </Badge>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={disabled}
                                    onClick={() => void executeApproval(request)}
                                  >
                                    {execution?.state === "running" ? (
                                      <IconLoader2 className="size-4 animate-spin" />
                                    ) : execution?.state === "approved" ? (
                                      <IconCheck className="size-4" />
                                    ) : null}
                                    {execution?.state === "running"
                                      ? "Approving"
                                      : execution?.state === "approved"
                                        ? "Approved"
                                        : request.risk === "disallowed"
                                          ? "Blocked"
                                          : "Approve & run"}
                                  </Button>
                                </div>
                                <p className="mt-2 text-xs text-muted-foreground">{request.reason}</p>
                                {request.expiresAt ? (
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    Expires: {request.expiresAt}
                                  </p>
                                ) : null}
                                <details className="mt-2 rounded-2xl bg-background/70 px-3 py-2 text-xs">
                                  <summary className="cursor-pointer font-medium text-muted-foreground">
                                    Proposed input
                                  </summary>
                                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-[11px] text-muted-foreground">
                                    {stringifyPreview(request.proposedInput, 1200)}
                                  </pre>
                                </details>
                                {execution ? (
                                  <div className="mt-2 rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                                    {execution.message}
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask Grav for routes, tools, approvals, memory, status, or model reasoning..."
              disabled={isLoading}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Assistant endpoint: `{gravityEndpoints.assistant.chat}`
              </div>
              <Button
                onClick={handleSend}
                disabled={!prompt.trim() || isLoading}
              >
                {isLoading ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconPlayerPlayFilled className="size-4" />
                )}
                {isLoading ? "Running" : "Send to Grav"}
              </Button>
            </div>
            {error ? (
              <div className="flex items-start gap-2 rounded-3xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
                <IconAlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        <Card size="sm" className="border border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Bridge status</CardTitle>
            <CardDescription>
              Gravity owns the interface. Engines stay behind Gravity endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Assistant</span>
              <Badge variant="outline">{status?.assistant ?? "Grav"}</Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Interface</span>
              <span>{status?.interface ?? "Gravity Web"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Runtime</span>
              <Badge variant={connected ? "secondary" : "outline"}>
                {status?.primaryRuntime ?? "ollama/core"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Core tool runner</span>
              <span className="font-mono text-xs">{gravityEndpoints.core.runTool}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Ollama endpoint</span>
              <span className="font-mono text-xs">{status?.ollama.baseUrl ?? "-"}</span>
            </div>
          </CardContent>
        </Card>

        <Card size="sm" className="border border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Approval behavior</CardTitle>
            <CardDescription>
              Risky module actions are shown here first. Gravity only runs them
              after you approve the exact proposed tool call.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3">
              Safe tool intents run directly: status, inventory, audit, memory,
              model list, gateway status, defense scan, and coding inventory.
            </div>
            <div className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3">
              Approval-gated tools: channels.send, gateway.proxy,
              orchestration.workflow.run, and coding execution tools.
            </div>
          </CardContent>
        </Card>

        <Card size="sm" className="border border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle>Available models</CardTitle>
            <CardDescription>
              First-pass Gravity runtime inventory from the external Ollama API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(status?.ollama.models.length ?? 0) === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                No models were discovered yet.
              </div>
            ) : (
              status?.ollama.models.slice(0, 8).map((model) => (
                <div
                  key={model.name}
                  className="rounded-3xl border border-border/70 bg-background/70 px-4 py-3"
                >
                  <div className="font-medium">{model.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatBytes(model.size)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}