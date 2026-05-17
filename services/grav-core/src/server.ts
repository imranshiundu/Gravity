import { createServer } from "node:http"

import {
  approveRequest,
  executeApprovalRequest,
  listApprovalRequests,
  rejectRequest,
} from "./approvals.js"
import {
  getAuditContext,
  readAuditEvents,
  redactChatInput,
  summarizeChatOutput,
  writeAuditEvent,
} from "./audit.js"
import { listCoreCapabilities, resolveCoreCapabilities } from "./core-capabilities.js"
import { createCorePlan, runCorePlan } from "./core-planner.js"
import { coreWorkflowDefinitions, listCoreWorkflows, runCoreWorkflow } from "./core-workflows.js"
import { sendJson, readJsonBody } from "./http.js"
import { searchMempalaceMemories } from "./memory.js"
import { runOllamaChat } from "./ollama.js"
import { getGravCoreStatus, gravCoreModules, gravCoreProviders } from "./registry.js"
import { gravityCoreTools, listGravitySkillsAndTools, runGravityTool } from "./tool-bus.js"

const DEFAULT_PORT = 8765

function getPort() {
  const rawPort = Number(process.env.GRAV_CORE_PORT || DEFAULT_PORT)
  return Number.isFinite(rawPort) ? rawPort : DEFAULT_PORT
}

function getPathId(pathname: string, prefix: string, suffix = "") {
  if (!pathname.startsWith(prefix)) return ""
  const withoutPrefix = pathname.slice(prefix.length)
  const withoutSuffix = suffix && withoutPrefix.endsWith(suffix) ? withoutPrefix.slice(0, -suffix.length) : withoutPrefix
  return decodeURIComponent(withoutSuffix.replace(/^\/+|\/+$/g, ""))
}

