import {
  getVoiceModuleInventory,
  REVIEWED_VOICE_READ_PATH_PREFIXES,
  REVIEWED_VOICE_SESSION_PATH_PREFIXES,
  REVIEWED_VOICE_STT_PATH_PREFIXES,
  REVIEWED_VOICE_TTS_PATH_PREFIXES,
} from "../voice-module.js"
import { probeModuleService, proxyModuleService, type ServiceAdapterInput } from "./service-adapters.js"

const sessionConfig = {
  moduleId: "voice",
  envName: "GRAVITY_VOICE_BASE_URL",
  defaultPath: "/session",
  defaultMethod: "POST",
  allowedPathPrefixes: [...REVIEWED_VOICE_SESSION_PATH_PREFIXES],
}

const ttsConfig = {
  moduleId: "voice",
  envName: "GRAVITY_VOICE_BASE_URL",
  defaultPath: "/tts",
  defaultMethod: "POST",
  allowedPathPrefixes: [...REVIEWED_VOICE_TTS_PATH_PREFIXES],
}

const sttConfig = {
  moduleId: "voice",
  envName: "GRAVITY_VOICE_BASE_URL",
  defaultPath: "/stt",
  defaultMethod: "POST",
  allowedPathPrefixes: [...REVIEWED_VOICE_STT_PATH_PREFIXES],
}

export async function getVoiceInventory() {
  const source = await getVoiceModuleInventory({ includeRoutes: true, includeFiles: false })
  const service = await probeModuleService({
    moduleId: "voice",
    envName: "GRAVITY_VOICE_BASE_URL",
    allowedPathPrefixes: [...REVIEWED_VOICE_READ_PATH_PREFIXES],
    probePaths: ["/health", "/status", "/models"],
  })

  return {
    ok: true as const,
    status: 200,
    moduleId: "voice",
    serviceCapability: "voice session, TTS, STT, streaming/realtime audio",
    reviewedProxyContract: {
      readAllowedPathPrefixes: [...REVIEWED_VOICE_READ_PATH_PREFIXES],
      sessionAllowedPathPrefixes: [...REVIEWED_VOICE_SESSION_PATH_PREFIXES],
      ttsAllowedPathPrefixes: [...REVIEWED_VOICE_TTS_PATH_PREFIXES],
      sttAllowedPathPrefixes: [...REVIEWED_VOICE_STT_PATH_PREFIXES],
      sessionDefaultPath: "/session",
      ttsDefaultPath: "/tts",
      sttDefaultPath: "/stt",
      removedBroadPrefixes: ["/", "/api"],
    },
    source,
    service,
  }
}

export async function createVoiceSession(input: ServiceAdapterInput = {}) {
  return proxyModuleService(sessionConfig, input)
}

export async function runVoiceTts(input: ServiceAdapterInput = {}) {
  return proxyModuleService(ttsConfig, input)
}

export async function runVoiceStt(input: ServiceAdapterInput = {}) {
  return proxyModuleService(sttConfig, input)
}
