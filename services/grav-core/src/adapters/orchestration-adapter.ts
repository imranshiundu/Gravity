import { getUnifiedModuleInventory } from "../module-bindings.js"
import { probeModuleService, proxyModuleService, type ServiceAdapterInput } from "./service-adapters.js"

const config = {
  moduleId: "orchestration",
  envName: "GRAVITY_ORCHESTRATION_BASE_URL",
  defaultPath: "/workflow/run",
  allowedPathPrefixes: ["/", "/health", "/status", "/agents", "/tools", "/workflows", "/workflow", "/api"],
}

export async function getOrchestrationInventory() {
  const source = await getUnifiedModuleInventory({ moduleId: "orchestration", includeRoutes: true })
  const service = await probeModuleService({
    moduleId: config.moduleId,
    envName: config.envName,
    allowedPathPrefixes: config.allowedPathPrefixes,
    probePaths: ["/health", "/status", "/agents", "/workflows", "/tools"],
  })

  return {
    ok: true as const,
    status: 200,
    moduleId: "orchestration",
    serviceCapability: "agents, workflows, handoffs, guardrails, tools",
    source,
    service,
  }
}

export async function runOrchestrationWorkflow(input: ServiceAdapterInput = {}) {
  return proxyModuleService({ ...config, defaultPath: "/workflow/run", defaultMethod: "POST" }, input)
}
