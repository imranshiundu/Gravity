import { NextResponse } from "next/server"

import { isGravityCoreConfigured, searchGravityCoreMemory } from "@/lib/gravity-core-client"
import { searchGravityMemory } from "@/lib/gravity-memory-store"

function getSearchInputFromUrl(request: Request) {
  const url = new URL(request.url)

  return {
    query: url.searchParams.get("query") ?? "",
    wing: url.searchParams.get("wing") ?? undefined,
    room: url.searchParams.get("room") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? "20"),
  }
}

export async function GET(request: Request) {
  const input = getSearchInputFromUrl(request)

  if (isGravityCoreConfigured()) {
    const result = await searchGravityCoreMemory(input)
    return NextResponse.json(
      result.payload ?? {
        ok: false,
        error: result.error || "Core MemPalace search failed.",
      },
      { status: result.status || 503 }
    )
  }

  const result = await searchGravityMemory({
    query: input.query,
    limit: input.limit,
  })

  return NextResponse.json({
    ...result,
    backend: "local-json-fallback",
    warning:
      "GRAVITY_CORE_BASE_URL is not configured, so this used the legacy web local JSON fallback instead of modules/memory MemPalace.",
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))

  if (isGravityCoreConfigured()) {
    const result = await searchGravityCoreMemory({
      query: typeof body.query === "string" ? body.query : "",
      wing: typeof body.wing === "string" ? body.wing : undefined,
      room: typeof body.room === "string" ? body.room : undefined,
      limit: typeof body.limit === "number" ? body.limit : undefined,
    })

    return NextResponse.json(
      result.payload ?? {
        ok: false,
        error: result.error || "Core MemPalace search failed.",
      },
      { status: result.status || 503 }
    )
  }

  const result = await searchGravityMemory(body)
  return NextResponse.json({
    ...result,
    backend: "local-json-fallback",
    warning:
      "GRAVITY_CORE_BASE_URL is not configured, so this used the legacy web local JSON fallback instead of modules/memory MemPalace.",
  })
}
