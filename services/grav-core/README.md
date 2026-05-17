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
GET  /approvals?status=pending&limit=100
POST /chat
POST /memory/search
POST /tools/run
POST /approvals/:id/approve
POST /approvals/:id/reject
POST /approvals/:id/execute
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
modules.inventory
modules.search
modules.read
memory.search
coding.scan
coding.modules.inventory
coding.modules.search
coding.modules.read
coding.execution.contracts
defense.scan
channels.inventory
voice.inventory
gateway.inventory
orchestration.inventory
ollama.inventory
ollama.models
```

Service adapter tools:

```text
channels.inbox                 -> GRAVITY_CHANNELS_BASE_URL
channels.send                  -> GRAVITY_CHANNELS_BASE_URL + operator approval
voice.session                  -> GRAVITY_VOICE_BASE_URL
voice.tts                      -> GRAVITY_VOICE_BASE_URL
voice.stt                      -> GRAVITY_VOICE_BASE_URL
gateway.status                 -> GRAVITY_GATEWAY_BASE_URL
gateway.proxy                  -> GRAVITY_GATEWAY_BASE_URL + operator approval
orchestration.workflow.run     -> GRAVITY_ORCHESTRATION_BASE_URL + operator approval
ollama.generate                -> OLLAMA_BASE_URL
ollama.chat                    -> OLLAMA_BASE_URL
```

Approval-gated coding execution tools:

```text
coding.openhands.run -> approved service proxy through GRAVITY_OPENHANDS_BASE_URL
coding.aider.run     -> approved dry-run through modules/coding-aider CLI
coding.claw.run      -> approved request returns honest 404 if modules/coding-claw is missing, otherwise 501 until a Claw contract is verified
```

Approval-gated tools should normally run through the approval queue, not by directly adding `approved: true` from the UI.

Direct tool-run approval remains available for controlled API use:

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

## Persistent approval queue

Risky chat intents now create stored approval requests in Core instead of temporary UI-only cards.

Default approval file:

```text
services/grav-core/.grav-core/approval-requests.json
```

Override location:

```bash
GRAV_CORE_DATA_DIR=/absolute/path/to/core-data
```

Routes:

```text
GET  /approvals?status=pending&limit=100
POST /approvals/:id/approve
POST /approvals/:id/reject
POST /approvals/:id/execute
```

Statuses:

```text
pending
approved
rejected
expired
executed
failed
```

`POST /approvals/:id/execute` approves pending requests and executes the stored tool call through the Core tool bus with `approved: true`. It then marks the approval as `executed` or `failed` and writes an audit event.

Web bridge routes:

```text
GET  /api/core/approvals
POST /api/core/approvals/:id/execute
POST /api/core/approvals/:id/reject
```

The `/system` dashboard now has a Core approval queue panel. The Grav chat approval card also runs through `/api/core/approvals/:id/execute`, not directly through `/api/core/tools/run`.

## Chat

`POST /chat` validates the request, checks whether the latest user message maps to a safe Core tool intent, and then either runs the safe tool, stores an approval request for risky tools, or continues into memory-backed Ollama chat.

The chat path is intentionally conservative:

1. Normalize messages.
2. Detect deterministic tool intent.
3. Execute only tools marked `safe` and not `requiresApproval`.
4. Store `approvalRequests` for risky or approval-gated tools.
5. If no tool intent is detected, search MemPalace and call Ollama.
6. Write one redacted audit event for every attempt.

Deterministic tool examples:

```text
show all module routes         -> modules.inventory
show core audit events         -> core.audit.read
check Gravity Core status      -> core.status
search memory for routing      -> memory.search
list Ollama models             -> ollama.models
check gateway status           -> gateway.status
scan defense risks             -> defense.scan
inspect coding modules         -> coding.modules.inventory
inspect coding execution       -> coding.execution.contracts
send a channel message         -> stored approval request for channels.send
run orchestration workflow     -> stored approval request for orchestration.workflow.run
run Aider/OpenHands/Claw       -> stored approval request, then contract-gated execution where available
```

Tool-use chat responses include:

```json
{
  "ok": true,
  "assistant": "Grav",
  "runtime": "grav-core",
  "mode": "tool-use",
  "content": "modules.inventory completed. I attached the structured tool result in toolUse.result so the UI can render the details.",
  "toolUse": {
    "strategy": "deterministic-intent",
    "intent": "module-inventory",
    "toolName": "modules.inventory",
    "executed": true,
    "requiresApproval": false,
    "result": {}
  }
}
```

Approval responses include persisted approval metadata:

```json
{
  "ok": false,
  "assistant": "Grav",
  "runtime": "grav-core",
  "mode": "tool-use",
  "approvalRequests": [
    {
      "id": "approval_..._channels_send",
      "toolName": "channels.send",
      "risk": "medium",
      "status": "pending",
      "summary": "Approval required for channels.send",
      "proposedInput": {}
    }
  ]
}
```

Required model source for normal model chat:

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

The coding, defense, module inventory, and module read tools use guarded workspace readers.

Required:

```bash
GRAVITY_ENABLE_LOCAL_TOOLS=true
GRAVITY_WORKSPACE_ROOT=/absolute/path/to/Gravity
```

Then:

```json
{ "toolName": "modules.inventory", "input": { "includeRoutes": true } }
```

or:

```json
{ "toolName": "defense.scan", "input": {} }
```

`modules.inventory` inventories real module source trees, route hints, CLI entrypoints, manifests, configs, docs, service envs, and dangerous actions.

`coding.scan` inventories routes, fetch callers, command entry points, module entries, TODOs, and secret-like assignments.

`defense.scan` returns only the defensive subset: secret-like assignments, TODO markers, and large skipped files.

## Service adapters

Core now has dedicated adapters under:

```text
services/grav-core/src/adapters
```

Adapters do two jobs:

1. Inventory module source through `modules.inventory`.
2. Probe/proxy the configured module service only when the proper env URL exists.

The shared adapter helper rejects unsafe paths. It only accepts relative service paths such as `/status`; it refuses absolute URLs, `//`, and `..` path escapes so Core does not become an open proxy.

