import { readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"

import { getWorkspaceRoot, localToolsEnabled } from "./workspace-scan.js"

const MAX_FILES_PER_SOURCE = 700
const MAX_FILE_BYTES = 260_000
const MAX_READ_BYTES = 180_000
const MAX_SNIPPET_CHARS = 360

const IGNORED_DIRS = new Set([
  ".git",
  ".github",
  ".mypy_cache",
  ".next",
  ".pytest_cache",
  ".ruff_cache",
  ".turbo",
  ".venv",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "vendor",
])

const TEXT_FILE_EXTENSIONS = new Set([
  ".c",
  ".cjs",
  ".cpp",
  ".css",
  ".go",
  ".h",
  ".html",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".py",
  ".rs",
  ".sh",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
])

const BLOCKED_FULL_READ_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".npmrc",
  ".pypirc",
  "id_rsa",
  "id_ed25519",
])

export type GravityModuleContract = {
  id: string
  title: string
  sourcePaths: string[]
  role: "core" | "memory" | "coding" | "defense" | "gateway" | "channel" | "voice" | "orchestration" | "provider"
  expectedCapabilities: string[]
  serviceEnv?: string
  serviceDefaultRoutes?: string[]
  dangerousActions?: string[]
}

const MODULE_CONTRACTS: GravityModuleContract[] = [
  {
    id: "memory",
    title: "MemPalace memory",
    sourcePaths: ["modules/memory"],
    role: "memory",
    expectedCapabilities: ["memory", "retrieval", "indexing", "context-injection"],
  },
  {
    id: "coding-openhands",
    title: "OpenHands coding module",
    sourcePaths: ["modules/coding-openhands"],
    role: "coding",
    expectedCapabilities: ["coding-agent", "workspace-analysis", "tool-use", "mcp"],
    dangerousActions: ["coding.openhands.run"],
  },
  {
    id: "coding-aider",
    title: "Aider coding module",
    sourcePaths: ["modules/coding-aider"],
    role: "coding",
    expectedCapabilities: ["coding-cli", "repository-editing", "pair-programming"],
    dangerousActions: ["coding.aider.run"],
  },
  {
    id: "coding-claw",
    title: "Claw coding module",
    sourcePaths: ["modules/coding-claw"],
    role: "coding",
    expectedCapabilities: ["coding-agent", "repository-editing", "workspace-tools"],
    dangerousActions: ["coding.claw.run"],
  },
  {
    id: "core-module",
    title: "Core module source",
    sourcePaths: ["modules/core"],
    role: "core",
    expectedCapabilities: ["core-runtime", "contracts", "shared-system"],
  },
  {
    id: "defense",
    title: "Defense module",
    sourcePaths: ["modules/defense"],
    role: "defense",
    expectedCapabilities: ["defensive-scan", "audit", "secret-risk-review"],
  },
  {
    id: "gateway",
    title: "Gateway module",
    sourcePaths: ["modules/gateway"],
    role: "gateway",
    expectedCapabilities: ["proxy", "traffic-control", "route-control"],
    serviceEnv: "GRAVITY_GATEWAY_BASE_URL",
    serviceDefaultRoutes: ["/status", "/proxy"],
    dangerousActions: ["gateway.proxy"],
  },
  {
    id: "channels",
    title: "Channels module",
    sourcePaths: ["modules/channels"],
    role: "channel",
    expectedCapabilities: ["inbox", "send", "plugins", "multi-platform-chat"],
    serviceEnv: "GRAVITY_CHANNELS_BASE_URL",
    serviceDefaultRoutes: ["/inbox", "/send"],
    dangerousActions: ["channels.send"],
  },
  {
    id: "ollama",
    title: "Ollama module",
    sourcePaths: ["modules/ollama"],
    role: "provider",
    expectedCapabilities: ["local-llm", "model-provider", "chat-completion"],
    serviceEnv: "OLLAMA_BASE_URL",
    serviceDefaultRoutes: ["/api/tags", "/api/chat", "/api/generate"],
  },
  {
    id: "orchestration",
    title: "Orchestration module",
    sourcePaths: ["modules/orchestration"],
    role: "orchestration",
    expectedCapabilities: ["agents", "workflows", "tools", "handoffs", "guardrails"],
    serviceEnv: "GRAVITY_ORCHESTRATION_BASE_URL",
    serviceDefaultRoutes: ["/workflow/run"],
    dangerousActions: ["orchestration.workflow.run"],
  },
  {
    id: "voice",
    title: "Voice module",
    sourcePaths: ["modules/voice"],
    role: "voice",
    expectedCapabilities: ["voice", "tts", "stt", "streaming", "realtime"],
    serviceEnv: "GRAVITY_VOICE_BASE_URL",
    serviceDefaultRoutes: ["/session"],
  },
]

