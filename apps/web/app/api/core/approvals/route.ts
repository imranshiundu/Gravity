import { NextResponse } from "next/server"

import { listGravityCoreApprovals } from "@/lib/gravity-core-client"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const result = await listGravityCoreApprovals({
    status: url.searchParams.get("status") || "pending",
    limit: Number(url.searchParams.get("limit") || 100),
  })

  return NextResponse.json(
    result.payload ?? {
      ok: false,
      error: result.error || "Unable to list Gravity Core approvals.",
    },
    { status: result.status || (result.ok ? 200 : 503) }
  )
}
