import { getChannelsModuleInventory, REVIEWED_CHANNELS_READ_PATH_PREFIXES, REVIEWED_CHANNELS_SEND_PATH_PREFIXES } from "../channels-module.js"
import { probeModuleService, proxyModuleService, type ServiceAdapterInput } from "./service-adapters.js"

const readConfig = {
  moduleId: "channels",
  envName: "GRAVITY_CHANNELS_BASE_URL",
  defaultPath: "/inbox",
  defaultMethod: "GET",
  allowedPathPrefixes: [...REVIEWED_CHANNELS_READ_PATH_PREFIXES],
}

const sendConfig = {
  moduleId: "channels",
  envName: "GRAVITY_CHANNELS_BASE_URL",
  defaultPath: "/send",
  defaultMethod: "POST",
  allowedPathPrefixes: [...REVIEWED_CHANNELS_SEND_PATH_PREFIXES],
}

export async function getChannelsInventory() {
  const source = await getChannelsModuleInventory({ includeRoutes: true, includeFiles: false })
  const service = await probeModuleService({
    moduleId: "channels",
    envName: "GRAVITY_CHANNELS_BASE_URL",
    allowedPathPrefixes: [...REVIEWED_CHANNELS_READ_PATH_PREFIXES],
    probePaths: ["/health", "/status", "/plugins", "/providers", "/inbox"],
  })

  return {
    ok: true as const,
    status: 200,
    moduleId: "channels",
    serviceCapability: "multi-platform inbox/send/plugin adapter",
    reviewedProxyContract: {
      readAllowedPathPrefixes: [...REVIEWED_CHANNELS_READ_PATH_PREFIXES],
      sendAllowedPathPrefixes: [...REVIEWED_CHANNELS_SEND_PATH_PREFIXES],
      inboxDefaultPath: "/inbox",
      sendDefaultPath: "/send",
      approvalRequiredForSend: true,
      removedBroadPrefixes: ["/", "/api"],
    },
    source,
    service,
  }
}

export async function readChannelsInbox(input: ServiceAdapterInput = {}) {
  return proxyModuleService(readConfig, { ...input, method: "GET" })
}

export async function sendChannelMessage(input: ServiceAdapterInput = {}) {
  return proxyModuleService(sendConfig, input)
}
