import { NextResponse } from "next/server"

import { proxyGravityServiceRequest } from "@/lib/gravity-service-proxy"

const DEFAULT_REALTIME_MODEL = "gpt-4o-realtime-preview-2025-06-03"

export async function POST(request: Request) {
  if (process.env.GRAVITY_VOICE_BASE_URL?.trim()) {
    const result = await proxyGravityServiceRequest(request, "voice", "/session")
    return NextResponse.json(result.payload, { status: result.status })
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Voice session is not configured. Set GRAVITY_VOICE_BASE_URL to proxy an existing voice service, or OPENAI_API_KEY to create realtime sessions directly.",
      },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : DEFAULT_REALTIME_MODEL

  const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      voice: typeof body.voice === "string" && body.voice.trim() ? body.voice.trim() : "alloy",
      instructions:
        typeof body.instructions === "string" && body.instructions.trim()
          ? body.instructions.trim()
          : "You are Grav, the Gravity voice operator. Keep replies useful, direct, and grounded in the user's current task.",
    }),
    cache: "no-store",
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: payload?.error?.message || `Realtime session failed with status ${response.status}.`,
      },
      { status: response.status }
    )
  }

  return NextResponse.json({
    ok: true,
    runtime: "openai-realtime",
    session: payload,
  })
}
