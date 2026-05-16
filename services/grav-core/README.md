# Grav Core Service

`services/grav-core` is the central Gravity service layer.

Grav is the unified framework/interface. The folders under `modules/` are capability backends. Core exposes those backend capabilities as Gravity skills, tools, thinking context, and system routes without pretending every module is already fully merged.

## Run

```bash
pnpm install
pnpm core:dev
```

Default URL:

```text
http://127.0.0.1:8765
```

Override port:

```bash
GRAV_CORE_PORT=8765 pnpm core:dev
```

## Core routes

```text
GET  /health
GET  /status
GET  /modules
GET  /providers
GET  /skills
GET  /tools
GET  /audit?limit=50
POST /chat
POST /memory/search
POST /tools/run
```

## Module skill/tool contract

`GET /skills` and `GET /tools` return the Gravity module registry plus the tools Core can expose.

`POST /tools/run` executes one tool through the Core bus.

Example:

```json
{
  "toolName": "memory.search",
  "input": {
    "query": "Gravity routing",
    "limit": 5
  }
}
```

Connected safe tools:

```text
core.status
core.modules.list
core.audit.read
memory.search
coding.scan
coding.modules.inventory
coding.modules.search
coding.modules.read
defense.scan
```

Registered coding execution tools:

```text
coding.openhands.run -> approval required, returns 501 until OpenHands contract/sandbox is reviewed
coding.aider.run     -> approval required, returns 501 until Aider CLI/edit contract is reviewed
coding.claw.run      -> approval required, returns 501 until Claw contract/sandbox is reviewed
```

Registered proxy tools that require module service URLs:

```text
channels.inbox       -> GRAVITY_CHANNELS_BASE_URL
channels.send        -> GRAVITY_CHANNELS_BASE_URL + operator approval
voice.session        -> GRAVITY_VOICE_BASE_URL
gateway.status       -> GRAVITY_GATEWAY_BASE_URL
gateway.proxy        -> GRAVITY_GATEWAY_BASE_URL + operator approval
orchestration.workflow.run -> GRAVITY_ORCHESTRATION_BASE_URL + operator approval
```

Approval-gated tools must be called with explicit operator approval:

```json
{
  "toolName": "channels.send",
  "input": {
    "approved": true,
    "body": {
      "to": "example",
      "message": "Approved message"
    }
  }
}
```

## Chat

`POST /chat` validates the request, searches the real `modules/memory` MemPalace backend, injects relevant memory drawer results into provider context, routes the enriched request to the Ollama provider adapter, and writes one redacted audit event for every attempt.

Required model source:

```bash
GRAV_DEFAULT_MODEL=<your-ollama-model>
```

Optional Ollama URL override:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

## MemPalace memory context

Core memory injection uses the existing module:

```text
modules/memory/mempalace/searcher.py
```

Core calls:

```text
mempalace.searcher.search_memories()
```

Required or useful env:

```bash
GRAVITY_REPO_ROOT=/absolute/path/to/Gravity
MEMPALACE_PALACE_PATH=/absolute/path/to/palace
GRAVITY_MEMPALACE_PYTHON=python3
```

Optional scoping:

```bash
GRAVITY_MEMPALACE_WING=some-wing
GRAVITY_MEMPALACE_ROOM=some-room
```

Chat responses include memory metadata:

```json
{
  "memory": {
    "enabled": true,
    "configured": true,
    "backend": "mempalace",
    "source": "modules/memory/mempalace.searcher.search_memories",
    "palacePath": "/absolute/path/to/palace",
    "matched": 2
  }
}
```

## Guarded local scans

The coding and defense tools use guarded workspace readers.

Required:

```bash
GRAVITY_ENABLE_LOCAL_TOOLS=true
GRAVITY_WORKSPACE_ROOT=/absolute/path/to/Gravity
```

Then:

```json
{ "toolName": "coding.scan", "input": {} }
```

or:

```json
{ "toolName": "defense.scan", "input": {} }
```

