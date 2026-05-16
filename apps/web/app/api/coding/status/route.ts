import { NextResponse } from "next/server"

import { getGravityModuleStatus } from "@/lib/gravity-module-status"

export async function GET() {
  return NextResponse.json(getGravityModuleStatus("coding"))
}
