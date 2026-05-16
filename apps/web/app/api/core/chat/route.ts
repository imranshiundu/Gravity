import { NextResponse } from "next/server"

import { runGravityCoreChat } from "@/lib/gravity-core-client"

export async function POST(request: Request) {
  const result = await runGravityCoreChat(await request.json())

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
