import { NextResponse } from "next/server"

import { isGravityCoreConfigured, runGravityCoreChat } from "@/lib/gravity-core-client"
import { getOllamaBaseUrl } from "@/lib/ollama"

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool"
  content: string
}

type ChatRequestBody = {
  model?: string
  messages?: ChatMessage[]
}

function validateChatRequest(body: ChatRequestBody) {
  if (!body.model?.trim()) {
    return "A model is required."
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return "At least one message is required."
  }

  const invalidMessage = body.messages.find(
    (message) =>
      !message ||
      typeof message.content !== "string" ||
      !["system", "user", "assistant", "tool"].includes(message.role)
  )

  if (invalidMessage) {
    return "Every message must include a valid role and string content."
  }

  return null
}

async function runOllamaFallback(body: ChatRequestBody) {
  const response = await fetch(`${getOllamaBaseUrl()}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: body.model,
      messages: body.messages,
      stream: false,
    }),
    cache: "no-store",
  })

  const payload = await response.json()

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        assistant: "Grav",
        runtime: "ollama-direct",
        error:
          payload?.error ||
          `Ollama request failed with status ${response.status}.`,
      },
      { status: response.status }
    )
  }

  return NextResponse.json({
    ok: true,
    assistant: "Grav",
    runtime: "ollama-direct",
    content: payload?.message?.content ?? "",
    raw: payload,
  })
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody
  const validationError = validateChatRequest(body)

  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 })
  }

  if (isGravityCoreConfigured()) {
    const coreResult = await runGravityCoreChat({
      model: body.model,
      messages: body.messages ?? [],
    })

    if (coreResult.ok) {
      return NextResponse.json(coreResult.payload, { status: coreResult.status })
    }

    return NextResponse.json(
      {
        ok: false,
        assistant: "Grav",
        runtime: "grav-core",
        error: coreResult.error || "Grav Core chat failed.",
        fallbackAvailable: true,
      },
      { status: coreResult.status || 502 }
    )
  }

  return runOllamaFallback(body)
}
