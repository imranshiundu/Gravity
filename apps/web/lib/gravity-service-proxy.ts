type GravityProxyTarget = "channels" | "voice" | "gateway"

const SERVICE_ENV_KEYS: Record<GravityProxyTarget, string> = {
  channels: "GRAVITY_CHANNELS_BASE_URL",
  voice: "GRAVITY_VOICE_BASE_URL",
  gateway: "GRAVITY_GATEWAY_BASE_URL",
}

function getServiceBaseUrl(target: GravityProxyTarget) {
  return process.env[SERVICE_ENV_KEYS[target]]?.trim().replace(/\/$/, "") || ""
}

export async function proxyGravityServiceRequest(
  request: Request,
  target: GravityProxyTarget,
  upstreamPath: string
) {
  const baseUrl = getServiceBaseUrl(target)

  if (!baseUrl) {
    return {
      ok: false as const,
      status: 503,
      payload: {
        ok: false,
        target,
        error: `${target} service is not configured. Set ${SERVICE_ENV_KEYS[target]} to enable this adapter.`,
      },
    }
  }

  const inputUrl = new URL(request.url)
  const upstreamUrl = new URL(`${baseUrl}${upstreamPath}`)
  upstreamUrl.search = inputUrl.search

  const method = request.method.toUpperCase()
  const hasBody = !["GET", "HEAD"].includes(method)

  try {
    const response = await fetch(upstreamUrl, {
      method,
      headers: {
        "Content-Type": request.headers.get("Content-Type") || "application/json",
      },
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
    })

    const contentType = response.headers.get("Content-Type") || ""
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { ok: response.ok, text: await response.text() }

    return {
      ok: response.ok,
      status: response.status,
      payload,
    }
  } catch (error) {
    return {
      ok: false as const,
      status: 502,
      payload: {
        ok: false,
        target,
        error: error instanceof Error ? error.message : "Unable to reach upstream service.",
      },
    }
  }
}
