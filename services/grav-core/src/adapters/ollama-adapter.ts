import {
  getOllamaModuleInventory,
  REVIEWED_OLLAMA_CHAT_PATH_PREFIXES,
  REVIEWED_OLLAMA_GENERATE_PATH_PREFIXES,
  REVIEWED_OLLAMA_READ_PATH_PREFIXES,
} from "../ollama-module.js"
import { probeModuleService, proxyModuleService, type ServiceAdapterInput } from "./service-adapters.js"

const modelsConfig = {
  moduleId: "ollama",
  envName: "OLLAMA_BASE_URL",
  defaultPath: "/api/tags",
  defaultMethod: "GET",
  allowedPathPrefixes: [...REVIEWED_OLLAMA_READ_PATH_PREFIXES],
}

const generateConfig = {
  moduleId: "ollama",
  envName: "OLLAMA_BASE_URL",
  defaultPath: "/api/generate",
  defaultMethod: "POST",
  allowedPathPrefixes: [...REVIEWED_OLLAMA_GENERATE_PATH_PREFIXES],
}

const chatConfig = {
  moduleId: "ollama",
  envName: "OLLAMA_BASE_URL",
  defaultPath: "/api/chat",
  defaultMethod: "POST",
  allowedPathPrefixes: [...REVIEWED_OLLAMA_CHAT_PATH_PREFIXES],
}

export async function getOllamaInventory() {
  const source = await getOllamaModuleInventory({ includeRoutes: true, includeFiles: false })
  const service = await probeModuleService({
    moduleId: "ollama",
    envName: "OLLAMA_BASE_URL",
    allowedPathPrefixes: [...REVIEWED_OLLAMA_READ_PATH_PREFIXES],
    probePaths: ["/api/tags", "/api/version"],
  })

  return {
    ok: true as const,
    status: 200,
    moduleId: "ollama",
    serviceCapability: "local model provider, chat, generation, model listing",
    reviewedProxyContract: {
      readAllowedPathPrefixes: [...REVIEWED_OLLAMA_READ_PATH_PREFIXES],
      generateAllowedPathPrefixes: [...REVIEWED_OLLAMA_GENERATE_PATH_PREFIXES],
      chatAllowedPathPrefixes: [...REVIEWED_OLLAMA_CHAT_PATH_PREFIXES],
      modelsDefaultPath: "/api/tags",
      generateDefaultPath: "/api/generate",
      chatDefaultPath: "/api/chat",
      removedBroadPrefixes: ["/", "/api", "/health", "/status"],
    },
    source,
    service,
  }
}

export async function listOllamaModels(input: ServiceAdapterInput = {}) {
  return proxyModuleService(modelsConfig, input)
}

export async function runOllamaGenerate(input: ServiceAdapterInput = {}) {
  return proxyModuleService(generateConfig, input)
}

export async function runOllamaChatAdapter(input: ServiceAdapterInput = {}) {
  return proxyModuleService(chatConfig, input)
}
