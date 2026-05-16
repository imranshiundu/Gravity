import { execFile } from "node:child_process"
import { access } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"

import type { GravityChatInput, GravityChatMessage } from "@gravity/contracts"

const execFileAsync = promisify(execFile)

export type GravCoreMemorySearchInput = {
  query?: string
  wing?: string
  room?: string
  limit?: number
}

export type GravCoreMemorySearchResult = {
  ok: boolean
  configured: boolean
  backend: "mempalace"
  source: string
  palacePath?: string
  query: string
  count: number
  memories: Array<{
    id: string
    content: string
    type: string
    source: string
    wing?: string
    room?: string
    tags: string[]
    score: number
    createdAt?: string
  }>
  error?: string
  hint?: string
}

type MempalaceBridgeResponse = {
  error?: string
  hint?: string
  query?: string
  palace_path?: string
  results?: Array<{
    text?: string
    wing?: string
    room?: string
    source_file?: string
    similarity?: number
  }>
}

const DEFAULT_MEMORY_LIMIT = 5
const MAX_MEMORY_LIMIT = 20
const MAX_MEMORY_CONTEXT_CHARS = 2_500
const MAX_MEMORY_ITEM_CHARS = 700

const MEM_PALACE_BRIDGE_SCRIPT = String.raw`
import base64
import json
import sys

payload = json.loads(base64.b64decode(sys.argv[1]).decode("utf-8"))

from mempalace.config import MempalaceConfig
from mempalace.searcher import search_memories

palace_path = payload.get("palacePath") or MempalaceConfig().palace_path
result = search_memories(
    query=payload.get("query") or "",
    palace_path=palace_path,
    wing=payload.get("wing") or None,
    room=payload.get("room") or None,
    n_results=int(payload.get("limit") or 5),
)
result["palace_path"] = palace_path
print(json.dumps(result))
`

function normalizeLimit(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MEMORY_LIMIT
  }

  return Math.min(Math.max(Math.trunc(value), 1), MAX_MEMORY_LIMIT)
}

function trimText(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim()
  return normalized.length > limit ? `${normalized.slice(0, limit)}…` : normalized
}

function getLastUserText(input: GravityChatInput) {
  return [...(input.messages || [])]
    .reverse()
    .find((message) => message.role === "user")
    ?.content?.trim()
}

async function pathExists(targetPath: string) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

async function findRepoRoot() {
  const explicitRoot = process.env.GRAVITY_REPO_ROOT?.trim()
  const candidates = explicitRoot ? [path.resolve(explicitRoot)] : []

  let current = process.cwd()
  for (let index = 0; index < 8; index += 1) {
    candidates.push(current)
    const next = path.dirname(current)
    if (next === current) {
      break
    }
    current = next
  }

  for (const candidate of candidates) {
    const marker = path.join(candidate, "modules", "memory", "mempalace", "searcher.py")
    if (await pathExists(marker)) {
      return candidate
    }
  }

  return ""
}

function getPythonCommand() {
  return process.env.GRAVITY_MEMPALACE_PYTHON?.trim() || process.env.PYTHON?.trim() || "python3"
}

function getMemoryScope(input: GravityChatInput | GravCoreMemorySearchInput) {
  const context = "context" in input && input.context && typeof input.context === "object" ? input.context : {}
  const contextRecord = context as Record<string, unknown>

  return {
    wing:
      typeof (input as GravCoreMemorySearchInput).wing === "string" &&
      (input as GravCoreMemorySearchInput).wing?.trim()
        ? (input as GravCoreMemorySearchInput).wing?.trim()
        : typeof contextRecord.memoryWing === "string" && contextRecord.memoryWing.trim()
          ? contextRecord.memoryWing.trim()
          : process.env.GRAVITY_MEMPALACE_WING?.trim() || undefined,
    room:
      typeof (input as GravCoreMemorySearchInput).room === "string" &&
      (input as GravCoreMemorySearchInput).room?.trim()
        ? (input as GravCoreMemorySearchInput).room?.trim()
        : typeof contextRecord.memoryRoom === "string" && contextRecord.memoryRoom.trim()
          ? contextRecord.memoryRoom.trim()
          : process.env.GRAVITY_MEMPALACE_ROOM?.trim() || undefined,
  }
}

