import { NextResponse } from "next/server"

import { getGravityCoreWorkflows } from "@/lib/gravity-core-client"

export async function GET() {
  const result = await getGravityCoreWorkflows()

  return NextResponse.json(
    result.payload ?? {
      ok: false,
      error: result.error || "Unable to read Gravity Core workflows.",
    },
    { status: result.status || (result.ok ? 200 : 503) }
  )
}
