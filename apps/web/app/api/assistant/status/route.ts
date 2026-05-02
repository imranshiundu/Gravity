import { NextResponse } from "next/server"

import { getOllamaStatus } from "@/lib/ollama"

export async function GET() {
  const ollama = await getOllamaStatus()

  return NextResponse.json({
    assistant: "Grav",
    interface: "Gravity Web",
    primaryRuntime: "ollama",
    ollama,
  })
}