### Channels

Env:

```bash
GRAVITY_CHANNELS_BASE_URL=http://127.0.0.1:<channels-port>
```

Tools:

```text
channels.inventory
channels.inbox
channels.send
```

`channels.send` is approval-gated.

### Voice

Env:

```bash
GRAVITY_VOICE_BASE_URL=http://127.0.0.1:<voice-port>
```

Tools:

```text
voice.inventory
voice.session
voice.tts
voice.stt
```

### Gateway

Env:

```bash
GRAVITY_GATEWAY_BASE_URL=http://127.0.0.1:<gateway-port>
```

Tools:

```text
gateway.inventory
gateway.status
gateway.proxy
```

`gateway.proxy` is approval-gated.

### Orchestration

Env:

```bash
GRAVITY_ORCHESTRATION_BASE_URL=http://127.0.0.1:<orchestration-port>
```

Tools:

```text
orchestration.inventory
orchestration.workflow.run
```

`orchestration.workflow.run` is approval-gated.

### Ollama

Env:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

Tools:

```text
ollama.inventory
ollama.models
ollama.generate
ollama.chat
```

## Coding module binding

The coding modules are bound as inspectable source capabilities first, then only the reviewed execution surfaces are exposed.

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

Execution contracts:

```json
{
  "toolName": "coding.execution.contracts",
  "input": {}
}
```

`coding.execution.contracts` includes `envState` and `sourceVerification` so the UI can distinguish configured, missing, available-unreviewed, and disabled states without guessing.

Current known module signals from manifests and reviewed entry files:

```text
modules/coding-openhands/pyproject.toml              -> OpenHands Python project, FastAPI, MCP/FastMCP, OpenHands SDK/server/tools dependencies
modules/coding-openhands/openhands/server/app.py     -> FastAPI app, /mcp mount, legacy routers, optional V1 router
modules/coding-openhands/openhands/app_server/v1_router.py -> V1 router mounted at /api/v1
modules/coding-aider/pyproject.toml                  -> Aider Python project, real CLI script: aider = aider.main:main
modules/coding-aider/aider/args.py                   -> --message, --dry-run, --no-auto-commits, --no-auto-test, --no-auto-lint, --file/read controls
modules/coding-claw                                  -> no verified CLI/API contract in the current repo state; Core reports missing/unreviewed honestly at runtime
```

### Aider dry-run execution

Aider execution is connected only for dry runs. It still requires approval and an explicit env gate.

Required:

```bash
GRAVITY_ENABLE_LOCAL_TOOLS=true
GRAVITY_WORKSPACE_ROOT=/absolute/path/to/Gravity
GRAVITY_ENABLE_CODING_EXECUTION=true
GRAVITY_CODING_PYTHON=python3
```

Optional:

```bash
GRAVITY_CODING_EXEC_TIMEOUT_MS=120000
```

Example direct approved run:

```json
{
  "toolName": "coding.aider.run",
  "input": {
    "approved": true,
    "action": "dry-run",
    "prompt": "Review these files and explain the likely change plan. Do not edit.",
    "cwd": ".",
    "files": ["services/grav-core/src/tool-bus.ts"],
    "model": "ollama/<model>"
  }
}
```

Core forces these safety flags:

```text
--dry-run
--no-auto-commits
--no-dirty-commits
--no-gitignore
--no-auto-lint
--no-auto-test
--no-analytics
--no-check-update
--disable-playwright
--no-suggest-shell-commands
--no-detect-urls
```

Real write/edit mode is not enabled yet.

### OpenHands service proxy

OpenHands execution is connected as an approved proxy to a separately running OpenHands module service. Core does not start OpenHands, Docker, Kubernetes, sandboxes, or browsers by itself.

Required:

```bash
GRAVITY_OPENHANDS_BASE_URL=http://127.0.0.1:<openhands-port>
```

Allowed path prefixes:

```text
/api/v1
/health
/alive
/mcp
```

Example direct approved proxy:

```json
{
  "toolName": "coding.openhands.run",
  "input": {
    "approved": true,
    "action": "proxy",
    "method": "GET",
    "path": "/health"
  }
}
```

If `GRAVITY_OPENHANDS_BASE_URL` is missing or the upstream service is unreachable, Core returns an unavailable/error state. It never fakes a successful OpenHands run.

### Claw

`coding.claw.run` is not connected to execution yet.

This pass checked the expected Claw module contract locations:

```text
modules/coding-claw/package.json
modules/coding-claw/pyproject.toml
modules/coding-claw/Cargo.toml
modules/coding-claw/go.mod
modules/coding-claw/README.md
modules/coding-claw/src
modules/coding-claw/bin
modules/coding-claw/cli
modules/coding-claw/index.ts
modules/coding-claw/index.js
modules/coding-claw/main.py
```

Current behavior:

```text
coding.execution.contracts -> reports Claw sourceVerification
coding.claw.run            -> 404 when modules/coding-claw is missing
coding.claw.run            -> 501 when the folder exists but no reviewed CLI/API contract exists
```

`GRAVITY_CLAW_BASE_URL` is intentionally not enough to enable Claw. Core needs reviewed route prefixes, command allowlists, workspace policy, rollback policy, and audit behavior first.

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
