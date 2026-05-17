# Orchestration Module Bindings

Gravity treats `modules/orchestration` as the workflow, agent, handoff, guardrail, and module-coordination boundary. This pass connects safe source inspection and a constrained workflow-dispatch service contract without turning orchestration into an unrestricted execution proxy.

## Exposed tools

```text
orchestration.inventory
orchestration.contract
orchestration.search
orchestration.read
orchestration.workflow.run
```

## Source-level tools

These tools inspect the real `modules/orchestration` folder only.

```text
orchestration.inventory -> inventory manifests, route hints, config, docs, CLI/tooling signals
orchestration.search    -> search inside modules/orchestration only
orchestration.read      -> read small text/code files from modules/orchestration only
orchestration.contract  -> return reviewed orchestration service contract and source inventory
```

Examples:

```json
{
  "toolName": "orchestration.search",
  "input": {
    "query": "workflow",
    "limit": 10
  }
}
```

```json
{
  "toolName": "orchestration.read",
  "input": {
    "file": "modules/orchestration/README.md"
  }
}
```

If `modules/orchestration` is missing, inventory reports that state honestly.

## Service configuration

Workflow execution requires:

```bash
GRAVITY_ORCHESTRATION_BASE_URL=http://127.0.0.1:<orchestration-port>
```

If the env is missing, Core returns `503` and does not fake a workflow result.

## Reviewed route partitions

Read/probe paths:

```text
/health
/status
/agents
/tools
/workflows
/runs
```

Workflow dispatch paths:

```text
/workflow
/workflows
/runs
```

The old broad prefixes were removed:

```text
/
/api
```

This is intentional. Core must not treat `GRAVITY_ORCHESTRATION_BASE_URL` as a general-purpose open execution proxy.

## Behavior

`orchestration.workflow.run`:

```text
- medium-risk service tool
- requires operator approval
- default path: /workflow/run
- default method: POST
- allowed path prefixes: /workflow, /workflows, /runs
```

Example approval-gated call:

```json
{
  "toolName": "orchestration.workflow.run",
  "input": {
    "approved": true,
    "path": "/workflow/run",
    "body": {
      "workflow": "module-health-check",
      "input": {
        "modules": ["memory", "coding", "defense"]
      }
    }
  }
}
```

## Shared adapter guards

Core service adapter still rejects:

```text
- absolute URLs
- protocol-relative URLs
- path traversal
- paths outside the reviewed allowlist
```

Future expansion should come from discovered and reviewed routes inside `modules/orchestration`, not guessed broad service paths.
