import { NextResponse } from "next/server"

import { getGravityCoreStatus } from "@/lib/gravity-core-client"

export async function GET() {
  const status = await getGravityCoreStatus()
  return NextResponse.json(status, { status: status.ok ? 200 : 503 })
}
