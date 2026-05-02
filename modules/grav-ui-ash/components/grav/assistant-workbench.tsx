"use client"

import * as React from "react"
import {
  IconAlertCircle,
  IconBrain,
  IconLoader2,
  IconPlayerPlayFilled,
  IconPlugConnected,
  IconPlugConnectedX,
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

type OllamaModel = {
  name: string
  size?: number
  modified_at?: string
}

type OllamaStatus = {
  available: boolean
  baseUrl: string
  defaultModel: string | null
  models: OllamaModel[]
  error?: string
}

type Message = {
  role: "user" | "assistant"
  content: string
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

export function AssistantWorkbench() {
  const [status, setStatus] = React.useState<OllamaStatus | null>(null)
  const [prompt, setPrompt] = React.useState("")
  const [messages, setMessages] = React.useState<Message[]>([])
  const [selectedModel, setSelectedModel] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadStatus = React.useCallback(async () => {
    setIsRefreshing(true)

    try {
      const response = await fetch("/api/ollama/status", {
        cache: "no-store",
      })
      const payload = (await response.json()) as OllamaStatus
      setStatus(payload)

      setSelectedModel((currentModel) => {
        if (currentModel) return currentModel
        return payload.defaultModel ?? payload.models[0]?.name ?? ""
      })
    } catch (loadError) {
      setStatus(null)
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Ollama status."
      )
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  React.useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  async function handleSend() {
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt || !selectedModel) {
      return
    }

    const nextMessages = [...messages, { role: "user" as const, content: trimmedPrompt }]
    setMessages(nextMessages)
    setPrompt("")
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/ollama/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: nextMessages,
        }),
      })

      const payload = (await response.json()) as {
        content?: string
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error || "Gravity could not reach Ollama.")
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: payload.content?.trim() || "No response returned.",
        },
      ])
    } catch (chatError) {
      setMessages((currentMessages) => currentMessages.slice(0, -1))
      setPrompt(trimmedPrompt)
      setError(
        chatError instanceof Error
          ? chatError.message
          : "Gravity could not reach Ollama."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const connected = Boolean(status?.available)

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
      <Card className="border border-border/70 bg-card/90">
        <CardHeader className="border-b border-border/70">
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconBrain className="size-5 text-primary" />
            Grav Assistant
          </CardTitle>
          <CardDescription>
            Gravity speaks through one interface. Ollama stays external and
            Gravity connects to it through a lightweight runtime bridge.
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
                disabled={!connected || status?.models.length === 0}
              >
                <SelectTrigger className="w-full justify-between rounded-4xl">
                  <SelectValue>
                    {selectedModel || "No model detected"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-72">
                  <SelectGroup>
                    {(status?.models ?? []).map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
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
                {selectedModel || "No model"}
              </Badge>
            </div>

            <div className="scrollbar-hidden flex max-h-[26rem] min-h-56 flex-col gap-3 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="rounded-4xl border border-dashed border-border/80 bg-muted/40 p-4 text-sm text-muted-foreground">
                  Ask Grav anything once Ollama is reachable. Gravity will send
                  the request through its own interface instead of using
                  Ollama’s built-in app UI.
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={
                      message.role === "user"
                        ? "ml-auto max-w-[85%] rounded-[1.75rem] bg-primary px-4 py-3 text-sm text-primary-foreground"
                        : "max-w-[90%] rounded-[1.75rem] border border-border/70 bg-card px-4 py-3 text-sm"
                    }
                  >
                    <div className="mb-1 text-[11px] font-medium tracking-[0.18em] uppercase opacity-70">
                      {message.role === "user" ? "You" : "Grav"}
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask Grav to reason with your local Ollama model..."
              disabled={!connected || isLoading}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Gravity runtime bridge: `{status?.baseUrl ?? "http://127.0.0.1:11434"}`
              </div>
              <Button
                onClick={handleSend}
                disabled={!connected || !selectedModel || !prompt.trim() || isLoading}
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
            <CardTitle>Engine status</CardTitle>
            <CardDescription>
              Gravity does not ship its own Ollama app surface here. It only
              connects to an existing runtime.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Connection</span>
              <Badge variant={connected ? "secondary" : "outline"}>
                {connected ? "Online" : "Offline"}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Endpoint</span>
              <span className="font-mono text-xs">{status?.baseUrl ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Models visible</span>
              <span>{status?.models.length ?? 0}</span>
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
            {(status?.models.length ?? 0) === 0 ? (
              <div className="rounded-3xl border border-dashed border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                No models were discovered yet.
              </div>
            ) : (
              status?.models.slice(0, 8).map((model) => (
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
