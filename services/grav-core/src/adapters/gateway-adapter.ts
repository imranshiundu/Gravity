import { getUnifiedModuleInventory } from "../module-bindings.js"
import { probeModuleService, proxyModuleService, type ServiceAdapterInput } from "./service-adapters.js"

const config = {
  moduleId: "gateway",
  envName: "GRAVITY_GATEWAY_BASE_URL",
  defaultPath: "/status",
  allowedPathPrefixes: ["/", "/health", "/status", "/routes", "/proxy", "/api"],
}

export async function getGatewayInventory() {
  const source = await getUnifiedModuleInventory({ moduleId: "gateway", includeRoutes: true })
  const service = await probeModuleService({
    moduleId: config.moduleId,
    envName: config.envName,
    allowedPathPrefixes: config.allowedPathPrefixes,
    probePaths: ["/health", "/status", "/routes"],
  })

  return {
    ok: true as const,
    status: 200,
    moduleId: "gateway",
    serviceCapability: "route-control, proxy, traffic governance",
    source,
    service,
  }
}

export async function getGatewayStatus(input: ServiceAdapterInput = {}) {
  return proxyModuleService({ ...config, defaultPath: "/status", defaultMethod: "GET" }, input)
}

export async function proxyGatewayRequest(input: ServiceAdapterInput = {}) {
  return proxyModuleService({ ...config, defaultPath: "/proxy", defaultMethod: "POST" }, input)
}
