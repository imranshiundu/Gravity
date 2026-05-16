# Gravity Web

`apps/web` is the operator-facing Gravity interface.

The web app should not talk directly to module internals. It should call Gravity/Core bridges and let Core decide whether a module capability is connected, registered, unavailable, or approval-gated.

## Important routes

```text
/assistant
/system
```

## Core bridge endpoints

```text
GET  /api/core/status
GET  /api/core/skills
GET  /api/core/tools
GET  /api/core/audit?limit=50
POST /api/core/chat
POST /api/core/tools/run
```

`GRAVITY_CORE_BASE_URL` should point to the standalone Core service when available:

```bash
GRAVITY_CORE_BASE_URL=http://127.0.0.1:8765
```

## Assistant workbench

Main file:

```text
apps/web/components/grav/assistant-workbench.tsx
```

The assistant workbench sends messages to:

```text
/api/assistant/chat
```

That route can pass through to Core. Core can respond in three different ways:

1. Normal model response.
2. Safe deterministic tool-use response.
3. Approval-required response.

The UI must preserve all three.

## Tool-use responses

Core tool-use responses include:

```json
{
  "mode": "tool-use",
  "content": "modules.inventory completed...",
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

The assistant workbench renders:

- normal assistant content
- selected tool name
- intent
- executed state
- approval state
- expandable structured result

## Approval-required responses

Core approval responses include:

```json
{
  "ok": false,
  "mode": "tool-use",
  "content": "channels.send needs operator approval...",
  "toolUse": {
    "toolName": "channels.send",
    "executed": false,
    "requiresApproval": true
  },
  "approvalRequests": [
    {
      "id": "approval_...",
      "toolName": "channels.send",
      "risk": "medium",
      "summary": "Approval required for channels.send",
      "reason": "User asked for an outbound channel action.",
      "proposedInput": {
        "body": {}
      },
      "expiresAt": "..."
    }
  ]
}
```

The assistant workbench renders an approval card with:

- tool name
- risk
- reason
- expiry
- proposed input
- `Approve & run` button

Approval execution calls:

```text
POST /api/core/tools/run
```

with:

```json
{
  "toolName": "channels.send",
  "input": {
    "approved": true
  }
}
```

The UI merges `approved: true` into the proposed input so Core can verify the approval before running the tool.

## Important behavior

The assistant input is intentionally not disabled when Ollama is unavailable.

Reason: Core tool-use requests such as status, module inventory, audit events, memory search, gateway status, and approval requests can work without model chat. Ollama is only required when the request falls through to model reasoning.

Do not reintroduce UI logic that requires an Ollama model before every assistant message.

## System route matrix

Main file:

```text
apps/web/components/system-connectivity-dashboard.tsx
```

The system page calls:

```text
POST /api/core/tools/run -> modules.inventory
GET  /api/core/skills
```

It renders the Core module route matrix:

- source state
- service env dependency
- route hints
- manifests
- CLI entrypoints
- tool files
- Core tools
- risk and approval state
- dangerous actions
- warnings

This route matrix is the preferred truth when Core is running. The older web registry remains only as an honest fallback.