async function runMempalaceBridge(input: GravCoreMemorySearchInput): Promise<MempalaceBridgeResponse> {
  const repoRoot = await findRepoRoot()

  if (!repoRoot) {
    return {
      error: "MemPalace module not found under modules/memory.",
      hint: "Set GRAVITY_REPO_ROOT to the Gravity repository root or run Core from inside the repo.",
      results: [],
    }
  }

  const modulePath = path.join(repoRoot, "modules", "memory")
  const payload = Buffer.from(
    JSON.stringify({
      query: input.query || "",
      wing: input.wing,
      room: input.room,
      limit: normalizeLimit(input.limit),
      palacePath:
        process.env.MEMPALACE_PALACE_PATH?.trim() || process.env.MEMPAL_PALACE_PATH?.trim() || undefined,
    })
  ).toString("base64")

  const { stdout } = await execFileAsync(getPythonCommand(), ["-c", MEM_PALACE_BRIDGE_SCRIPT, payload], {
    env: {
      ...process.env,
      PYTHONPATH: [modulePath, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
    },
    timeout: 15_000,
    maxBuffer: 2_000_000,
  })

  return JSON.parse(stdout.trim()) as MempalaceBridgeResponse
}

export async function searchMempalaceMemories(
  input: GravCoreMemorySearchInput
): Promise<GravCoreMemorySearchResult> {
  const query = typeof input.query === "string" ? input.query.trim() : ""
  const scope = getMemoryScope(input)
  const source = "modules/memory/mempalace.searcher.search_memories"

  if (!query) {
    return {
      ok: true,
      configured: true,
      backend: "mempalace",
      source,
      query,
      count: 0,
      memories: [],
    }
  }

  try {
    const response = await runMempalaceBridge({
      query,
      wing: scope.wing,
      room: scope.room,
      limit: normalizeLimit(input.limit),
    })

    if (response.error) {
      return {
        ok: false,
        configured: response.error !== "No palace found",
        backend: "mempalace",
        source,
        palacePath: response.palace_path,
        query,
        count: 0,
        memories: [],
        error: response.error,
        hint: response.hint,
      }
    }

    const memories = (response.results || []).map((item, index) => ({
      id: `${item.wing || "wing"}:${item.room || "room"}:${item.source_file || index}`,
      content: trimText(item.text || "", MAX_MEMORY_ITEM_CHARS),
      type: "mempalace-drawer",
      source: item.source_file || "mempalace",
      wing: item.wing,
      room: item.room,
      tags: [item.wing, item.room].filter((tag): tag is string => Boolean(tag)),
      score: typeof item.similarity === "number" ? item.similarity : 0,
    }))

    return {
      ok: true,
      configured: true,
      backend: "mempalace",
      source,
      palacePath: response.palace_path,
      query,
      count: memories.length,
      memories,
    }
  } catch (error) {
    return {
      ok: false,
      configured: true,
      backend: "mempalace",
      source,
      query,
      count: 0,
      memories: [],
      error: error instanceof Error ? error.message : "Unable to call MemPalace module.",
    }
  }
}

export async function searchCoreMemories(input: GravityChatInput): Promise<GravCoreMemorySearchResult> {
  const scope = getMemoryScope(input)
  return searchMempalaceMemories({
    query: getLastUserText(input) || "",
    wing: scope.wing,
    room: scope.room,
    limit: DEFAULT_MEMORY_LIMIT,
  })
}

export function buildMemoryContextMessage(result: GravCoreMemorySearchResult): GravityChatMessage | null {
  if (!result.ok || result.memories.length === 0) {
    return null
  }

  let context = "Relevant MemPalace memory context from modules/memory. Use only when helpful; do not claim memory certainty beyond this context.\n"

  for (const memory of result.memories) {
    const location = [memory.wing, memory.room].filter(Boolean).join("/") || "unknown"
    const nextLine = `\n- [${location} | ${memory.source} | score ${memory.score}] ${memory.content}`
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
    backend: result.backend,
    source: result.source,
    palacePath: result.palacePath,
    matched: result.count,
    error: result.error,
    hint: result.hint,
  }
}
