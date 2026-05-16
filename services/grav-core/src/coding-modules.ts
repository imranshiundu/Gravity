import { readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"

import { getWorkspaceRoot, localToolsEnabled } from "./workspace-scan.js"

const MAX_FILES_PER_MODULE = 500
const MAX_FILE_BYTES = 220_000
const MAX_READ_BYTES = 160_000
const MAX_SNIPPET_CHARS = 320

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

const CODING_MODULES = [
  {
    id: "coding-openhands",
    title: "OpenHands coding module",
    sourcePath: "modules/coding-openhands",
    summary:
      "OpenHands-style coding agent backend. Core must discover its API, SDK, tool, server, and runtime files before exposing execution.",
    manifestCandidates: ["pyproject.toml", "package.json", "requirements.txt", "poetry.lock"],
    safeTools: ["coding.modules.inventory", "coding.modules.search", "coding.modules.read"],
    dangerousActions: ["coding.openhands.run"],
  },
  {
    id: "coding-aider",
    title: "Aider coding module",
    sourcePath: "modules/coding-aider",
    summary:
      "Aider-style terminal pair-programming backend. Core can inspect the real CLI contract before any edit/run integration is enabled.",
    manifestCandidates: ["pyproject.toml", "requirements.txt", "setup.py", "setup.cfg"],
    safeTools: ["coding.modules.inventory", "coding.modules.search", "coding.modules.read"],
    dangerousActions: ["coding.aider.run"],
  },
  {
    id: "coding-claw",
    title: "Claw coding module",
    sourcePath: "modules/coding-claw",
    summary:
      "Claw coding backend. Core inventories whatever real manifests, CLIs, routes, and tool files exist under this module path.",
    manifestCandidates: ["package.json", "pyproject.toml", "Cargo.toml", "go.mod", "README.md"],
    safeTools: ["coding.modules.inventory", "coding.modules.search", "coding.modules.read"],
    dangerousActions: ["coding.claw.run"],
  },
] as const

type CodingModuleId = (typeof CODING_MODULES)[number]["id"]

type ModuleProbe = {
  exists: boolean
  isDirectory: boolean
  isFile: boolean
  bytes?: number
}

type SmallFileRead =
  | { ok: true; skipped: false; content: string; bytes: number }
  | { ok: true; skipped: true; content: ""; bytes: number; reason: string }
  | { ok: false; skipped: true; content: ""; bytes: 0; reason: string }

type CodingInventoryInput = {
  includeFiles?: boolean
  moduleId?: string
}

type CodingSearchInput = {
  query?: string
  moduleId?: string
  limit?: number
}

type CodingReadInput = {
  file?: string
}

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

function getAllowedCodingModuleIds() {
  return new Set<string>(CODING_MODULES.map((item) => item.id))
}

function getContracts(inputModuleId?: string) {
  if (!inputModuleId) {
    return [...CODING_MODULES]
  }

  return CODING_MODULES.filter((item) => item.id === inputModuleId)
}

function isTextFile(filePath: string) {
  return TEXT_FILE_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

function isBlockedFullRead(relativePath: string) {
  const name = path.basename(relativePath).toLowerCase()
  return BLOCKED_FULL_READ_NAMES.has(name) || name.endsWith(".pem") || name.endsWith(".key")
}

function normalizeLimit(input: unknown, fallback = 20, max = 50) {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return fallback
  }

  return Math.max(1, Math.min(max, Math.trunc(input)))
}

function getSnippet(content: string, index: number) {
  const start = Math.max(0, index - 120)
  const end = Math.min(content.length, index + 200)
  return content.slice(start, end).replace(/\s+/g, " ").trim().slice(0, MAX_SNIPPET_CHARS)
}

function getLineNumber(content: string, index: number) {
  return content.slice(0, index).split("\n").length
}

async function probePath(root: string, relativePath: string): Promise<ModuleProbe> {
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

async function walkModuleFiles(root: string, modulePath: string, dir = modulePath, files: string[] = []): Promise<string[]> {
  if (files.length >= MAX_FILES_PER_MODULE) {
    return files
  }

  let entries: Awaited<ReturnType<typeof readdir>>

  try {
    entries = await readdir(safeJoin(root, dir), { withFileTypes: true })
  } catch {
    return files
  }

  for (const entry of entries) {
    if (files.length >= MAX_FILES_PER_MODULE) {
      break
    }

    const relativePath = normalizeRelativePath(path.posix.join(normalizeRelativePath(dir), entry.name))

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        await walkModuleFiles(root, modulePath, relativePath, files)
      }
      continue
    }

    if (!entry.isFile() || !isTextFile(relativePath)) {
      continue
    }

    files.push(relativePath)
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

function classifyFile(file: string, content: string) {
  const findings: string[] = []

  if (/pyproject\.toml$|package\.json$|Cargo\.toml$|go\.mod$|requirements.*\.txt$|setup\.(py|cfg)$/.test(file)) {
    findings.push("manifest")
  }

  if (/README\.md$/i.test(file)) {
    findings.push("readme")
  }

  if (/app\/api\/.*\/route\.(ts|js)$/.test(file) || /\bFastAPI\b|\bAPIRouter\b|@(app|router)\.(get|post|put|patch|delete)\b|\bapp\.(get|post|put|patch|delete)\(/.test(content)) {
    findings.push("route")
  }

  if (/\b(click|argparse|typer|commander|program\.command|def main\(|fn main\()\b/.test(content)) {
    findings.push("cli")
  }

  if (/\/skills?\/|\/tools?\/|\bmcp\b|\bfastmcp\b|Tool\(|BaseTool|tool_registry/i.test(file) || /\bmcp\b|\bfastmcp\b|Tool\(|BaseTool|tool_registry/i.test(content)) {
    findings.push("tooling")
  }

  if (/\b(fetch|axios)\s*\(|requests\.(get|post|put|patch|delete)\(|httpx\.(get|post|put|patch|delete)\(/.test(content)) {
    findings.push("http-client")
  }

  if (/(api[_-]?key|secret|token|password)\s*[:=]/i.test(content)) {
    findings.push("secret-risk")
  }

  return findings
}

function parseManifestSignals(file: string, content: string) {
  const signals: string[] = []

  if (file.endsWith("pyproject.toml")) {
    const nameMatch = content.match(/^name\s*=\s*["']([^"']+)["']/m)
    if (nameMatch?.[1]) {
      signals.push(`python-project:${nameMatch[1]}`)
    }

    for (const match of content.matchAll(/^([A-Za-z0-9_.-]+)\s*=\s*["']([^"']+:[^"']+)["']/gm)) {
      signals.push(`python-script:${match[1]} -> ${match[2]}`)
    }

    if (/\bfastapi\b/i.test(content)) signals.push("server-framework:fastapi")
    if (/\bfastmcp\b|\bmcp\b/i.test(content)) signals.push("tool-protocol:mcp")
    if (/openhands-sdk|openhands-agent-server|openhands-tools/i.test(content)) signals.push("openhands-runtime")
  }

  if (file.endsWith("package.json")) {
    try {
      const parsed = JSON.parse(content) as { name?: unknown; scripts?: Record<string, unknown> }
      if (typeof parsed.name === "string") {
        signals.push(`node-package:${parsed.name}`)
      }
      for (const [scriptName, command] of Object.entries(parsed.scripts || {})) {
        if (typeof command === "string") {
          signals.push(`npm-script:${scriptName} -> ${command}`)
        }
      }
    } catch {
      signals.push("package-json:unparseable")
    }
  }

  if (file.endsWith("Cargo.toml")) {
    const nameMatch = content.match(/^name\s*=\s*["']([^"']+)["']/m)
    if (nameMatch?.[1]) {
      signals.push(`rust-package:${nameMatch[1]}`)
    }
  }

  if (file.endsWith("go.mod")) {
    const moduleMatch = content.match(/^module\s+(.+)$/m)
    if (moduleMatch?.[1]) {
      signals.push(`go-module:${moduleMatch[1].trim()}`)
    }
  }

  return signals
}

function assertLocalToolsEnabled() {
  if (!localToolsEnabled()) {
    return {
      ok: false as const,
      status: 403,
      error:
        "Local coding module tools are disabled. Set GRAVITY_ENABLE_LOCAL_TOOLS=true and GRAVITY_WORKSPACE_ROOT or GRAVITY_REPO_ROOT to inspect modules/coding-*.",
    }
  }

  return { ok: true as const }
}

function assertValidModuleId(moduleId?: string) {
  if (!moduleId) {
    return { ok: true as const }
  }

  if (!getAllowedCodingModuleIds().has(moduleId)) {
    return {
      ok: false as const,
      status: 400,
      error: `Unsupported coding module: ${moduleId}. Allowed modules: ${CODING_MODULES.map((item) => item.id).join(", ")}.`,
    }
  }

  return { ok: true as const }
}

export async function getCodingModuleInventory(input: CodingInventoryInput = {}) {
  const enabled = assertLocalToolsEnabled()
  if (!enabled.ok) return enabled

  const moduleCheck = assertValidModuleId(input.moduleId)
  if (!moduleCheck.ok) return moduleCheck

  const root = getWorkspaceRoot()
  const modules = []

  for (const contract of getContracts(input.moduleId)) {
    const moduleProbe = await probePath(root, contract.sourcePath)

    if (!moduleProbe.exists || !moduleProbe.isDirectory) {
      modules.push({
        ...contract,
        connectionState: "unavailable",
        coreBinding: {
          inventory: "connected",
          search: "connected",
          read: "connected",
          editRun: "approval-gated-stub",
        },
        discovered: {
          manifests: [],
          routes: [],
          cliEntrypoints: [],
          toolFiles: [],
          httpClients: [],
          manifestSignals: [],
          warnings: [`${contract.sourcePath} is missing from this workspace.`],
          scannedFiles: 0,
        },
      })
      continue
    }

    const files = await walkModuleFiles(root, contract.sourcePath)
    const manifests: string[] = []
    const routes: string[] = []
    const cliEntrypoints: string[] = []
    const toolFiles: string[] = []
    const httpClients: string[] = []
    const warnings: string[] = []
    const manifestSignals: string[] = []

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
      if (kinds.includes("secret-risk")) warnings.push(`${file}: secret-like assignment text detected`)

      if (kinds.includes("manifest")) {
        manifestSignals.push(...parseManifestSignals(file, payload.content))
      }
    }

    modules.push({
      ...contract,
      connectionState: "connected",
      coreBinding: {
        inventory: "connected",
        search: "connected",
        read: "connected",
        editRun: "approval-gated-stub",
      },
      discovered: {
        manifests,
        routes,
        cliEntrypoints,
        toolFiles,
        httpClients,
        manifestSignals: [...new Set(manifestSignals)],
        warnings: warnings.slice(0, 50),
        scannedFiles: files.length,
        files: input.includeFiles === true ? files : undefined,
      },
    })
  }

  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    root,
    mode: "coding-module-inventory",
    modules,
  }
}

export async function searchCodingModules(input: CodingSearchInput = {}) {
  const enabled = assertLocalToolsEnabled()
  if (!enabled.ok) return enabled

  const moduleCheck = assertValidModuleId(input.moduleId)
  if (!moduleCheck.ok) return moduleCheck

  const query = typeof input.query === "string" ? input.query.trim() : ""
  if (!query) {
    return { ok: false as const, status: 400, error: "query is required for coding.modules.search." }
  }

  const root = getWorkspaceRoot()
  const needle = query.toLowerCase()
  const limit = normalizeLimit(input.limit, 20, 50)
  const matches: Array<{ moduleId: CodingModuleId; file: string; line: number; snippet: string; matchType: "path" | "content" }> = []

  for (const contract of getContracts(input.moduleId)) {
    const moduleProbe = await probePath(root, contract.sourcePath)
    if (!moduleProbe.exists || !moduleProbe.isDirectory) continue

    const files = await walkModuleFiles(root, contract.sourcePath)

    for (const file of files) {
      if (matches.length >= limit) break

      if (file.toLowerCase().includes(needle)) {
        matches.push({ moduleId: contract.id, file, line: 1, snippet: file, matchType: "path" })
        continue
      }

      const payload = await readSmallTextFile(root, file)
      if (payload.skipped) continue

      const index = payload.content.toLowerCase().indexOf(needle)
      if (index >= 0) {
        matches.push({
          moduleId: contract.id,
          file,
          line: getLineNumber(payload.content, index),
          snippet: getSnippet(payload.content, index),
          matchType: "content",
        })
      }
    }
  }

  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    root,
    query,
    matches,
    matched: matches.length,
  }
}

export async function readCodingModuleFile(input: CodingReadInput = {}) {
  const enabled = assertLocalToolsEnabled()
  if (!enabled.ok) return enabled

  const file = normalizeRelativePath(typeof input.file === "string" ? input.file : "")
  if (!file) {
    return { ok: false as const, status: 400, error: "file is required for coding.modules.read." }
  }

  const allowedPrefixes = CODING_MODULES.map((item) => `${item.sourcePath}/`)
  if (!allowedPrefixes.some((prefix) => file.startsWith(prefix))) {
    return {
      ok: false as const,
      status: 403,
      error: `coding.modules.read only allows files under ${CODING_MODULES.map((item) => item.sourcePath).join(", ")}.`,
    }
  }

  if (!isTextFile(file)) {
    return { ok: false as const, status: 415, error: "Only known text/code files can be read through coding.modules.read." }
  }

  if (isBlockedFullRead(file)) {
    return { ok: false as const, status: 403, error: "Refusing to read secret/config credential-style file through Core." }
  }

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

export function getCodingExecutionUnavailable(moduleId: CodingModuleId, action: string) {
  return {
    ok: false as const,
    status: 501,
    moduleId,
    action,
    approvalGate: "passed",
    error:
      "This coding module execution/edit action is registered but intentionally not wired yet. Core can inventory/search/read the real module first; edit/run needs a reviewed module contract, workspace sandbox policy, command allowlist, and rollback/audit design before execution is enabled.",
  }
}
