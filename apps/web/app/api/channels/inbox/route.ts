import { NextResponse } from "next/server"

import { proxyGravityServiceRequest } from "@/lib/gravity-service-proxy"

export async function GET(request: Request) {
  const result = await proxyGravityServiceRequest(request, "channels", "/inbox")
  return NextResponse.json(result.payload, { status: result.status })
}

export async function POST(request: Request) {
  const result = await proxyGravityServiceRequest(request, "channels", "/inbox")
  return NextResponse.json(result.payload, { status: result.status })
}
