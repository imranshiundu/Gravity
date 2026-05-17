import { getUnifiedModuleInventory, readUnifiedModuleFile, searchUnifiedModules } from "./module-bindings.js"
import { scanGravityWorkspace } from "./workspace-scan.js"

const CORE_MODULE_ID = "core-module"
const DEFENSE_MODULE_ID = "defense"
const CORE_PREFIX = "modules/core/"
const DEFENSE_PREFIX = "modules/defense/"

function getString(input: unknown) {
  return typeof input === "string" ? input : ""
}

function normalizeLimit(input: unknown, fallback = 30) {
  if (typeof input !== "number" || !Number.isFinite(input)) return fallback
  return Math.max(1, Math.min(80, Math.trunc(input)))
}

function normalizeModuleFile(value: unknown) {
  return getString(value).replace(/\\/g, "/").replace(/^\/+/, "")
}

function assertModuleFile(file: string, prefix: string, toolName: string) {
  if (!file) {
    return { ok: false as const, status: 400, error: `file is required for ${toolName}.` }
  }

  if (!file.startsWith(prefix)) {
    return {
      ok: false as const,
      status: 403,
      error: `${toolName} only reads files under ${prefix.slice(0, -1)}. Use modules.read for other known module source paths.`,
    }
  }

  return undefined
}

export async function getCoreModuleInventory(input: Record<string, unknown> = {}) {
  return getUnifiedModuleInventory({
    moduleId: CORE_MODULE_ID,
    includeFiles: input.includeFiles === true,
    includeRoutes: input.includeRoutes !== false,
  })
}

export async function searchCoreModule(input: Record<string, unknown> = {}) {
  return searchUnifiedModules({
    moduleId: CORE_MODULE_ID,
    query: getString(input.query),
    limit: normalizeLimit(input.limit, 30),
  })
}

export async function readCoreModuleFile(input: Record<string, unknown> = {}) {
  const file = normalizeModuleFile(input.file)
  const invalid = assertModuleFile(file, CORE_PREFIX, "core.module.read")
  if (invalid) return invalid
  return readUnifiedModuleFile({ file })
}

export async function getDefenseModuleInventory(input: Record<string, unknown> = {}) {
  return getUnifiedModuleInventory({
    moduleId: DEFENSE_MODULE_ID,
    includeFiles: input.includeFiles === true,
    includeRoutes: input.includeRoutes !== false,
  })
}

export async function searchDefenseModule(input: Record<string, unknown> = {}) {
  return searchUnifiedModules({
    moduleId: DEFENSE_MODULE_ID,
    query: getString(input.query),
    limit: normalizeLimit(input.limit, 30),
  })
}

export async function readDefenseModuleFile(input: Record<string, unknown> = {}) {
  const file = normalizeModuleFile(input.file)
  const invalid = assertModuleFile(file, DEFENSE_PREFIX, "defense.read")
  if (invalid) return invalid
  return readUnifiedModuleFile({ file })
}

export async function scanDefenseModuleFindings() {
  const result = await scanGravityWorkspace({ mode: "defense" })
  if (!result.ok) return result

  const findings = result.findings.filter((finding) => finding.moduleId === DEFENSE_MODULE_ID || finding.file.startsWith(DEFENSE_PREFIX))

  return {
    ...result,
    mode: "defense-module",
    sourcePath: "modules/defense",
    sourceState: findings.length > 0 ? "available-with-findings" : "no-defense-findings-or-source-missing",
    scannedFindings: findings.length,
    findings,
  }
}
