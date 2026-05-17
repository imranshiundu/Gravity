import {
  getOrchestrationModuleInventory,
  REVIEWED_ORCHESTRATION_READ_PATH_PREFIXES,
  REVIEWED_ORCHESTRATION_WORKFLOW_PATH_PREFIXES,
} from "../orchestration-module.js"
import { probeModuleService, proxyModuleService, type ServiceAdapterInput } from "./service-adapters.js"

const workflowConfig = {
  moduleId: "orchestration",
  envName: "GRAVITY_ORCHESTRATION_BASE_URL",
  defaultPath: "/workflow/run",
  defaultMethod: "POST",
  allowedPathPrefixes: [...REVIEWED_ORCHESTRATION_WORKFLOW_PATH_PREFIXES],
}

export async function getOrchestrationInventory() {
  const source = await getOrchestrationModuleInventory({ includeRoutes: true, includeFiles: false })
  const service = await probeModuleService({
    moduleId: workflowConfig.moduleId,
    envName: workflowConfig.envName,
    allowedPathPrefixes: [...REVIEWED_ORCHESTRATION_READ_PATH_PREFIXES],
    probePaths: ["/health", "/status", "/agents", "/workflows", "/tools", "/runs"],
  })

  return {
    ok: true as const,
    status: 200,
    moduleId: "orchestration",
    serviceCapability: "agents, workflows, handoffs, guardrails, tools",
    reviewedProxyContract: {
      readAllowedPathPrefixes: [...REVIEWED_ORCHESTRATION_READ_PATH_PREFIXES],
      workflowAllowedPathPrefixes: [...REVIEWED_ORCHESTRATION_WORKFLOW_PATH_PREFIXES],
      workflowDefaultPath: "/workflow/run",
      approvalRequiredForWorkflowRun: true,
      removedBroadPrefixes: ["/", "/api"],
    },
    source,
    service,
  }
}

export async function runOrchestrationWorkflow(input: ServiceAdapterInput = {}) {
  return proxyModuleService(workflowConfig, input)
}
