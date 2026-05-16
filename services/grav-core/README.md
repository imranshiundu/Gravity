# Grav Core Service

`services/grav-core` is the central Gravity service layer.

It is intentionally small right now. Its first job is to provide one honest contract surface for module status, providers, and runtime health before deeper orchestration is added.

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
GET /health
GET /status
GET /modules
GET /providers
```

## Web integration

Set this in `apps/web` runtime env when the service is running:

```bash
GRAVITY_CORE_BASE_URL=http://127.0.0.1:8765
```

If this is not set, the web app must report Core as in-process/registry-backed instead of pretending the standalone service is running.

## Current truth

Connected through contracts:

- assistant
- memory
- coding scan
- defense scan

Registered but externally configured:

- channels
- voice
- gateway

Missing next layer:

- orchestration planner
- approval gateway
- audit store
- tool execution bus
- CLI contract binding
