import { NextResponse } from "next/server"

import { forgetGravityMemory } from "@/lib/gravity-memory-store"

export async function POST(request: Request) {
  const result = await forgetGravityMemory(await request.json())

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json(result)
}
