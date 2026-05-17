import { NextRequest, NextResponse } from "next/server"

function getCoreBaseUrl() {
  return process.env.GRAVITY_CORE_BASE_URL?.trim().replace(/\/$/, "") || ""
}

async function readPayload(response: Response) {
  return response.json().catch(() => ({}))
}

export async function POST(request: NextRequest) {
  const baseUrl = getCoreBaseUrl()
  const body = await request.json().catch(() => ({}))

  if (!baseUrl) {
    return NextResponse.json(
      {
        ok: false,
        attempted: false,
        error: "GRAVITY_CORE_BASE_URL is not set. /api/core/plan does not create fake web-local plans.",
      },
      { status: 503 }
    )
  }

  try {
    const response = await fetch(`${baseUrl}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    })

    const payload = await readPayload(response)

    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        attempted: true,
        error: error instanceof Error ? error.message : "Unable to reach Gravity Core /plan.",
      },
      { status: 502 }
    )
  }
}
