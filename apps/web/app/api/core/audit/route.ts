import { NextResponse } from "next/server"

import { getGravityCoreAuditEvents } from "@/lib/gravity-core-client"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const result = await getGravityCoreAuditEvents(Number(url.searchParams.get("limit") || 50))

  if (!result.attempted) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
      },
      { status: 503 }
    )
  }

  return NextResponse.json(result.payload ?? { ok: false, error: result.error }, {
    status: result.status || 502,
  })
}