`coding.scan` inventories routes, fetch callers, command entry points, module entries, TODOs, and secret-like assignments.

`defense.scan` returns only the defensive subset: secret-like assignments, TODO markers, and large skipped files.

## Coding module binding

The coding modules are bound as inspectable source capabilities first, not fake execution shells.

Core scans the real folders:

```text
modules/coding-openhands
modules/coding-aider
modules/coding-claw
```

Safe inventory:

```json
{
  "toolName": "coding.modules.inventory",
  "input": {
    "moduleId": "coding-aider",
    "includeFiles": false
  }
}
```

This reports discovered manifests, CLI entrypoints, HTTP routes, tool/MCP-related files, HTTP clients, manifest signals, warnings, and whether the module folder is available in the workspace.

Safe search:

```json
{
  "toolName": "coding.modules.search",
  "input": {
    "query": "FastAPI",
    "moduleId": "coding-openhands",
    "limit": 10
  }
}
```

Safe read:

```json
{
  "toolName": "coding.modules.read",
  "input": {
    "file": "modules/coding-aider/pyproject.toml"
  }
}
```

`coding.modules.read` is intentionally scoped to the three coding module trees. It blocks workspace escape paths, non-text files, oversized files, and credential-style files.

Current known module signals from manifests:

```text
modules/coding-openhands/pyproject.toml -> OpenHands Python project, FastAPI, MCP/FastMCP, OpenHands SDK/server/tools dependencies
modules/coding-aider/pyproject.toml     -> Aider Python project, real CLI script: aider = aider.main:main
modules/coding-claw                     -> inventory is runtime-discovered; missing folders are reported as unavailable, not faked
```

Dangerous execution/edit tools are registered but unavailable:

```json
{
  "toolName": "coding.aider.run",
  "input": {
    "approved": true,
    "body": {}
  }
}
```

Even after approval, current behavior is `501` until the real module contract, sandbox, command allowlist, rollback/audit design, and workspace write policy are reviewed.

## Audit log

Audit events are stored as JSONL.

Default location:

```text
services/grav-core/.grav-core/audit-events.jsonl
```

Override location:

```bash
GRAV_CORE_DATA_DIR=/absolute/path/to/core-data
```

Audit events intentionally store redacted input summaries instead of raw full chat transcripts. Tool runs also write audit events.

## Web integration

Set this in `apps/web` runtime env when the service is running:

```bash
GRAVITY_CORE_BASE_URL=http://127.0.0.1:8765
```

If this is not set, the web app must report Core as in-process/registry-backed instead of pretending the standalone service is running.

Web bridge routes:

```text
GET  /api/core/status
GET  /api/core/skills
GET  /api/core/tools
POST /api/core/tools/run
POST /api/core/chat
GET  /api/core/audit?limit=50
```

The existing web tool runner bridge `POST /api/core/tools/run` automatically forwards the new coding module tools to Core when `GRAVITY_CORE_BASE_URL` is configured.

## Current truth

Connected through Core:

- assistant chat through Core when `GRAVITY_CORE_BASE_URL` is configured
- assistant chat memory context injection through `modules/memory` MemPalace
- Core tool/skill listing
- Core tool runner
- Core audit events
- guarded coding scan
- guarded coding module inventory/search/read for OpenHands, Aider, and Claw
- guarded defense scan
- MemPalace search

Registered but externally configured:

- channels inbox/send through `GRAVITY_CHANNELS_BASE_URL`
- voice session through `GRAVITY_VOICE_BASE_URL`
- gateway status/proxy through `GRAVITY_GATEWAY_BASE_URL`
- orchestration workflow dispatch through `GRAVITY_ORCHESTRATION_BASE_URL`

Still missing deeper module binding:

- direct Aider/OpenHands/Claw execution after contract review
- coding sandbox, command allowlist, rollback, and write-policy enforcement
- direct channels plugin/action inventory
- direct voice STT/TTS route mapping
- gateway route-control adapter
- orchestration workflow inventory
- CLI contract binding for non-coding modules
