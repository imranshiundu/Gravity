import { spawn } from "node:child_process"
import { stat } from "node:fs/promises"
import path from "node:path"

import { writeAuditEvent } from "./audit.js"
import { getWorkspaceRoot, localToolsEnabled } from "./workspace-scan.js"

const DEFAULT_EXECUTION_TIMEOUT_MS = 120_000
const MAX_CAPTURE_CHARS = 24_000
const MAX_FILES = 30

const OPENHANDS_BASE_ENV = "GRAVITY_OPENHANDS_BASE_URL"
const CLAW_BASE_ENV = "GRAVITY_CLAW_BASE_URL"
const CODING_EXECUTION_ENV = "GRAVITY_ENABLE_CODING_EXECUTION"
const CODING_PYTHON_ENV = "GRAVITY_CODING_PYTHON"
const CODING_TIMEOUT_ENV = "GRAVITY_CODING_EXEC_TIMEOUT_MS"

const BLOCKED_FILE_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".npmrc",
  ".pypirc",
  "id_rsa",
  "id_ed25519",
])

const CONTRACTS = {
  "coding-aider": {
    moduleId: "coding-aider",
    executionState: "dry-run-connected-env-gated",
    sourcePath: "modules/coding-aider",
    commandEntrypoint: "python -m aider.main",
    discoveredFrom: [
      "modules/coding-aider/pyproject.toml exposes project script: aider = aider.main:main",
      "modules/coding-aider/aider/args.py exposes --message/--msg, --dry-run, --no-auto-commits, --no-auto-test, --no-auto-lint, and --file/read controls",
    ],
    supportedAction: "dry-run",
    requiredEnv: [CODING_EXECUTION_ENV, CODING_PYTHON_ENV],
    safetyPolicy: [
      "requires Core approval before execution",
      "requires GRAVITY_ENABLE_CODING_EXECUTION=true",
      "runs from a workspace-scoped cwd only",
      "blocks path traversal and credential-style files",
      "forces --dry-run and disables auto commits/tests/lint/update/browser prompts",
      "does not support real write/edit mode yet",
    ],
  },
  "coding-openhands": {
    moduleId: "coding-openhands",
    executionState: "service-proxy-env-gated",
    sourcePath: "modules/coding-openhands",
    serviceEnv: OPENHANDS_BASE_ENV,
    discoveredFrom: [
      "modules/coding-openhands/pyproject.toml declares fastapi, fastmcp, openhands-sdk, openhands-agent-server, and openhands-tools dependencies",
      "modules/coding-openhands/openhands/server/app.py builds a FastAPI app, mounts /mcp, legacy routers, and V1 routes when enabled",
      "modules/coding-openhands/openhands/app_server/v1_router.py mounts the V1 router at /api/v1",
    ],
    supportedAction: "approved-http-proxy",
    allowedPathPrefixes: ["/api/v1", "/health", "/alive", "/mcp"],
    safetyPolicy: [
      "requires Core approval before proxying",
      `requires ${OPENHANDS_BASE_ENV} to point at a running OpenHands module service`,
      "does not start OpenHands or Docker itself",
      "limits proxy paths to reviewed OpenHands route prefixes",
      "never returns fake success when the service is not configured or not reachable",
    ],
  },
  "coding-claw": {
    moduleId: "coding-claw",
    executionState: "registered-unverified",
    sourcePath: "modules/coding-claw",
    serviceEnv: CLAW_BASE_ENV,
    discoveredFrom: [
      "No stable Claw CLI/API contract has been verified in this pass.",
    ],
    supportedAction: "none-yet",
    safetyPolicy: [
      "registered in the tool bus for visibility and approval workflow continuity",
      "execution remains unavailable until manifests, routes, CLIs, and sandbox policy are reviewed",
      "never fakes a successful Claw run",
    ],
  },
} as const

type CodingModuleId = keyof typeof CONTRACTS

type ExecutionResult = {
  ok: boolean
  status: number
  moduleId: CodingModuleId
  action: string
  error?: string
  [key: string]: unknown
}

type ChildRunResult = {
  ok: boolean
  timedOut: boolean
  exitCode: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
  durationMs: number
}

function getBooleanEnv(name: string) {
  return process.env[name]?.trim().toLowerCase() === "true"
}

