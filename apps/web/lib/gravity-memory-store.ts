import { randomUUID } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

export type GravityMemoryEntry = {
  id: string
  content: string
  type: string
  source: string
  tags: string[]
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type GravityMemorySaveInput = {
  content?: unknown
  type?: unknown
  source?: unknown
  tags?: unknown
  metadata?: unknown
}

export type GravityMemorySearchInput = {
  query?: unknown
  limit?: unknown
  type?: unknown
  tag?: unknown
}

export type GravityMemoryForgetInput = {
  id?: unknown
  query?: unknown
}

const DEFAULT_MEMORY_TYPE = "note"
const DEFAULT_MEMORY_SOURCE = "gravity-web"
const DEFAULT_MEMORY_LIMIT = 20
const MAX_MEMORY_LIMIT = 100

function getGravityDataDir() {
  return process.env.GRAVITY_DATA_DIR?.trim() || path.join(process.cwd(), ".gravity")
}

function getMemoryFilePath() {
  return path.join(getGravityDataDir(), "memory.json")
}

async function ensureMemoryFile() {
  await mkdir(getGravityDataDir(), { recursive: true })

  try {
    await readFile(getMemoryFilePath(), "utf-8")
  } catch {
    await writeFile(getMemoryFilePath(), "[]\n", "utf-8")
  }
}

async function readMemoryEntries(): Promise<GravityMemoryEntry[]> {
  await ensureMemoryFile()

  const raw = await readFile(getMemoryFilePath(), "utf-8")

  try {
    const parsed = JSON.parse(raw) as GravityMemoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeMemoryEntries(entries: GravityMemoryEntry[]) {
  await ensureMemoryFile()
  await writeFile(getMemoryFilePath(), `${JSON.stringify(entries, null, 2)}\n`, "utf-8")
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function normalizeLimit(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MEMORY_LIMIT
  }

  return Math.min(Math.max(Math.trunc(value), 1), MAX_MEMORY_LIMIT)
}

export async function saveGravityMemory(input: GravityMemorySaveInput) {
  if (typeof input.content !== "string" || !input.content.trim()) {
    return {
      ok: false as const,
      status: 400,
      error: "Memory content is required.",
    }
  }

  const now = new Date().toISOString()
  const entry: GravityMemoryEntry = {
    id: randomUUID(),
    content: input.content.trim(),
    type: typeof input.type === "string" && input.type.trim() ? input.type.trim() : DEFAULT_MEMORY_TYPE,
    source:
      typeof input.source === "string" && input.source.trim()
        ? input.source.trim()
        : DEFAULT_MEMORY_SOURCE,
    tags: normalizeTags(input.tags),
    metadata: normalizeMetadata(input.metadata),
    createdAt: now,
    updatedAt: now,
  }

  const entries = await readMemoryEntries()
  entries.unshift(entry)
  await writeMemoryEntries(entries)

  return {
    ok: true as const,
    status: 201,
    entry,
  }
}

export async function searchGravityMemory(input: GravityMemorySearchInput) {
  const query = typeof input.query === "string" ? input.query.trim().toLowerCase() : ""
  const type = typeof input.type === "string" ? input.type.trim().toLowerCase() : ""
  const tag = typeof input.tag === "string" ? input.tag.trim().toLowerCase() : ""
  const limit = normalizeLimit(input.limit)

  const entries = await readMemoryEntries()

  const results = entries
    .filter((entry) => {
      const matchesType = !type || entry.type.toLowerCase() === type
      const matchesTag = !tag || entry.tags.some((item) => item.toLowerCase() === tag)
      const haystack = [entry.content, entry.type, entry.source, ...entry.tags]
        .join(" ")
        .toLowerCase()
      const matchesQuery = !query || haystack.includes(query)

      return matchesType && matchesTag && matchesQuery
    })
    .slice(0, limit)

  return {
    ok: true as const,
    query,
    count: results.length,
    results,
  }
}

export async function forgetGravityMemory(input: GravityMemoryForgetInput) {
  const id = typeof input.id === "string" ? input.id.trim() : ""
  const query = typeof input.query === "string" ? input.query.trim().toLowerCase() : ""

  if (!id && !query) {
    return {
      ok: false as const,
      status: 400,
      error: "Provide either a memory id or query to forget.",
    }
  }

  const entries = await readMemoryEntries()
  const remaining = entries.filter((entry) => {
    if (id) {
      return entry.id !== id
    }

    const haystack = [entry.content, entry.type, entry.source, ...entry.tags]
      .join(" ")
      .toLowerCase()

    return !haystack.includes(query)
  })

  await writeMemoryEntries(remaining)

  return {
    ok: true as const,
    deleted: entries.length - remaining.length,
    remaining: remaining.length,
  }
}
