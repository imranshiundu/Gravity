import { access, readFile } from "node:fs/promises"
import path from "node:path"

import type { GravityChatInput, GravityChatMessage } from "@gravity/contracts"

type LocalMemoryEntry = {
  id?: string
  content?: string
  type?: string
  source?: string
  tags?: string[]
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export type GravCoreMemorySearchResult = {
  ok: boolean
  configured: boolean
  source: string
  query: string
  count: number
  memories: Array<{
    id: string
    content: string
    type: string
    source: string
    tags: string[]
    score: number
    createdAt?: string
  }>
  error?: string
}

const DEFAULT_MEMORY_LIMIT = 5
const MAX_MEMORY_CONTEXT_CHARS = 2_500
const MAX_MEMORY_ITEM_CHARS = 500
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "we",
  "what",
  "with",
  "you",
  "your",
])

function getMemoryFilePath() {
  if (process.env.GRAVITY_MEMORY_FILE?.trim()) {
    return path.resolve(process.env.GRAVITY_MEMORY_FILE.trim())
  }

  if (process.env.GRAVITY_DATA_DIR?.trim()) {
    return path.join(path.resolve(process.env.GRAVITY_DATA_DIR.trim()), "memory.json")
  }

  return path.join(process.cwd(), ".grav-core", "memory.json")
}

function trimText(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim()
  return normalized.length > limit ? `${normalized.slice(0, limit)}…` : normalized
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9_@./:-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
}

function getLastUserText(input: GravityChatInput) {
  return [...(input.messages || [])]
    .reverse()
    .find((message) => message.role === "user")
    ?.content?.trim()
}

async function memoryFileExists(filePath: string) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function readLocalMemories(filePath: string): Promise<LocalMemoryEntry[]> {
  if (!(await memoryFileExists(filePath))) {
    return []
  }

  const raw = await readFile(filePath, "utf-8")
  const parsed = JSON.parse(raw) as unknown

  if (!Array.isArray(parsed)) {
    return []
  }

  return parsed.filter((entry): entry is LocalMemoryEntry => {
    return Boolean(entry) && typeof entry === "object" && typeof (entry as LocalMemoryEntry).content === "string"
  })
}

export async function searchCoreMemories(input: GravityChatInput): Promise<GravCoreMemorySearchResult> {
  const source = getMemoryFilePath()
  const query = getLastUserText(input) || ""

  if (!query) {
    return {
      ok: true,
      configured: true,
      source,
      query,
      count: 0,
      memories: [],
    }
  }

  try {
    const entries = await readLocalMemories(source)
    const queryTokens = new Set(tokenize(query))

    if (entries.length === 0 || queryTokens.size === 0) {
      return {
        ok: true,
        configured: await memoryFileExists(source),
        source,
        query,
        count: 0,
        memories: [],
      }
    }

    const scored = entries
      .map((entry, index) => {
        const haystack = [entry.content, entry.type, entry.source, ...(entry.tags || [])]
          .join(" ")
          .toLowerCase()
        const score = [...queryTokens].reduce((total, token) => {
          return haystack.includes(token) ? total + 1 : total
        }, 0)

        return {
          entry,
          index,
          score,
        }
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, DEFAULT_MEMORY_LIMIT)

    const memories = scored.map(({ entry, score }, index) => ({
      id: entry.id || `memory-${index}`,
      content: trimText(entry.content || "", MAX_MEMORY_ITEM_CHARS),
      type: entry.type || "note",
      source: entry.source || "gravity-memory",
      tags: Array.isArray(entry.tags) ? entry.tags.filter((tag): tag is string => typeof tag === "string") : [],
      score,
      createdAt: entry.createdAt,
    }))

    return {
      ok: true,
      configured: true,
      source,
      query,
      count: memories.length,
      memories,
    }
  } catch (error) {
    return {
      ok: false,
      configured: true,
      source,
      query,
      count: 0,
      memories: [],
      error: error instanceof Error ? error.message : "Unable to search memory file.",
    }
  }
}

export function buildMemoryContextMessage(result: GravCoreMemorySearchResult): GravityChatMessage | null {
  if (!result.ok || result.memories.length === 0) {
    return null
  }

  let context = "Relevant Gravity memory context. Use only when helpful; do not claim memory certainty beyond this context.\n"

  for (const memory of result.memories) {
    const nextLine = `\n- [${memory.type} | ${memory.source} | score ${memory.score}] ${memory.content}`
    if ((context + nextLine).length > MAX_MEMORY_CONTEXT_CHARS) {
      break
    }
    context += nextLine
  }

  return {
    role: "system",
    content: context,
  }
}

export function summarizeMemoryUse(result: GravCoreMemorySearchResult) {
  return {
    enabled: result.ok,
    configured: result.configured,
    source: result.source,
    matched: result.count,
    error: result.error,
  }
}
