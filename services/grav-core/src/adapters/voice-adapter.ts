import { getUnifiedModuleInventory } from "../module-bindings.js"
import { probeModuleService, proxyModuleService, type ServiceAdapterInput } from "./service-adapters.js"

const config = {
  moduleId: "voice",
  envName: "GRAVITY_VOICE_BASE_URL",
  defaultPath: "/session",
  allowedPathPrefixes: ["/", "/health", "/status", "/session", "/sessions", "/tts", "/stt", "/models", "/api"],
}

export async function getVoiceInventory() {
  const source = await getUnifiedModuleInventory({ moduleId: "voice", includeRoutes: true })
  const service = await probeModuleService({
    moduleId: config.moduleId,
    envName: config.envName,
    allowedPathPrefixes: config.allowedPathPrefixes,
    probePaths: ["/health", "/status", "/models", "/session"],
  })

  return {
    ok: true as const,
    status: 200,
    moduleId: "voice",
    serviceCapability: "voice session, TTS, STT, streaming/realtime audio",
    source,
    service,
  }
}

export async function createVoiceSession(input: ServiceAdapterInput = {}) {
  return proxyModuleService({ ...config, defaultPath: "/session", defaultMethod: "POST" }, input)
}

export async function runVoiceTts(input: ServiceAdapterInput = {}) {
  return proxyModuleService({ ...config, defaultPath: "/tts", defaultMethod: "POST" }, input)
}

export async function runVoiceStt(input: ServiceAdapterInput = {}) {
  return proxyModuleService({ ...config, defaultPath: "/stt", defaultMethod: "POST" }, input)
}
