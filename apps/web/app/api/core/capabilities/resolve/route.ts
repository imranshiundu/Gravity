import { NextResponse } from "next/server"

import { resolveGravityCoreCapabilities } from "@/lib/gravity-core-client"

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const result = await resolveGravityCoreCapabilities({
    intent: typeof body.intent === "string" ? body.intent : undefined,
    query: typeof body.query === "string" ? body.query : undefined,
    safeOnly: typeof body.safeOnly === "boolean" ? body.safeOnly : undefined,
    includeWorkflows: typeof body.includeWorkflows === "boolean" ? body.includeWorkflows : undefined,
    maxResults: typeof body.maxResults === "number" ? body.maxResults : undefined,
  })

  return NextResponse.json(
    result.payload ?? {
      ok: false,
      error: result.error || "Unable to resolve Gravity Core capabilities.",
    },
    { status: result.status || (result.ok ? 200 : 503) }
  )
}
