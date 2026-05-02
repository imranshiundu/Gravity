# Gravity Endpoints

Gravity should converge on one UI and one endpoint contract.

## Current live path

```text
apps/web
  -> /api/assistant/status
  -> /api/assistant/chat
  -> Ollama bridge
  -> modules/ollama
```

The old engine-specific routes still exist for runtime inspection:

```text
/api/ollama/status
/api/ollama/chat
```

## Interface rule

- `apps/web` is the main Gravity interface
- backend modules should not own the primary user experience
- embedded dashboards inside modules are reference sources only
- all module features should be exposed to the UI through Gravity-owned endpoints

## Endpoint shape

```text
/api/assistant/*   -> Grav conversation contract
/api/core/*        -> Gravity core status and orchestration
/api/ollama/*      -> engine diagnostics and runtime bridge
/api/memory/*      -> memory save/search/forget
/api/coding/*      -> coding actions and repo tools
/api/defense/*     -> security scans and reports
/api/channels/*    -> channel state, plugins, inbox, and delivery
/api/voice/*       -> realtime voice sessions and transcripts
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
- migration target: either embed selected features into `apps/web` or make them secondary apps that still talk to Gravity endpoints

### Other embedded UIs

- `modules/coding-openhands/frontend`
- `modules/coding-openhands/openhands-ui`
- `modules/defense/odk-web/frontend`
- `modules/ollama/app/ui`

These should be treated as feature and workflow reference material. Gravity should absorb capabilities, not duplicate their standalone products.

## Current truth about Ollama

Ollama is connected to the Gravity web app through Gravity-owned routes.

It is **not yet connected to `modules/core` as a replacement model provider**.

Right now:

- `apps/web` talks to Ollama through Gravity routes
- `modules/core` remains a source-pattern snapshot and still carries its original provider assumptions

## Next endpoint work

1. Move more UI fetches in `apps/web` behind Gravity assistant and service routes instead of engine-specific routes.
2. Add `channels` status and action endpoints so AstrBot capabilities enter Gravity through one shell.
3. Add a `voice` session endpoint layer so the voice apps stop being isolated demos.
4. Build `services/grav-core` so `apps/web` talks to Gravity Core first, and Gravity Core decides which backend module to use.
