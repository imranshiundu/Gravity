export type ServiceAdapterInput = Record<string, unknown>

export type ServiceAdapterConfig = {
  moduleId: string
  envName: string
  defaultPath: string
  allowedPathPrefixes?: string[]
  defaultMethod?: string
}

export function getConfiguredService(envName: string) {
  const baseUrl = process.env[envName]?.trim().replace(/\/$/, "") || ""
  return {
    envName,
    configured: Boolean(baseUrl),
    baseUrl: baseUrl || undefined,
  }
}

function getString(input: unknown) {
  return typeof input === "string" ? input : ""
}

function getBody(input: ServiceAdapterInput) {
  const body = input.body
  return body && typeof body === "object" ? body : {}
}

function normalizeMethod(input: ServiceAdapterInput, fallback: string) {
  const method = getString(input.method).toUpperCase() || fallback.toUpperCase()
  const allowedMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"])
  return allowedMethods.has(method) ? method : fallback.toUpperCase()
}

function normalizePath(inputPath: unknown, defaultPath: string) {
  const path = getString(inputPath) || defaultPath

  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..") || /^https?:\/\//i.test(path)) {
    throw new Error("Refusing unsafe service path. Paths must be relative absolute paths like /status and cannot escape or include a URL.")
  }

  return path
}

function assertAllowedPath(path: string, allowedPrefixes: string[] | undefined) {
  if (!allowedPrefixes?.length) return
  if (!allowedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix.replace(/\/$/, "")}/`))) {
    throw new Error(`Path ${path} is not allowed for this adapter. Allowed prefixes: ${allowedPrefixes.join(", ")}.`)
  }
}

async function fetchJsonWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const payload = await response.json().catch(async () => ({ text: await response.text().catch(() => "") }))
    return {
      ok: response.ok,
      status: response.status,
      payload,
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function proxyModuleService(config: ServiceAdapterConfig, input: ServiceAdapterInput = {}) {
  const service = getConfiguredService(config.envName)

  if (!service.configured || !service.baseUrl) {
    return {
      ok: false as const,
      status: 503,
      moduleId: config.moduleId,
      service,
      error: `${config.envName} is not configured. Gravity cannot reach the ${config.moduleId} module service yet.`,
    }
  }

  try {
    const method = normalizeMethod(input, input.body ? "POST" : config.defaultMethod || "GET")
    const requestPath = normalizePath(input.path, config.defaultPath)
    assertAllowedPath(requestPath, config.allowedPathPrefixes)

    const result = await fetchJsonWithTimeout(`${service.baseUrl}${requestPath}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(getBody(input)),
    })

    return {
      ok: result.ok,
      status: result.status,
      moduleId: config.moduleId,
      service,
      upstream: `${service.baseUrl}${requestPath}`,
      payload: result.payload,
    }
  } catch (error) {
    return {
      ok: false as const,
      status: 502,
      moduleId: config.moduleId,
      service,
      error: error instanceof Error ? error.message : `Unable to reach ${config.moduleId} service.`,
    }
  }
}

export async function probeModuleService(config: Omit<ServiceAdapterConfig, "defaultPath"> & { probePaths: string[] }) {
  const service = getConfiguredService(config.envName)

  if (!service.configured || !service.baseUrl) {
    return {
      ok: false as const,
      status: 503,
      moduleId: config.moduleId,
      service,
      probes: [],
      error: `${config.envName} is not configured.`,
    }
  }

  const probes = []
  for (const path of config.probePaths) {
    try {
      assertAllowedPath(path, config.allowedPathPrefixes)
      const result = await fetchJsonWithTimeout(`${service.baseUrl}${path}`, { method: "GET" }, 3_500)
      probes.push({ path, ok: result.ok, status: result.status, payload: result.payload })
    } catch (error) {
      probes.push({ path, ok: false, status: 502, error: error instanceof Error ? error.message : "Probe failed." })
    }
  }

  return {
    ok: probes.some((probe) => probe.ok),
    status: probes.some((probe) => probe.ok) ? 200 : 503,
    moduleId: config.moduleId,
    service,
    probes,
  }
}
