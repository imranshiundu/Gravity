import { readFile, readdir, stat } from "node:fs/promises"
import path from "node:path"

const MAX_FILES = 700
const MAX_FILE_BYTES = 300_000
const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  ".vercel",
  "coverage",
  "dist",
  "build",
  "node_modules",
  "vendor",
  "__pycache__",
])

const TEXT_FILE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".env",
  ".go",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".py",
  ".rs",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
])

export type CoreWorkspaceScanFinding = {
  file: string
  moduleId?: string
  type: "route" | "fetch" | "command" | "secret-risk" | "todo" | "large-file" | "module-entry"
  detail: string
}

export function localToolsEnabled() {
  return process.env.GRAVITY_ENABLE_LOCAL_TOOLS === "true"
}

export function getWorkspaceRoot() {
  return path.resolve(
    process.env.GRAVITY_WORKSPACE_ROOT?.trim() || process.env.GRAVITY_REPO_ROOT?.trim() || process.cwd()
  )
}

function getModuleId(relativeFile: string) {
  const match = relativeFile.match(/^modules\/([^/]+)/)
  return match?.[1]
}

function isTextFile(filePath: string) {
  return TEXT_FILE_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

async function walkFiles(root: string, dir = root, files: string[] = []): Promise<string[]> {
  if (files.length >= MAX_FILES) {
    return files
  }

  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (files.length >= MAX_FILES) {
      break
    }

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        await walkFiles(root, path.join(dir, entry.name), files)
      }
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    const absolutePath = path.join(dir, entry.name)
    if (isTextFile(absolutePath)) {
      files.push(path.relative(root, absolutePath))
    }
  }

  return files
}

async function readSmallTextFile(root: string, relativePath: string) {
  const absolutePath = path.join(root, relativePath)
  const fileStat = await stat(absolutePath)

  if (fileStat.size > MAX_FILE_BYTES) {
    return {
      skipped: true as const,
      content: "",
      reason: `File is larger than ${MAX_FILE_BYTES} bytes.`,
    }
  }

  return {
    skipped: false as const,
    content: await readFile(absolutePath, "utf-8"),
    reason: "",
  }
}

export async function scanGravityWorkspace(options?: { mode?: "coding" | "defense" | "all" }) {
  if (!localToolsEnabled()) {
    return {
      ok: false as const,
      status: 403,
      error:
        "Local tools are disabled. Set GRAVITY_ENABLE_LOCAL_TOOLS=true and GRAVITY_WORKSPACE_ROOT or GRAVITY_REPO_ROOT to allow scans.",
    }
  }

  const root = getWorkspaceRoot()
  const files = await walkFiles(root)
  const findings: CoreWorkspaceScanFinding[] = []
  const routeFiles: string[] = []
  const fetchFiles: string[] = []
  const commandFiles: string[] = []
  const moduleEntries: Record<string, string[]> = {}

  for (const file of files) {
    const moduleId = getModuleId(file)
    const payload = await readSmallTextFile(root, file)

    if (moduleId && /(^|\/)(README\.md|package\.json|pyproject\.toml|Cargo\.toml|go\.mod|main\.(ts|js|py|rs|go)|cli\.(ts|js|py|rs))$/.test(file)) {
      moduleEntries[moduleId] = [...(moduleEntries[moduleId] || []), file]
      findings.push({ file, moduleId, type: "module-entry", detail: "Module entry/configuration file." })
    }

    if (payload.skipped) {
      findings.push({ file, moduleId, type: "large-file", detail: payload.reason })
      continue
    }

    const content = payload.content

    if (/app\/api\/.*\/route\.(ts|js)$/.test(file) || /\bapp\.(get|post|put|patch|delete)\(/.test(content) || /@(app|router)\.(get|post|put|patch|delete)\b/.test(content)) {
      routeFiles.push(file)
      findings.push({ file, moduleId, type: "route", detail: "Defines an HTTP route or route handler." })
    }

    if (/\b(fetch|axios)\s*\(/.test(content) || /requests\.(get|post|put|patch|delete)\(/.test(content)) {
      fetchFiles.push(file)
      findings.push({ file, moduleId, type: "fetch", detail: "Makes outbound HTTP/client request calls." })
    }

    if (/\b(click|argparse|commander|program\.command|def main\(|fn main\()\b/.test(content)) {
      commandFiles.push(file)
      findings.push({ file, moduleId, type: "command", detail: "Defines CLI or command-style entry points." })
    }

    if (/(api[_-]?key|secret|token|password)\s*[:=]/i.test(content)) {
      findings.push({
        file,
        moduleId,
        type: "secret-risk",
        detail: "Contains secret-like assignment text. Review manually before deploy.",
      })
    }

    if (/TODO|FIXME|HACK/.test(content)) {
      findings.push({ file, moduleId, type: "todo", detail: "Contains TODO/FIXME/HACK marker." })
    }
  }

  const mode = options?.mode || "all"
  const returnedFindings =
    mode === "defense"
      ? findings.filter((finding) => ["secret-risk", "todo", "large-file"].includes(finding.type))
      : findings

  return {
    ok: true as const,
    root,
    mode,
    scannedFiles: files.length,
    routeFiles,
    fetchFiles,
    commandFiles,
    moduleEntries,
    findings: returnedFindings,
  }
}
