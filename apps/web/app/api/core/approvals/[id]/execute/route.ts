import { NextResponse } from "next/server"

import { mutateGravityCoreApproval } from "@/lib/gravity-core-client"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const body = await request.json().catch(() => ({}))
  const result = await mutateGravityCoreApproval(params.id, "execute", body && typeof body === "object" ? body : {})

  return NextResponse.json(
    result.payload ?? {
      ok: false,
      error: result.error || "Unable to execute Gravity Core approval.",
    },
    { status: result.status || (result.ok ? 200 : 503) }
  )
}
