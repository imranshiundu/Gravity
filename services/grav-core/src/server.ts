import { createServer } from "node:http"

import {
  getAuditContext,
  readAuditEvents,
  redactChatInput,
  summarizeChatOutput,
  writeAuditEvent,
} from "./audit.js"
import { sendJson, readJsonBody } from "./http.js"
import { searchMempalaceMemories } from "./memory.js"
import { runOllamaChat } from "./ollama.js"
import { getGravCoreStatus, gravCoreModules, gravCoreProviders } from "./registry.js"
import { listGravitySkillsAndTools, runGravityTool } from "./tool-bus.js"

const DEFAULT_PORT = 8765

function getPort() {
  const rawPort = Number(process.env.GRAV_CORE_PORT || DEFAULT_PORT)
  return Number.isFinite(rawPort) ? rawPort : DEFAULT_PORT
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`)

  if (request.method === "POST" && url.pathname === "/chat") {
    let body: unknown = {}

    try {
      body = await readJsonBody(request)
      const context = getAuditContext(body)
      const result = await runOllamaChat(body)
      const auditEvent = await writeAuditEvent({
        workspaceId: context.workspaceId,
        userId: context.userId,
        sessionId: context.sessionId,
        mode: context.modes,
        eventType: "assistant.chat",
        summary: result.ok ? "Assistant chat completed." : "Assistant chat failed.",
        moduleId: "assistant",
        risk: "safe",
        inputRedacted: redactChatInput(body),
        outputSummary: summarizeChatOutput(result.payload),
      })

      sendJson(response, result.status, {
        ...result.payload,
        auditEventId: auditEvent.id,
      })
    } catch (error) {
      const context = getAuditContext(body)
      const auditEvent = await writeAuditEvent({
        workspaceId: context.workspaceId,
        userId: context.userId,
        sessionId: context.sessionId,
        mode: context.modes,
        eventType: "assistant.chat.invalid",
        summary: "Assistant chat request was invalid.",
        moduleId: "assistant",
        risk: "safe",
        inputRedacted: redactChatInput(body),
        outputSummary: error instanceof Error ? error.message : "Invalid chat request.",
      })

      sendJson(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid chat request.",
        auditEventId: auditEvent.id,
      })
    }
    return
  }

  if (request.method === "POST" && url.pathname === "/memory/search") {
    const body = await readJsonBody(request).catch(() => ({}))
    const result = await searchMempalaceMemories({
      query: typeof body?.query === "string" ? body.query : "",
      wing: typeof body?.wing === "string" ? body.wing : undefined,
      room: typeof body?.room === "string" ? body.room : undefined,
      limit: typeof body?.limit === "number" ? body.limit : undefined,
    })

    sendJson(response, result.ok ? 200 : 503, {
      ok: result.ok,
      service: "grav-core",
      module: "memory",
      timestamp: new Date().toISOString(),
      ...result,
    })
    return
  }

  if (request.method === "POST" && url.pathname === "/tools/run") {
    const body = await readJsonBody(request).catch(() => ({}))
    const result = await runGravityTool({
      toolName: typeof body?.toolName === "string" ? body.toolName : "",
      input: body?.input && typeof body.input === "object" ? body.input : {},
    })

    const auditEvent = await writeAuditEvent({
      eventType: "tool.run",
      summary: result.ok ? `Tool ${body?.toolName || "unknown"} completed.` : `Tool ${body?.toolName || "unknown"} failed.`,
      moduleId:
        result.tool && typeof result.tool === "object" && "moduleId" in result.tool
          ? String(result.tool.moduleId)
          : "core",
      toolName: typeof body?.toolName === "string" ? body.toolName : undefined,
      risk:
        result.tool && typeof result.tool === "object" && "risk" in result.tool
          ? (result.tool.risk as "safe" | "medium" | "dangerous" | "disallowed")
          : "safe",
      inputRedacted: {
        toolName: typeof body?.toolName === "string" ? body.toolName : undefined,
        hasInput: Boolean(body?.input),
        approved: Boolean(body?.input && typeof body.input === "object" && "approved" in body.input && body.input.approved === true),
      },
      outputSummary: result.ok ? "Tool runner returned success." : result.error || "Tool runner returned failure.",
    })

    sendJson(response, result.status, {
      ...result,
      auditEventId: auditEvent.id,
    })
    return
  }

  if (request.method !== "GET") {
    sendJson(response, 405, {
      ok: false,
      error: "Method not allowed.",
    })
    return
  }

  if (url.pathname === "/health") {
    sendJson(response, 200, {
      ok: true,
      service: "grav-core",
      timestamp: new Date().toISOString(),
    })
    return
  }

  if (url.pathname === "/" || url.pathname === "/status") {
    sendJson(response, 200, getGravCoreStatus("standalone"))
    return
  }

  if (url.pathname === "/modules") {
    sendJson(response, 200, {
      ok: true,
      service: "grav-core",
      timestamp: new Date().toISOString(),
      modules: gravCoreModules,
    })
    return
  }

  if (url.pathname === "/skills" || url.pathname === "/tools") {
    sendJson(response, 200, listGravitySkillsAndTools())
    return
  }

  if (url.pathname === "/providers") {
    sendJson(response, 200, {
      ok: true,
      service: "grav-core",
      timestamp: new Date().toISOString(),
      providers: gravCoreProviders,
    })
    return
  }

  if (url.pathname === "/audit") {
    sendJson(response, 200, await readAuditEvents(Number(url.searchParams.get("limit") || 50)))
    return
  }

  sendJson(response, 404, {
    ok: false,
    error: "Route not found.",
    availableRoutes: [
      "/health",
      "/status",
      "/modules",
      "/providers",
      "/skills",
      "/tools",
      "/audit",
      "POST /chat",
      "POST /memory/search",
      "POST /tools/run",
    ],
  })
})

server.listen(getPort(), () => {
  console.log(`grav-core listening on http://127.0.0.1:${getPort()}`)
})