type SmallFileRead =
  | { ok: true; skipped: false; content: string; bytes: number }
  | { ok: true; skipped: true; content: ""; bytes: number; reason: string }
  | { ok: false; skipped: true; content: ""; bytes: 0; reason: string }

function normalizeRelativePath(relativePath: string) {
  return relativePath.replace(/\\/g, "/").replace(/^\/+/, "")
}

function safeJoin(root: string, relativePath: string) {
  const normalized = normalizeRelativePath(relativePath)
  const absolute = path.resolve(root, normalized)
  const resolvedRoot = path.resolve(root)

  if (absolute !== resolvedRoot && !absolute.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Path escapes Gravity workspace: ${relativePath}`)
  }

  return absolute
}

function isTextFile(filePath: string) {
  return TEXT_FILE_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

function isBlockedFullRead(relativePath: string) {
  const name = path.basename(relativePath).toLowerCase()
  return BLOCKED_FULL_READ_NAMES.has(name) || name.endsWith(".pem") || name.endsWith(".key") || name.endsWith(".crt")
}

function getModuleContracts(moduleId?: string) {
  if (!moduleId) return MODULE_CONTRACTS
  return MODULE_CONTRACTS.filter((item) => item.id === moduleId)
}

function getAllowedModuleIds() {
  return new Set(MODULE_CONTRACTS.map((item) => item.id))
}

function normalizeLimit(input: unknown, fallback = 30, max = 80) {
  if (typeof input !== "number" || !Number.isFinite(input)) return fallback
  return Math.max(1, Math.min(max, Math.trunc(input)))
}

function getSnippet(content: string, index: number) {
  const start = Math.max(0, index - 140)
  const end = Math.min(content.length, index + 240)
  return content.slice(start, end).replace(/\s+/g, " ").trim().slice(0, MAX_SNIPPET_CHARS)
}

function getLineNumber(content: string, index: number) {
  return content.slice(0, index).split("\n").length
}

async function probePath(root: string, relativePath: string) {
  try {
    const fileStat = await stat(safeJoin(root, relativePath))
    return {
      exists: true,
      isDirectory: fileStat.isDirectory(),
      isFile: fileStat.isFile(),
      bytes: fileStat.size,
    }
  } catch {
    return { exists: false, isDirectory: false, isFile: false }
  }
}

async function walkSourceFiles(root: string, sourcePath: string, dir = sourcePath, files: string[] = []): Promise<string[]> {
  if (files.length >= MAX_FILES_PER_SOURCE) return files

  let entries: Awaited<ReturnType<typeof readdir>>
  try {
    entries = await readdir(safeJoin(root, dir), { withFileTypes: true })
  } catch {
    return files
  }

  for (const entry of entries) {
    if (files.length >= MAX_FILES_PER_SOURCE) break
    const relativePath = normalizeRelativePath(path.posix.join(normalizeRelativePath(dir), entry.name))

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        await walkSourceFiles(root, sourcePath, relativePath, files)
      }
      continue
    }

    if (entry.isFile() && isTextFile(relativePath)) {
      files.push(relativePath)
    }
  }

  return files
}

async function readSmallTextFile(root: string, relativePath: string, maxBytes = MAX_FILE_BYTES): Promise<SmallFileRead> {
  try {
    const absolutePath = safeJoin(root, relativePath)
    const fileStat = await stat(absolutePath)

    if (!fileStat.isFile()) {
      return { ok: false, skipped: true, content: "", bytes: 0, reason: "Path is not a file." }
    }

    if (fileStat.size > maxBytes) {
      return {
        ok: true,
        skipped: true,
        content: "",
        bytes: fileStat.size,
        reason: `File is larger than ${maxBytes} bytes.`,
      }
    }

    return {
      ok: true,
      skipped: false,
      content: await readFile(absolutePath, "utf-8"),
      bytes: fileStat.size,
    }
  } catch (error) {
    return {
      ok: false,
      skipped: true,
      content: "",
      bytes: 0,
      reason: error instanceof Error ? error.message : "Unable to read file.",
    }
  }
}

function extractRouteHints(file: string, content: string) {
  const hints: string[] = []
  const patterns = [
    /@(app|router)\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g,
    /\bapp\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g,
    /\brouter\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g,
    /\bRoute::(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g,
    /\.route\(\s*["'`]([^"'`]+)["'`]/g,
  ]

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const route = match[3] || match[2] || match[1]
      if (route && route.startsWith("/")) hints.push(`${file} -> ${route}`)
    }
  }

  if (/app\/api\/.*\/route\.(ts|js)$/.test(file)) {
    hints.push(`${file} -> Next.js API route file`)
  }

  return hints.slice(0, 50)
}

