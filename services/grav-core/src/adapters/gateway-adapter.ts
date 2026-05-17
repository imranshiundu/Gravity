import { getUnifiedModuleInventory } from "../module-bindings.js"
import { REVIEWED_GATEWAY_PATH_PREFIXES } from "../gateway-module.js"
import { probeModuleService, proxyModuleService, type ServiceAdapterInput } from "./service-adapters.js"

const config = {
  moduleId: "gateway",
  envName: "GRAVITY_GATEWAY_BASE_URL",
  defaultPath: "/status",
  allowedPathPrefixes: [...REVIEWED_GATEWAY_PATH_PREFIXES],
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
    reviewedProxyContract: {
      allowedPathPrefixes: config.allowedPathPrefixes,
      statusDefaultPath: "/status",
      proxyDefaultPath: "/proxy",
      approvalRequiredForProxy: true,
    },
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
