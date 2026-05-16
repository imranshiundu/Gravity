import { NextResponse } from "next/server"

import { runGravityCoreTool } from "@/lib/gravity-core-client"

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const result = await runGravityCoreTool({
    toolName: typeof body.toolName === "string" ? body.toolName : "",
    input: body.input && typeof body.input === "object" ? body.input : {},
  })

  return NextResponse.json(
    result.payload ?? {
      ok: false,
      error: result.error || "Unable to run Gravity Core tool.",
    },
    { status: result.status || (result.ok ? 200 : 503) }
  )
}
