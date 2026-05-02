# Gravity Endpoints

Gravity should converge on one owned endpoint contract across web, CLI, and voice.

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
- the Gravity CLI is a first-class operator interface
- voice apps are secondary interfaces that still depend on Gravity-owned backend contracts
- backend modules should not own the primary user experience
- embedded dashboards inside modules are reference sources only
- all module features should be exposed through Gravity-owned endpoints

## Endpoint shape

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

It is **not yet connected to `modules/core` as a replacement model provider**.

Right now:

- `apps/web` talks to Ollama through Gravity routes
- `modules/core` remains a source-pattern snapshot and still carries its original provider assumptions

## Next endpoint work

1. Move more UI fetches in `apps/web` behind Gravity assistant and service routes instead of engine-specific routes.
2. Add `channels` status and action endpoints so AstrBot capabilities enter Gravity through one shell.
3. Add a `voice` session endpoint layer so the voice apps stop being isolated demos.
4. Define CLI-facing command contracts that map cleanly onto the same backend services.
5. Build `services/grav-core` so `apps/web`, CLI, and voice talk to Gravity Core first, and Gravity Core decides which backend module to use.
