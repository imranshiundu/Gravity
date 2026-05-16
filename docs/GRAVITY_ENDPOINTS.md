# Gravity Endpoints

Gravity should converge on one owned endpoint contract across web, CLI, and voice.

## Current live path

```text
apps/web
  -> /api/core/status
  -> GRAVITY_CORE_BASE_URL when configured
  -> in-process Gravity Web registry when Core is not running

apps/web
  -> /api/assistant/status
  -> /api/assistant/chat
  -> Ollama bridge
  -> modules/ollama runtime
```

The old engine-specific routes still exist for runtime inspection:

```text
/api/ollama/status
/api/ollama/chat
```

These routes are intentionally kept as diagnostics, not as the main user-facing Gravity contract.

## Grav Core service

The first standalone Core layer now lives at:

```text
services/grav-core
```

Shared TypeScript contracts live at:

```text
packages/grav-contracts
```

Run Core locally:

```bash
pnpm install
pnpm core:dev
```

Default Core URL:

```text
http://127.0.0.1:8765
```

Connect the web app to standalone Core:

```bash
GRAVITY_CORE_BASE_URL=http://127.0.0.1:8765
```

Core service routes:

```text
GET /health
GET /status
GET /modules
GET /providers
```

Web bridge route:

```text
GET /api/core/status
```

If `GRAVITY_CORE_BASE_URL` is missing, `/api/core/status` reports `mode: "in-process"`. If the URL is set but unreachable, it reports `mode: "unavailable"` and returns `503`.

## Interface rule

- `apps/web` is the main Gravity interface.
- the Gravity CLI should become a first-class operator interface.
- voice apps are secondary interfaces that must depend on Gravity-owned backend contracts.
- backend modules should not own the primary user experience.
- embedded dashboards inside modules are reference sources only.
- all module features should be exposed through Gravity-owned endpoints.
- endpoints must be honest: if a backend adapter is not connected, return a clear status instead of fake data.

## Implemented endpoint contract

### Assistant and runtime

```text
GET  /api/assistant/status    -> Grav + Gravity Web + Ollama runtime status
POST /api/assistant/chat      -> Grav chat contract, backed by Ollama
GET  /api/ollama/status       -> Ollama diagnostic status
POST /api/ollama/chat         -> Ollama diagnostic chat bridge
```

### Module status

```text
GET /api/modules/status       -> all registered module statuses
GET /api/core/status          -> Gravity Core connection status and bridge state
GET /api/memory/status        -> memory module connection status
GET /api/channels/status      -> channel module connection status
GET /api/voice/status         -> voice module connection status
GET /api/coding/status        -> coding module connection status
GET /api/defense/status       -> defense module connection status
GET /api/gateway/status       -> gateway module connection status
```

These routes are backed by `apps/web/lib/gravity-module-status.ts` and deliberately report whether a module is `connected`, `registered`, `missing`, or `planned`.

### Memory

```text
POST /api/memory/save
GET  /api/memory/search?query=&type=&tag=&limit=
POST /api/memory/search
POST /api/memory/forget
```

Current adapter: local JSON store at `${GRAVITY_DATA_DIR:-apps/web/.gravity}/memory.json` when running the web app. This is a Gravity-owned adapter, not yet the full MemPalace vector backend.

### Coding and defense scans

```text
GET  /api/coding/scan
POST /api/coding/scan
GET  /api/defense/scan
POST /api/defense/scan
```

These routes are guarded. They return `403` unless:

```text
GRAVITY_ENABLE_LOCAL_TOOLS=true
GRAVITY_WORKSPACE_ROOT=/absolute/path/to/the/workspace
```

`/api/coding/scan` inventories route files, fetch callers, TODO/FIXME/HACK markers, and secret-like assignments.

`/api/defense/scan` returns only the defensive subset: secret risks, TODO markers, large skipped files, and counts.

### Channels and voice adapters

```text
GET  /api/channels/inbox
POST /api/channels/inbox
POST /api/voice/session
```

`/api/channels/inbox` proxies to:

```text
GRAVITY_CHANNELS_BASE_URL + /inbox
```

If the service URL is missing, it returns `503` instead of pretending the channels service is live.

`/api/voice/session` supports two modes:

```text
GRAVITY_VOICE_BASE_URL + /session
```

or direct OpenAI Realtime session creation when `OPENAI_API_KEY` is available.

## Endpoint shape target

```text
/api/assistant/*   -> Grav conversation contract
/api/core/*        -> Gravity core status and orchestration
/api/ollama/*      -> engine diagnostics and runtime bridge
/api/memory/*      -> memory save/search/forget
/api/coding/*      -> coding actions and repo tools
/api/defense/*     -> security scans and reports
/api/gateway/*     -> routing and gateway controls
/api/channels/*    -> channel state, plugins, inbox, and delivery
/api/voice/*       -> realtime voice sessions and transcripts
/api/business/*    -> future business operator flows
```

## UI fusion plan

### Ash UI

- source: `apps/web`
- role: main Gravity shell
- responsibility: the only primary daily interface

### AstrBot dashboard

- source: `modules/channels/dashboard`
- role: reference UI for channels, plugin, inbox, and admin flows
- migration target: fold useful screens and interactions into `apps/web`
- integration rule: use `channels` backend endpoints, not a second mounted dashboard

### Voice apps

- sources:
  - `apps/voice-console`
  - `apps/voice-realtime-agents`
- role: prototype voice surfaces
- migration target: keep them as secondary surfaces or absorb their best flows into `apps/web`, but always route through Gravity endpoints

### CLI

- source foundation:
  - `modules/core/cli`
  - `modules/core/commands`
- role: operator and coding interface
- integration rule: the CLI should call the same Gravity capability contracts that power web and voice

### Other embedded UIs

- `modules/coding-openhands/frontend`
- `modules/coding-openhands/openhands-ui`
- `modules/defense/odk-web/frontend`
- `modules/ollama/app/ui`

These should be treated as feature and workflow reference material. Gravity should absorb capabilities, not duplicate their standalone products.

## Current truth about Ollama

Ollama is connected to the Gravity web app through Gravity-owned routes.

It is **registered in `services/grav-core` as a local model provider**, but assistant chat still routes through the existing web bridge until the Core orchestration planner is built.

Right now:

- `apps/web` talks to Ollama through Gravity routes.
- `services/grav-core` exposes provider/module registry contracts.
- Core does not yet execute assistant orchestration, approvals, or tools.

## Current truth about module integration

- Core now exists as `services/grav-core` and has a web bridge through `/api/core/status`.
- Memory has a working Gravity-owned local adapter.
- Coding and defense have guarded local scan adapters.
- Channels has an honest proxy adapter, but needs `GRAVITY_CHANNELS_BASE_URL`.
- Voice has an honest proxy/direct-session adapter, but needs `GRAVITY_VOICE_BASE_URL` or `OPENAI_API_KEY`.
- Gateway only has status reporting for now.

## Next endpoint work

1. Add a Core orchestration route so `/api/assistant/chat` can call Core first instead of directly calling Ollama.
2. Replace the local JSON memory adapter with a MemPalace/vector adapter while keeping the same `/api/memory/*` contract.
3. Add safe coding edit/run endpoints with approval gating.
4. Add channel send/plugin endpoints behind `GRAVITY_CHANNELS_BASE_URL`.
5. Add gateway proxy/control endpoints behind `GRAVITY_GATEWAY_BASE_URL`.
6. Add CLI commands that read `/api/core/status`, `/api/modules/status`, and guarded scan endpoints.
