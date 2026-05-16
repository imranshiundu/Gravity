import { getUnifiedModuleInventory } from "../module-bindings.js"
import { probeModuleService, proxyModuleService, type ServiceAdapterInput } from "./service-adapters.js"

const config = {
  moduleId: "ollama",
  envName: "OLLAMA_BASE_URL",
  defaultPath: "/api/tags",
  allowedPathPrefixes: ["/api", "/health", "/status"],
}

export async function getOllamaInventory() {
  const source = await getUnifiedModuleInventory({ moduleId: "ollama", includeRoutes: true })
  const service = await probeModuleService({
    moduleId: config.moduleId,
    envName: config.envName,
    allowedPathPrefixes: config.allowedPathPrefixes,
    probePaths: ["/api/tags", "/api/version"],
  })

  return {
    ok: true as const,
    status: 200,
    moduleId: "ollama",
    serviceCapability: "local model provider, chat, generation, model listing",
    source,
    service,
  }
}

export async function listOllamaModels(input: ServiceAdapterInput = {}) {
  return proxyModuleService({ ...config, defaultPath: "/api/tags", defaultMethod: "GET" }, input)
}

export async function runOllamaGenerate(input: ServiceAdapterInput = {}) {
  return proxyModuleService({ ...config, defaultPath: "/api/generate", defaultMethod: "POST" }, input)
}

export async function runOllamaChatAdapter(input: ServiceAdapterInput = {}) {
  return proxyModuleService({ ...config, defaultPath: "/api/chat", defaultMethod: "POST" }, input)
}
