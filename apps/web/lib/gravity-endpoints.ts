export const gravityEndpoints = {
  assistant: {
    status: "/api/assistant/status",
    chat: "/api/assistant/chat",
  },
  runtime: {
    ollamaStatus: "/api/ollama/status",
    ollamaChat: "/api/ollama/chat",
  },
  planned: {
    coreStatus: "/api/core/status",
    memoryStatus: "/api/memory/status",
    channelsStatus: "/api/channels/status",
    voiceStatus: "/api/voice/status",
    codingStatus: "/api/coding/status",
    defenseStatus: "/api/defense/status",
  },
} as const