function capabilityGraphInput() {
  return {
    tools: gravityCoreTools,
    workflows: coreWorkflowDefinitions,
  }
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

  if (request.method === "POST" && url.pathname === "/capabilities/resolve") {
    const body = await readJsonBody(request).catch(() => ({}))
    const result = resolveCoreCapabilities(body && typeof body === "object" ? body : {}, capabilityGraphInput())

    const auditEvent = await writeAuditEvent({
      eventType: "core.capabilities.resolve",
      summary: result.ok ? "Capability resolution completed." : "Capability resolution failed.",
      moduleId: "core",
      toolName: "core.capabilities.resolve",
      risk: "safe",
      inputRedacted: {
        hasIntent: Boolean(body?.intent || body?.query),
        safeOnly: body?.safeOnly !== false,
        includeWorkflows: body?.includeWorkflows !== false,
      },
      outputSummary: result.ok ? `Selected ${result.selected.length} capability candidates.` : result.error || "Capability resolver returned failure.",
    })

    sendJson(response, result.status, { ...result, auditEventId: auditEvent.id })
    return
  }

  if (request.method === "POST" && url.pathname === "/plan") {
    const body = await readJsonBody(request).catch(() => ({}))
    const result = createCorePlan(body && typeof body === "object" ? body : {}, capabilityGraphInput())

    const auditEvent = await writeAuditEvent({
      eventType: "core.plan.create",
      summary: result.ok ? "Core plan created." : "Core plan creation failed.",
      moduleId: "core",
      toolName: "core.plan.create",
      risk: "safe",
      inputRedacted: {
        hasIntent: Boolean(body?.intent || body?.query),
        safeOnly: body?.safeOnly !== false,
        includeWorkflows: body?.includeWorkflows !== false,
      },
      outputSummary: result.ok ? `Plan ${result.plan.id} created with ${result.plan.summary.totalSteps} step(s).` : result.error || "Plan creation returned failure.",
    })

    sendJson(response, result.status, { ...result, auditEventId: auditEvent.id })
    return
  }

  if (request.method === "POST" && url.pathname === "/plan/run") {
    const body = await readJsonBody(request).catch(() => ({}))
    const result = await runCorePlan(body && typeof body === "object" ? body : {}, capabilityGraphInput(), runGravityTool)

    const auditEvent = await writeAuditEvent({
      eventType: "core.plan.run",
      summary: result.ok ? "Core plan run completed." : "Core plan run failed.",
      moduleId: "core",
      toolName: "core.plan.run",
      risk: "safe",
      inputRedacted: {
        hasPlan: Boolean(body?.plan),
        hasIntent: Boolean(body?.intent || body?.query),
        safeOnly: body?.safeOnly !== false,
      },
      outputSummary: result.ok ? `Plan run completed ${result.summary?.completedSteps || 0}/${result.summary?.totalSteps || 0} step(s).` : result.error || "Plan run returned failure.",
    })

    sendJson(response, result.status, { ...result, auditEventId: auditEvent.id })
    return
  }

  if (request.method === "POST" && url.pathname === "/workflows/run") {
    const body = await readJsonBody(request).catch(() => ({}))
    const result = await runCoreWorkflow(body && typeof body === "object" ? body : {}, runGravityTool)
    const workflowId = typeof body?.workflowId === "string" ? body.workflowId : typeof body?.workflow === "string" ? body.workflow : "gravity.system.health_check"

    const auditEvent = await writeAuditEvent({
      eventType: "core.workflow.run",
      summary: result.ok ? `Workflow ${workflowId} completed.` : `Workflow ${workflowId} failed.`,
      moduleId: "core",
      toolName: "core.workflow.run",
      risk: "safe",
      inputRedacted: {
        workflowId,
        hasInput: Boolean(body?.input),
        approved: Boolean(body && typeof body === "object" && "approved" in body && body.approved === true),
      },
      outputSummary: result.ok ? "Core workflow returned success." : result.error || "Core workflow returned failure.",
    })

    sendJson(response, result.status, {
      ...result,
      auditEventId: auditEvent.id,
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

  if (request.method === "POST" && url.pathname.startsWith("/approvals/")) {
    const body = await readJsonBody(request).catch(() => ({}))

    if (url.pathname.endsWith("/approve")) {
      const id = getPathId(url.pathname, "/approvals/", "/approve")
      const result = await approveRequest({
        id,
        userId: typeof body?.userId === "string" ? body.userId : undefined,
      })
      const auditEvent = await writeAuditEvent({
        eventType: "approval.approve",
        summary: result.ok ? `Approval ${id} approved.` : `Approval ${id} approval failed.`,
        moduleId: "core",
        toolName: result.approval?.toolName,
        risk: result.approval?.risk,
        inputRedacted: { approvalId: id, userId: typeof body?.userId === "string" ? body.userId : undefined },
        outputSummary: result.ok ? "Approval marked approved." : result.error || "Approval could not be approved.",
      })
      sendJson(response, result.status, { ...result, auditEventId: auditEvent.id })
      return
    }

    if (url.pathname.endsWith("/reject")) {
      const id = getPathId(url.pathname, "/approvals/", "/reject")
      const result = await rejectRequest({
        id,
        userId: typeof body?.userId === "string" ? body.userId : undefined,
        reason: typeof body?.reason === "string" ? body.reason : undefined,
      })
      const auditEvent = await writeAuditEvent({
        eventType: "approval.reject",
        summary: result.ok ? `Approval ${id} rejected.` : `Approval ${id} rejection failed.`,
        moduleId: "core",
        toolName: result.approval?.toolName,
        risk: result.approval?.risk,
        inputRedacted: { approvalId: id, userId: typeof body?.userId === "string" ? body.userId : undefined },
        outputSummary: result.ok ? "Approval marked rejected." : result.error || "Approval could not be rejected.",
      })
      sendJson(response, result.status, { ...result, auditEventId: auditEvent.id })
      return
    }

    if (url.pathname.endsWith("/execute")) {
      const id = getPathId(url.pathname, "/approvals/", "/execute")
      const result = await executeApprovalRequest({
        id,
        userId: typeof body?.userId === "string" ? body.userId : undefined,
      })
      const auditEvent = await writeAuditEvent({
        eventType: "approval.execute",
        summary: result.ok ? `Approval ${id} executed.` : `Approval ${id} execution failed.`,
        moduleId:
          result.result?.tool && typeof result.result.tool === "object" && "moduleId" in result.result.tool
            ? String(result.result.tool.moduleId)
            : "core",
        toolName: result.approval?.toolName,
        risk: result.approval?.risk,
        inputRedacted: { approvalId: id, userId: typeof body?.userId === "string" ? body.userId : undefined },
        outputSummary: result.ok ? "Approved tool executed." : result.error || result.result?.error || "Approved tool execution failed.",
      })
      sendJson(response, result.status, { ...result, auditEventId: auditEvent.id })
      return
    }
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

  if (url.pathname === "/capabilities") {
    sendJson(response, 200, listCoreCapabilities(capabilityGraphInput()))
    return
  }

  if (url.pathname === "/workflows") {
    sendJson(response, 200, listCoreWorkflows())
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

  if (url.pathname === "/approvals") {
    sendJson(
      response,
      200,
      await listApprovalRequests({
        status: url.searchParams.get("status") || "pending",
        limit: Number(url.searchParams.get("limit") || 100),
      })
    )
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
      "/capabilities",
      "/workflows",
      "/audit",
      "/approvals",
      "POST /chat",
      "POST /memory/search",
      "POST /tools/run",
      "POST /capabilities/resolve",
      "POST /plan",
      "POST /plan/run",
      "POST /workflows/run",
      "POST /approvals/:id/approve",
      "POST /approvals/:id/reject",
      "POST /approvals/:id/execute",
    ],
  })
})

server.listen(getPort(), () => {
  console.log(`grav-core listening on http://127.0.0.1:${getPort()}`)
})