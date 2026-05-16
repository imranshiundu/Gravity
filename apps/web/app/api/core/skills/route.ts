import { NextResponse } from "next/server"

import { getGravityCoreSkills } from "@/lib/gravity-core-client"

export async function GET() {
  const result = await getGravityCoreSkills()

  return NextResponse.json(
    result.payload ?? {
      ok: false,
      error: result.error || "Unable to read Gravity Core skills.",
    },
    { status: result.status || (result.ok ? 200 : 503) }
  )
}
