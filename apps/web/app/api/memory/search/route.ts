import { NextResponse } from "next/server"

import { searchGravityMemory } from "@/lib/gravity-memory-store"

export async function GET(request: Request) {
  const url = new URL(request.url)

  const result = await searchGravityMemory({
    query: url.searchParams.get("query") ?? "",
    type: url.searchParams.get("type") ?? "",
    tag: url.searchParams.get("tag") ?? "",
    limit: Number(url.searchParams.get("limit") ?? "20"),
  })

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const result = await searchGravityMemory(await request.json())
  return NextResponse.json(result)
}
