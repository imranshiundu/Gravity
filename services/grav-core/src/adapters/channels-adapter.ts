import { getUnifiedModuleInventory } from "../module-bindings.js"
import { probeModuleService, proxyModuleService, type ServiceAdapterInput } from "./service-adapters.js"

const config = {
  moduleId: "channels",
  envName: "GRAVITY_CHANNELS_BASE_URL",
  defaultPath: "/inbox",
  allowedPathPrefixes: ["/", "/health", "/status", "/inbox", "/send", "/plugins", "/providers", "/webhook", "/api"],
}

export async function getChannelsInventory() {
  const source = await getUnifiedModuleInventory({ moduleId: "channels", includeRoutes: true })
  const service = await probeModuleService({
    moduleId: config.moduleId,
    envName: config.envName,
    allowedPathPrefixes: config.allowedPathPrefixes,
    probePaths: ["/health", "/status", "/plugins", "/inbox"],
  })

  return {
    ok: true as const,
    status: 200,
    moduleId: "channels",
    serviceCapability: "multi-platform inbox/send/plugin adapter",
    source,
    service,
  }
}

export async function readChannelsInbox(input: ServiceAdapterInput = {}) {
  return proxyModuleService({ ...config, defaultPath: "/inbox", defaultMethod: "GET" }, input)
}

export async function sendChannelMessage(input: ServiceAdapterInput = {}) {
  return proxyModuleService({ ...config, defaultPath: "/send", defaultMethod: "POST" }, input)
}
