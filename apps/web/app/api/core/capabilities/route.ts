import { NextResponse } from "next/server"

import { getGravityCoreCapabilities } from "@/lib/gravity-core-client"

export async function GET() {
  const result = await getGravityCoreCapabilities()

  return NextResponse.json(
    result.payload ?? {
      ok: false,
      error: result.error || "Unable to read Gravity Core capabilities.",
    },
    { status: result.status || (result.ok ? 200 : 503) }
  )
}
