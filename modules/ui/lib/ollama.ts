const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434"

export type OllamaModel = {
  name: string
  size?: number
  modified_at?: string
  digest?: string
}

export type OllamaStatus = {
  available: boolean
  baseUrl: string
  defaultModel: string | null
  models: OllamaModel[]
  error?: string
}

export function getOllamaBaseUrl() {
  return (
    process.env.OLLAMA_BASE_URL?.trim().replace(/\/$/, "") ??
    DEFAULT_OLLAMA_BASE_URL
  )
}

export async function getOllamaStatus(): Promise<OllamaStatus> {
  const baseUrl = getOllamaBaseUrl()

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`)
    }

    const payload = (await response.json()) as { models?: OllamaModel[] }
    const models = payload.models ?? []

    return {
      available: true,
      baseUrl,
      defaultModel: process.env.GRAV_DEFAULT_MODEL?.trim() || models[0]?.name || null,
      models,
    }
  } catch (error) {
    return {
      available: false,
      baseUrl,
      defaultModel: process.env.GRAV_DEFAULT_MODEL?.trim() || null,
      models: [],
      error: error instanceof Error ? error.message : "Unable to reach Ollama",
    }
  }
}
