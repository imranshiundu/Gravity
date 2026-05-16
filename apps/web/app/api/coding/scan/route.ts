import { NextResponse } from "next/server"

import { scanGravityWorkspace } from "@/lib/gravity-local-tools"

export async function GET() {
  const result = await scanGravityWorkspace()

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ...result,
    mode: "coding",
  })
}

export async function POST() {
  return GET()
}