function normalizeRelativePath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "")
}

function safeJoin(root: string, relativePath: string) {
  const normalized = normalizeRelativePath(relativePath || ".")
  const absolute = path.resolve(root, normalized)
  const resolvedRoot = path.resolve(root)

  if (absolute !== resolvedRoot && !absolute.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Path escapes Gravity workspace: ${relativePath}`)
  }

  return absolute
}

function truncate(value: string, limit = MAX_CAPTURE_CHARS) {
  if (value.length <= limit) return value
  return `${value.slice(0, limit)}\n…[truncated ${value.length - limit} chars]`
}

function getString(input: unknown, fallback = "") {
  return typeof input === "string" ? input : fallback
}

function getStringArray(input: unknown) {
  if (!Array.isArray(input)) return []
  return input.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
}

function getObject(input: unknown) {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {}
}

function normalizeTimeoutMs(input: unknown) {
  const envValue = Number.parseInt(process.env[CODING_TIMEOUT_ENV] || "", 10)
  const requested = typeof input === "number" && Number.isFinite(input) ? Math.trunc(input) : envValue
  const value = Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_EXECUTION_TIMEOUT_MS
  return Math.max(5_000, Math.min(10 * 60_000, value))
}

function isBlockedCredentialPath(relativePath: string) {
  const name = path.basename(relativePath).toLowerCase()
  return BLOCKED_FILE_NAMES.has(name) || name.endsWith(".pem") || name.endsWith(".key") || name.endsWith(".crt")
}

async function assertFileUnderWorkspace(root: string, relativeFile: string) {
  const normalized = normalizeRelativePath(relativeFile)
  if (!normalized || normalized === ".") {
    throw new Error("Empty file path is not allowed.")
  }
  if (isBlockedCredentialPath(normalized)) {
    throw new Error(`Refusing to pass credential-style file to coding module: ${normalized}`)
  }

  const absolute = safeJoin(root, normalized)
  const fileStat = await stat(absolute)
  if (!fileStat.isFile()) {
    throw new Error(`Path is not a file: ${normalized}`)
  }

  return normalized
}

async function resolveWorkspaceCwd(root: string, requestedCwd: unknown) {
  const relativeCwd = normalizeRelativePath(getString(requestedCwd, ".") || ".")
  const cwd = safeJoin(root, relativeCwd)
  const cwdStat = await stat(cwd)
  if (!cwdStat.isDirectory()) {
    throw new Error(`cwd is not a directory: ${relativeCwd}`)
  }

  return { relativeCwd, cwd }
}

function runChildProcess(command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number }): Promise<ChildRunResult> {
  const started = Date.now()

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stdout = ""
    let stderr = ""
    let settled = false
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGTERM")
      setTimeout(() => {
        if (!settled) child.kill("SIGKILL")
      }, 2_000).unref()
    }, options.timeoutMs)

    child.stdout.on("data", (chunk: Buffer) => {
      stdout = truncate(stdout + chunk.toString("utf-8"))
    })

    child.stderr.on("data", (chunk: Buffer) => {
      stderr = truncate(stderr + chunk.toString("utf-8"))
    })

    child.on("error", (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        ok: false,
        timedOut,
        exitCode: null,
        signal: null,
        stdout,
        stderr: truncate(`${stderr}\n${error.message}`.trim()),
        durationMs: Date.now() - started,
      })
    })

    child.on("close", (exitCode, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({
        ok: exitCode === 0 && !timedOut,
        timedOut,
        exitCode,
        signal,
        stdout,
        stderr,
        durationMs: Date.now() - started,
      })
    })
  })
}

async function auditCodingExecution(result: ExecutionResult, input: Record<string, unknown>) {
  await writeAuditEvent({
    eventType: "coding.execution",
    summary: `${result.moduleId} ${result.action} ${result.ok ? "completed" : "blocked/failed"}`,
    toolName: `coding.${result.moduleId.replace("coding-", "")}.run`,
    moduleId: result.moduleId,
    risk: "dangerous",
    inputRedacted: {
      action: input.action,
      cwd: input.cwd,
      files: Array.isArray(input.files) ? input.files.length : undefined,
      path: input.path,
      method: input.method,
      hasPrompt: typeof input.prompt === "string" || typeof input.message === "string",
    },
    outputSummary: result.error || `status ${result.status}`,
  })
}

export function getCodingExecutionContracts(input: { moduleId?: string } = {}) {
  const moduleId = getString(input.moduleId)
  const contracts = moduleId
    ? Object.values(CONTRACTS).filter((contract) => contract.moduleId === moduleId)
    : Object.values(CONTRACTS)

  if (moduleId && contracts.length === 0) {
    return {
      ok: false as const,
      status: 400,
      error: `Unsupported coding execution contract: ${moduleId}`,
      allowedModules: Object.keys(CONTRACTS),
    }
  }

  return {
    ok: true as const,
    status: 200,
    service: "grav-core",
    executionEnabled: getBooleanEnv(CODING_EXECUTION_ENV),
    contracts,
  }
}

export async function runAiderAction(input: Record<string, unknown>): Promise<ExecutionResult> {
  const moduleId = "coding-aider" as const
  const action = getString(input.action, "dry-run") || "dry-run"
  const root = getWorkspaceRoot()
  const prompt = getString(input.prompt) || getString(input.message)

  const baseResult = {
    moduleId,
    action,
    contract: CONTRACTS[moduleId],
  }

  if (!localToolsEnabled()) {
    const result: ExecutionResult = {
      ...baseResult,
      ok: false,
      status: 403,
      error: "Local coding tools are disabled. Set GRAVITY_ENABLE_LOCAL_TOOLS=true and GRAVITY_WORKSPACE_ROOT or GRAVITY_REPO_ROOT first.",
    }
    await auditCodingExecution(result, input)
    return result
  }

  if (action !== "dry-run") {
    const result: ExecutionResult = {
      ...baseResult,
      ok: false,
      status: 501,
      error: "Only Aider dry-run execution is wired. Real write/edit mode remains intentionally unavailable until rollback and diff-review policy are implemented.",
    }
    await auditCodingExecution(result, input)
    return result
  }

  if (!prompt.trim()) {
    const result: ExecutionResult = { ...baseResult, ok: false, status: 400, error: "prompt or message is required for coding.aider.run dry-run." }
    await auditCodingExecution(result, input)
    return result
  }

  let cwd: string
  let relativeCwd: string
  let files: string[]

  try {
    const resolved = await resolveWorkspaceCwd(root, input.cwd)
    cwd = resolved.cwd
    relativeCwd = resolved.relativeCwd
    const requestedFiles = getStringArray(input.files).slice(0, MAX_FILES)
    files = []
    for (const file of requestedFiles) {
      files.push(await assertFileUnderWorkspace(root, file))
    }
  } catch (error) {
    const result: ExecutionResult = {
      ...baseResult,
      ok: false,
      status: 400,
      error: error instanceof Error ? error.message : "Invalid Aider execution path input.",
    }
    await auditCodingExecution(result, input)
    return result
  }

  const python = process.env[CODING_PYTHON_ENV]?.trim() || "python3"
  const timeoutMs = normalizeTimeoutMs(input.timeoutMs)
  const modulePath = safeJoin(root, "modules/coding-aider")
  const model = getString(input.model)
  const args = [
    "-m",
    "aider.main",
    "--message",
    prompt,
    "--dry-run",
    "--no-auto-commits",
    "--no-dirty-commits",
    "--no-gitignore",
    "--no-auto-lint",
    "--no-auto-test",
    "--no-analytics",
    "--no-check-update",
    "--disable-playwright",
    "--no-suggest-shell-commands",
    "--no-detect-urls",
    "--pretty=false",
    "--stream=false",
  ]

  if (model.trim()) {
    args.push("--model", model.trim())
  }

  args.push(...files)

  const commandPreview = [python, ...args.map((arg) => (arg === prompt ? "<prompt>" : arg))]

  if (!getBooleanEnv(CODING_EXECUTION_ENV)) {
    const result: ExecutionResult = {
      ...baseResult,
      ok: false,
      status: 403,
      commandPreview,
      cwd: relativeCwd,
      files,
      error: `Aider dry-run is wired but disabled. Set ${CODING_EXECUTION_ENV}=true to allow approved dry-run subprocess execution.`,
    }
    await auditCodingExecution(result, input)
    return result
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PYTHONPATH: process.env.PYTHONPATH ? `${modulePath}${path.delimiter}${process.env.PYTHONPATH}` : modulePath,
    CI: "true",
    NO_COLOR: "1",
  }

  const childResult = await runChildProcess(python, args, { cwd, env, timeoutMs })
  const result: ExecutionResult = {
    ...baseResult,
    ok: childResult.ok,
    status: childResult.ok ? 200 : childResult.timedOut ? 504 : 500,
    commandPreview,
    cwd: relativeCwd,
    files,
    timeoutMs,
    child: childResult,
    error: childResult.ok ? undefined : childResult.timedOut ? "Aider dry-run timed out." : "Aider dry-run exited unsuccessfully.",
  }
  await auditCodingExecution(result, input)
  return result
}

function normalizeProxyPath(value: unknown) {
  const raw = getString(value, "/api/v1") || "/api/v1"
  if (!raw.startsWith("/")) return `/${raw}`
  return raw
}

function assertOpenHandsPathAllowed(requestPath: string) {
  const allowed = CONTRACTS["coding-openhands"].allowedPathPrefixes
  if (!allowed.some((prefix) => requestPath === prefix || requestPath.startsWith(`${prefix}/`))) {
    throw new Error(`OpenHands proxy path is not allowed: ${requestPath}. Allowed prefixes: ${allowed.join(", ")}`)
  }
}

async function proxyJsonRequest(baseUrl: string, input: Record<string, unknown>, allowedPathCheck: (requestPath: string) => void) {
  const method = getString(input.method, "GET").toUpperCase()
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    throw new Error(`Unsupported proxy method: ${method}`)
  }

  const requestPath = normalizeProxyPath(input.path)
  allowedPathCheck(requestPath)

  const url = new URL(requestPath, `${baseUrl.replace(/\/$/, "")}/`)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), normalizeTimeoutMs(input.timeoutMs))

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
      },
      body: method === "GET" ? undefined : JSON.stringify(getObject(input.body)),
      signal: controller.signal,
    })

    const text = await response.text()
    let payload: unknown = text
    try {
      payload = text ? JSON.parse(text) : null
    } catch {
      payload = truncate(text)
    }

    return {
      ok: response.ok,
      status: response.status,
      method,
      path: requestPath,
      payload,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function runOpenHandsAction(input: Record<string, unknown>): Promise<ExecutionResult> {
  const moduleId = "coding-openhands" as const
  const action = getString(input.action, "proxy") || "proxy"
  const baseResult = { moduleId, action, contract: CONTRACTS[moduleId] }
  const baseUrl = process.env[OPENHANDS_BASE_ENV]?.trim().replace(/\/$/, "") || ""

  if (action !== "proxy") {
    const result: ExecutionResult = { ...baseResult, ok: false, status: 501, error: "Only approved OpenHands service proxy mode is wired. Core does not start OpenHands locally." }
    await auditCodingExecution(result, input)
    return result
  }

  if (!baseUrl) {
    const result: ExecutionResult = {
      ...baseResult,
      ok: false,
      status: 503,
      error: `${OPENHANDS_BASE_ENV} is not configured. Start the OpenHands module service separately and set this env before using coding.openhands.run.`,
    }
    await auditCodingExecution(result, input)
    return result
  }

  try {
    const proxied = await proxyJsonRequest(baseUrl, input, assertOpenHandsPathAllowed)
    const result: ExecutionResult = {
      ...baseResult,
      ok: proxied.ok,
      status: proxied.status,
      upstream: proxied,
      error: proxied.ok ? undefined : `OpenHands service returned ${proxied.status}.`,
    }
    await auditCodingExecution(result, input)
    return result
  } catch (error) {
    const result: ExecutionResult = {
      ...baseResult,
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : "Unable to proxy OpenHands request.",
    }
    await auditCodingExecution(result, input)
    return result
  }
}

export async function runClawAction(input: Record<string, unknown>): Promise<ExecutionResult> {
  const moduleId = "coding-claw" as const
  const action = getString(input.action, "run") || "run"
  const result: ExecutionResult = {
    moduleId,
    action,
    contract: CONTRACTS[moduleId],
    ok: false,
    status: 501,
    error: "Claw execution is still unavailable because no stable Claw route/CLI contract has been verified. Core exposes inventory/search/read only for this module until that contract exists.",
  }
  await auditCodingExecution(result, input)
  return result
}
