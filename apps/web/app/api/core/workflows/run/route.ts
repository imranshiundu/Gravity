import { NextResponse } from "next/server"

import { runGravityCoreWorkflow } from "@/lib/gravity-core-client"

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const result = await runGravityCoreWorkflow({
    workflowId: typeof body.workflowId === "string" ? body.workflowId : undefined,
    workflow: typeof body.workflow === "string" ? body.workflow : undefined,
    approved: typeof body.approved === "boolean" ? body.approved : undefined,
    input: body.input && typeof body.input === "object" ? body.input : {},
  })

  return NextResponse.json(
    result.payload ?? {
      ok: false,
      error: result.error || "Unable to run Gravity Core workflow.",
    },
    { status: result.status || (result.ok ? 200 : 503) }
  )
}
