export const gravityEndpoints = {
  assistant: {
    status: "/api/assistant/status",
    chat: "/api/assistant/chat",
  },
  runtime: {
    ollamaStatus: "/api/ollama/status",
    ollamaChat: "/api/ollama/chat",
  },
  modules: {
    allStatus: "/api/modules/status",
    coreStatus: "/api/core/status",
    memoryStatus: "/api/memory/status",
    channelsStatus: "/api/channels/status",
    voiceStatus: "/api/voice/status",
    codingStatus: "/api/coding/status",
    defenseStatus: "/api/defense/status",
    gatewayStatus: "/api/gateway/status",
  },
  planned: {
    memorySearch: "/api/memory/search",
    memorySave: "/api/memory/save",
    memoryForget: "/api/memory/forget",
    codingScan: "/api/coding/scan",
    defenseScan: "/api/defense/scan",
    voiceSession: "/api/voice/session",
    channelsInbox: "/api/channels/inbox",
  },
} as const
