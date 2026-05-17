# Gravity Core Workflows

Gravity Core now has an internal workflow runner. This is not a side system. It coordinates existing Core tools through the same `/tools/run` execution layer used by the rest of Gravity.

## Why this exists

Module adapters expose individual capabilities:

```text
memory.search
modules.inventory
ollama.models
channels.inbox
voice.session
...
```

Workflows let Gravity use those capabilities together as a framework.

The rule is strict:

```text
Workflow steps must call real registered tools.
Workflow steps must be allowlisted per workflow.
Workflow steps must not fake success.
Write/send/run/proxy actions stay excluded unless explicitly approved and reviewed.
```

## Core routes

```text
GET  /workflows
POST /workflows/run
```

Web bridges:

```text
GET  /api/core/workflows
POST /api/core/workflows/run
```

Tool bus:

```text
core.workflow.list
core.workflow.run
```

## Built-in workflows

### gravity.system.health_check

Coordinates:

```text
core.status
core.modules.list
modules.inventory
core.audit.read       optional
memory.search         optional
ollama.models         optional
```

Example:

```bash
curl -s http://127.0.0.1:8765/workflows/run \
  -H 'Content-Type: application/json' \
  -d '{
    "workflowId": "gravity.system.health_check",
    "input": {
      "includeRoutes": true,
      "includeAudit": true,
      "auditLimit": 10,
      "memoryQuery": "Gravity modules routes endpoints",
      "includeOllama": false
    }
  }'
```

If MemPalace is not configured or `OLLAMA_BASE_URL` is missing, optional steps can degrade honestly without turning the entire workflow into fake success.

### gravity.modules.inventory_check

Coordinates:

```text
modules.inventory
modules.search        optional
```

Example:

```bash
curl -s http://127.0.0.1:8765/workflows/run \
  -H 'Content-Type: application/json' \
  -d '{
    "workflowId": "gravity.modules.inventory_check",
    "input": {
      "moduleId": "orchestration",
      "includeRoutes": true,
      "query": "workflow route endpoint tool contract",
      "limit": 20
    }
  }'
```

### gravity.providers.ollama_check

Coordinates:

```text
ollama.contract
ollama.models         optional
```

Example:

```bash
curl -s http://127.0.0.1:8765/workflows/run \
  -H 'Content-Type: application/json' \
  -d '{
    "workflowId": "gravity.providers.ollama_check"
  }'
```

`ollama.models` returns `503` honestly when `OLLAMA_BASE_URL` is not configured or not reachable.

## Tool-bus examples

List workflows through the tool bus:

```bash
curl -s http://127.0.0.1:8765/tools/run \
  -H 'Content-Type: application/json' \
  -d '{"toolName":"core.workflow.list","input":{}}'
```

Run a workflow through the tool bus:

```bash
curl -s http://127.0.0.1:8765/tools/run \
  -H 'Content-Type: application/json' \
  -d '{
    "toolName":"core.workflow.run",
    "input":{
      "workflowId":"gravity.system.health_check",
      "input":{"includeRoutes":true}
    }
  }'
```

## Audit behavior

`POST /workflows/run` writes an audit event:

```text
core.workflow.run
```

The lower-level tool calls are also executed through Core's tool runner when the workflow is triggered through `core.workflow.run`.

## Safety policy

Current built-in workflows are read/probe workflows only.

Blocked workflow classes:

```text
edit
send
proxy
workflow-dispatch
code-run
shell-run
dangerous
```

A future workflow that sends a message, edits files, proxies gateway requests, starts voice sessions, or runs coding tools must use explicit approval and a reviewed workflow contract before being marked connected.
