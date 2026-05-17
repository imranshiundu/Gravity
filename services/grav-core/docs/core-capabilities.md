# Gravity Core Capability Graph

Gravity Core now exposes a capability graph that lets Gravity resolve an operator/user intent into the correct existing tools and workflows.

This is not execution. It is planning and resolution.

## Routes

Core:

```text
GET  /capabilities
POST /capabilities/resolve
```

Web bridges:

```text
GET  /api/core/capabilities
POST /api/core/capabilities/resolve
```

Tool bus:

```text
core.capabilities.list
core.capabilities.resolve
```

## Why this exists

Gravity is the framework. The modules under `/modules` are real capabilities, not decoration.

The capability graph connects:

```text
modules -> tools
workflows -> allowed tools
intent -> candidate tools/workflows
risk policy -> selected/excluded actions
```

This lets Gravity understand that a request like:

```text
scan all modules and find routes
```

should map to real tools such as:

```text
modules.inventory
modules.search
gravity.modules.inventory_check
```

And a request like:

```text
check memory and system health
```

should map to:

```text
memory.search
core.status
core.modules.list
gravity.system.health_check
```

## Safe resolver behavior

Default resolution uses `safeOnly=true`.

That means safe read/probe tools can be selected, while medium/dangerous tools are visible but excluded from selected candidates.

Examples of excluded-by-default tools:

```text
channels.send
gateway.proxy
orchestration.workflow.run
coding.openhands.run
coding.aider.run
coding.claw.run
ollama.generate
ollama.chat
voice.session
voice.tts
voice.stt
```

The tool runner still enforces per-tool approval even if `safeOnly=false` is used.

## List graph

```bash
curl -s http://127.0.0.1:8765/capabilities
```

Through the web bridge:

```bash
curl -s http://127.0.0.1:3000/api/core/capabilities
```

Through the tool bus:

```bash
curl -s http://127.0.0.1:8765/tools/run \
  -H 'Content-Type: application/json' \
  -d '{"toolName":"core.capabilities.list","input":{}}'
```

## Resolve intent

```bash
curl -s http://127.0.0.1:8765/capabilities/resolve \
  -H 'Content-Type: application/json' \
  -d '{
    "intent":"scan all module routes and endpoints",
    "safeOnly":true,
    "includeWorkflows":true,
    "maxResults":10
  }'
```

Through the web bridge:

```bash
curl -s http://127.0.0.1:3000/api/core/capabilities/resolve \
  -H 'Content-Type: application/json' \
  -d '{
    "intent":"search memory for Gravity context",
    "safeOnly":true
  }'
```

Through the tool bus:

```bash
curl -s http://127.0.0.1:8765/tools/run \
  -H 'Content-Type: application/json' \
  -d '{
    "toolName":"core.capabilities.resolve",
    "input":{
      "intent":"check local Ollama models and provider health",
      "safeOnly":true,
      "includeWorkflows":true
    }
  }'
```

## Response shape

Resolution returns:

```text
selected           safe candidate tools/workflows
excludedMatches    medium/dangerous matches excluded by safe policy
suggestedWorkflow  best workflow candidate if one matches
suggestedTools     selected tool candidates
runHint            exact endpoint/tool-run payload to use next
```

## Important rule

The capability graph must never claim a module action succeeded.

It only answers:

```text
What capability fits this intent?
Is it safe?
Does it require approval?
How would Gravity call it?
```

Actual execution must go through:

```text
/tools/run
/workflows/run
approval queue where required
```