function classifyFile(file: string, content: string) {
  const kinds: string[] = []

  if (/pyproject\.toml$|package\.json$|Cargo\.toml$|go\.mod$|requirements.*\.txt$|setup\.(py|cfg)$/.test(file)) kinds.push("manifest")
  if (/README\.md$|docs?\//i.test(file)) kinds.push("doc")
  if (/\.(yaml|yml|json|toml)$/.test(file) && !/package\.json$|pyproject\.toml$|Cargo\.toml$/.test(file)) kinds.push("config")

  if (/app\/api\/.*\/route\.(ts|js)$/.test(file) || /\bFastAPI\b|\bQuart\b|\bAPIRouter\b|@(app|router)\.(get|post|put|patch|delete)\b|\bapp\.(get|post|put|patch|delete)\(|\baxum::Router\b|\bRouter::new\(/.test(content)) {
    kinds.push("route")
  }

  if (/\b(click|argparse|typer|commander|program\.command|def main\(|fn main\(|if __name__ == ["']__main__["'])\b/.test(content)) kinds.push("cli")
  if (/\bmcp\b|\bfastmcp\b|Tool\(|BaseTool|tool_registry|@tool|\.tool\(|Agent\(|Workflow|handoff|guardrail/i.test(file) || /\bmcp\b|\bfastmcp\b|Tool\(|BaseTool|tool_registry|@tool|\.tool\(|Agent\(|Workflow|handoff|guardrail/i.test(content)) kinds.push("tooling")
  if (/\b(fetch|axios)\s*\(|requests\.(get|post|put|patch|delete)\(|httpx\.(get|post|put|patch|delete)\(|aiohttp\.|reqwest::|ureq::/.test(content)) kinds.push("http-client")
  if (/(api[_-]?key|secret|token|password|private[_-]?key)\s*[:=]/i.test(content)) kinds.push("secret-risk")

  return kinds
}

function parseManifestSignals(file: string, content: string) {
  const signals: string[] = []

  if (file.endsWith("pyproject.toml")) {
    const nameMatch = content.match(/^name\s*=\s*["']([^"']+)["']/m)
    if (nameMatch?.[1]) signals.push(`python-project:${nameMatch[1]}`)
    for (const match of content.matchAll(/^([A-Za-z0-9_.-]+)\s*=\s*["']([^"']+:[^"']+)["']/gm)) signals.push(`python-script:${match[1]} -> ${match[2]}`)
    if (/\bfastapi\b/i.test(content)) signals.push("server-framework:fastapi")
    if (/\bquart\b/i.test(content)) signals.push("server-framework:quart")
    if (/\bgradio\b/i.test(content)) signals.push("ui-server:gradio")
    if (/\bmcp\b|\bfastmcp\b/i.test(content)) signals.push("tool-protocol:mcp")
  }

  if (file.endsWith("package.json")) {
    try {
      const parsed = JSON.parse(content) as { name?: unknown; scripts?: Record<string, unknown>; dependencies?: Record<string, unknown> }
      if (typeof parsed.name === "string") signals.push(`node-package:${parsed.name}`)
      for (const [scriptName, command] of Object.entries(parsed.scripts || {})) {
        if (typeof command === "string") signals.push(`npm-script:${scriptName} -> ${command}`)
      }
      const deps = Object.keys(parsed.dependencies || {})
      if (deps.includes("express")) signals.push("server-framework:express")
      if (deps.includes("fastify")) signals.push("server-framework:fastify")
      if (deps.includes("@openai/agents")) signals.push("agent-framework:openai-agents")
    } catch {
      signals.push("package-json:unparseable")
    }
  }

  if (file.endsWith("Cargo.toml")) {
    const nameMatch = content.match(/^name\s*=\s*["']([^"']+)["']/m)
    if (nameMatch?.[1]) signals.push(`rust-package:${nameMatch[1]}`)
    if (/\baxum\b/.test(content)) signals.push("server-framework:axum")
    if (/\bpingora\b/.test(content)) signals.push("proxy-framework:pingora")
    if (/\bclap\b/.test(content)) signals.push("cli-framework:clap")
  }

  if (file.endsWith("go.mod")) {
    const moduleMatch = content.match(/^module\s+(.+)$/m)
    if (moduleMatch?.[1]) signals.push(`go-module:${moduleMatch[1].trim()}`)
  }

  return signals
}

function localToolsDisabled() {
  if (localToolsEnabled()) return undefined
  return {
    ok: false as const,
    status: 403,
    error:
      "Local module binding tools are disabled. Set GRAVITY_ENABLE_LOCAL_TOOLS=true and GRAVITY_WORKSPACE_ROOT or GRAVITY_REPO_ROOT to inspect module source trees.",
  }
}

function validateModuleId(moduleId?: string) {
  if (!moduleId) return undefined
  if (getAllowedModuleIds().has(moduleId)) return undefined
  return {
    ok: false as const,
    status: 400,
    error: `Unsupported moduleId: ${moduleId}. Allowed modules: ${MODULE_CONTRACTS.map((item) => item.id).join(", ")}.`,
  }
}

export async function getUnifiedModuleInventory(input: { moduleId?: string; includeFiles?: boolean; includeRoutes?: boolean } = {}) {
  const disabled = localToolsDisabled()
  if (disabled) return disabled
  const invalid = validateModuleId(input.moduleId)
  if (invalid) return invalid

  const root = getWorkspaceRoot()
  const modules = []

  for (const contract of getModuleContracts(input.moduleId)) {
    const sourceReports = []
    const moduleTotals = {
      scannedFiles: 0,
      manifests: 0,
      routes: 0,
      cliEntrypoints: 0,
      toolFiles: 0,
      httpClients: 0,
      configs: 0,
      docs: 0,
      warnings: 0,
    }

    for (const sourcePath of contract.sourcePaths) {
      const probe = await probePath(root, sourcePath)
      if (!probe.exists || !probe.isDirectory) {
        sourceReports.push({
          sourcePath,
          sourceState: "missing",
          scannedFiles: 0,
          manifests: [],
          routes: [],
          cliEntrypoints: [],
          toolFiles: [],
          httpClients: [],
          configFiles: [],
          docs: [],
          routeHints: [],
          manifestSignals: [],
          warnings: [`${sourcePath} is missing from this workspace.`],
          files: input.includeFiles === true ? [] : undefined,
        })
        moduleTotals.warnings += 1
        continue
      }

      const files = await walkSourceFiles(root, sourcePath)
      const manifests: string[] = []
      const routes: string[] = []
      const cliEntrypoints: string[] = []
      const toolFiles: string[] = []
      const httpClients: string[] = []
      const configFiles: string[] = []
      const docs: string[] = []
      const routeHints: string[] = []
      const manifestSignals: string[] = []
      const warnings: string[] = []

      for (const file of files) {
        const payload = await readSmallTextFile(root, file)
        if (payload.skipped) {
          warnings.push(`${file}: ${payload.reason}`)
          continue
        }

        const kinds = classifyFile(file, payload.content)
        if (kinds.includes("manifest")) manifests.push(file)
        if (kinds.includes("route")) routes.push(file)
        if (kinds.includes("cli")) cliEntrypoints.push(file)
        if (kinds.includes("tooling")) toolFiles.push(file)
        if (kinds.includes("http-client")) httpClients.push(file)
        if (kinds.includes("config")) configFiles.push(file)
        if (kinds.includes("doc")) docs.push(file)
        if (kinds.includes("secret-risk")) warnings.push(`${file}: secret-like assignment text detected`)
        if (kinds.includes("manifest")) manifestSignals.push(...parseManifestSignals(file, payload.content))
        if (input.includeRoutes !== false && kinds.includes("route")) routeHints.push(...extractRouteHints(file, payload.content))
      }

      moduleTotals.scannedFiles += files.length
      moduleTotals.manifests += manifests.length
      moduleTotals.routes += routes.length
      moduleTotals.cliEntrypoints += cliEntrypoints.length
      moduleTotals.toolFiles += toolFiles.length
      moduleTotals.httpClients += httpClients.length
      moduleTotals.configs += configFiles.length
      moduleTotals.docs += docs.length
      moduleTotals.warnings += warnings.length

      sourceReports.push({
        sourcePath,
        sourceState: "available",
        scannedFiles: files.length,
        manifests,
        routes,
        cliEntrypoints,
        toolFiles,
        httpClients,
        configFiles,
        docs,
        routeHints: [...new Set(routeHints)].slice(0, 80),
        manifestSignals: [...new Set(manifestSignals)],
        warnings: warnings.slice(0, 80),
        files: input.includeFiles === true ? files : undefined,
      })
    }

    const serviceBaseUrl = contract.serviceEnv ? process.env[contract.serviceEnv]?.trim().replace(/\/$/, "") || "" : ""

    modules.push({
      id: contract.id,
      title: contract.title,
      role: contract.role,
      sourcePaths: contract.sourcePaths,
      sourceState: sourceReports.some((item) => item.sourceState === "available") ? "available" : "missing",
      coreBinding: {
        inventory: "connected",
        search: "connected",
        read: "connected",
        serviceProxy: contract.serviceEnv
          ? serviceBaseUrl
            ? "configured"
            : "registered-env-missing"
          : "not-required-or-not-defined",
        dangerousActions: contract.dangerousActions?.length ? "approval-gated" : "not-registered",
      },
      service: contract.serviceEnv
        ? {
            envName: contract.serviceEnv,
            configured: Boolean(serviceBaseUrl),
            baseUrl: serviceBaseUrl || undefined,
            defaultRoutes: contract.serviceDefaultRoutes || [],
          }
        : undefined,
      expectedCapabilities: contract.expectedCapabilities,
      dangerousActions: contract.dangerousActions || [],
      totals: moduleTotals,
      sources: sourceReports,
    })
  }

  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    root,
    mode: "unified-module-inventory",
    modules,
  }
}

export async function searchUnifiedModules(input: { query?: string; moduleId?: string; limit?: number } = {}) {
  const disabled = localToolsDisabled()
  if (disabled) return disabled
  const invalid = validateModuleId(input.moduleId)
  if (invalid) return invalid

  const query = typeof input.query === "string" ? input.query.trim() : ""
  if (!query) return { ok: false as const, status: 400, error: "query is required for modules.search." }

  const root = getWorkspaceRoot()
  const needle = query.toLowerCase()
  const limit = normalizeLimit(input.limit, 30, 80)
  const matches: Array<{ moduleId: string; sourcePath: string; file: string; line: number; snippet: string; matchType: "path" | "content" }> = []

  for (const contract of getModuleContracts(input.moduleId)) {
    for (const sourcePath of contract.sourcePaths) {
      const probe = await probePath(root, sourcePath)
      if (!probe.exists || !probe.isDirectory) continue
      const files = await walkSourceFiles(root, sourcePath)

      for (const file of files) {
        if (matches.length >= limit) break
        if (file.toLowerCase().includes(needle)) {
          matches.push({ moduleId: contract.id, sourcePath, file, line: 1, snippet: file, matchType: "path" })
          continue
        }

        const payload = await readSmallTextFile(root, file)
        if (payload.skipped) continue
        const index = payload.content.toLowerCase().indexOf(needle)
        if (index >= 0) {
          matches.push({
            moduleId: contract.id,
            sourcePath,
            file,
            line: getLineNumber(payload.content, index),
            snippet: getSnippet(payload.content, index),
            matchType: "content",
          })
        }
      }
    }
  }

  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    root,
    query,
    matched: matches.length,
    matches,
  }
}

export async function readUnifiedModuleFile(input: { file?: string } = {}) {
  const disabled = localToolsDisabled()
  if (disabled) return disabled

  const file = normalizeRelativePath(typeof input.file === "string" ? input.file : "")
  if (!file) return { ok: false as const, status: 400, error: "file is required for modules.read." }

  const allowedPrefixes = MODULE_CONTRACTS.flatMap((item) => item.sourcePaths.map((sourcePath) => `${sourcePath}/`))
  if (!allowedPrefixes.some((prefix) => file.startsWith(prefix))) {
    return {
      ok: false as const,
      status: 403,
      error: `modules.read only allows files under known module source paths: ${MODULE_CONTRACTS.flatMap((item) => item.sourcePaths).join(", ")}.`,
    }
  }

  if (!isTextFile(file)) return { ok: false as const, status: 415, error: "Only known text/code files can be read through modules.read." }
  if (isBlockedFullRead(file)) return { ok: false as const, status: 403, error: "Refusing to read secret/config credential-style file through Core." }

  const root = getWorkspaceRoot()
  const payload = await readSmallTextFile(root, file, MAX_READ_BYTES)

  if (!payload.ok || payload.skipped) {
    return { ok: false as const, status: payload.ok ? 413 : 404, error: payload.reason }
  }

  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    root,
    file,
    bytes: payload.bytes,
    content: payload.content,
  }
}

export function getModuleContractsForRegistry() {
  return MODULE_CONTRACTS.map((contract) => ({
    id: contract.id,
    title: contract.title,
    role: contract.role,
    sourcePaths: contract.sourcePaths,
    expectedCapabilities: contract.expectedCapabilities,
    serviceEnv: contract.serviceEnv,
    dangerousActions: contract.dangerousActions || [],
  }))
}
