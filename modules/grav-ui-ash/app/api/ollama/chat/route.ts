import { NextResponse } from "next/server"

import { getOllamaBaseUrl } from "@/lib/ollama"

type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    model?: string
    messages?: ChatMessage[]
  }

  if (!body.model?.trim()) {
    return NextResponse.json(
      { error: "A model is required." },
      { status: 400 }
    )
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: "At least one message is required." },
      { status: 400 }
    )
  }

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
        error:
          payload?.error ||
          `Ollama request failed with status ${response.status}.`,
      },
      { status: response.status }
    )
  }

  return NextResponse.json({
    content: payload?.message?.content ?? "",
    raw: payload,
  })
}
