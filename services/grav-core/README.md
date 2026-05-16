# Grav Core Service

`services/grav-core` is the central Gravity service layer.

It is intentionally small right now. Its first job is to provide one honest contract surface for module status, providers, runtime health, chat orchestration, and audit events before deeper tool execution is added.

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

## Routes

```text
GET  /health
GET  /status
GET  /modules
GET  /providers
GET  /audit?limit=50
POST /chat
```

## Chat

`POST /chat` validates the request, routes it to the Ollama provider adapter, and writes one redacted audit event for every attempt.

Required model source:

```bash
GRAV_DEFAULT_MODEL=<your-ollama-model>
```

Optional Ollama URL override:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

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

Audit events intentionally store a redacted chat input summary instead of raw full chat transcripts. They include:

- workspace id
- session id
- user id when provided
- mode
- event type
- module id
- risk level
- redacted input summary
- output summary
- timestamp

## Web integration

Set this in `apps/web` runtime env when the service is running:

```bash
GRAVITY_CORE_BASE_URL=http://127.0.0.1:8765
```

If this is not set, the web app must report Core as in-process/registry-backed instead of pretending the standalone service is running.

Web bridge routes:

```text
GET  /api/core/status
POST /api/core/chat
GET  /api/core/audit?limit=50
```

## Current truth

Connected through contracts:

- assistant chat through Core when `GRAVITY_CORE_BASE_URL` is configured
- assistant chat audit events
- memory
- coding scan
- defense scan

Registered but externally configured:

- channels
- voice
- gateway

Missing next layer:

- memory retrieval injection into chat
- approval gateway
- tool execution bus
- CLI contract binding
