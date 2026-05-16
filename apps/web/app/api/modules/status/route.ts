import { NextResponse } from "next/server"

import { getAllGravityModuleStatuses } from "@/lib/gravity-module-status"

export async function GET() {
  return NextResponse.json(getAllGravityModuleStatuses())
}
