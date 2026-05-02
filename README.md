# Gravity

Gravity is the system.

Grav is the assistant personality that lives inside it.

This repository is being shaped into one unified AI operating system that combines personal assistance, business workflows, coding, voice, memory, system control, gateway routing, and defensive security into a single platform.

## Core idea

Everything in this repo is part of Gravity.

We are not treating the imported projects as optional references anymore. They are now Gravity modules, each contributing real capabilities to the final system:

- `grav-ui-ash` for dashboard and workspace UI
- `grav-chat-astrbot` for multi-platform chat and plugin patterns
- `grav-dev-openhands`, `grav-dev-aider`, and `grav-dev-claw` for coding workflows
- `grav-core-claude-src` for assistant UX and terminal-agent patterns
- `grav-agents-openai-sdk` for orchestration patterns
- `grav-runtime-ollama` for local model runtime
- `grav-memory-mempalace` for long-term memory
- `grav-voice-vibevoice`, `grav-voice-realtime-agents`, and `grav-voice-realtime-console` for speech and realtime interaction
- `grav-gateway-locci` for proxy and gateway behavior
- `grav-security-odk` for defensive security capabilities

## Build sequence

Gravity should be built in this order:

```text
Core → Ollama → Memory → Coding → Defense → Gateway → UI → Channels → Voice → Business Operator
```

Canonical blueprints:

1. [Core](docs/blueprints/01-core.md)
2. [Ollama Runtime](docs/blueprints/02-ollama.md)
3. [Memory](docs/blueprints/03-memory.md)
4. [Coding](docs/blueprints/04-coding.md)
5. [Defense](docs/blueprints/05-defense.md)
6. [Gateway](docs/blueprints/06-gateway.md)
7. [UI](docs/blueprints/07-ui.md)
8. [Channels](docs/blueprints/08-channels.md)
9. [Voice](docs/blueprints/09-voice.md)
10. [Business Operator](docs/blueprints/10-business-operator.md)

## Current layout

```text
Gravity/
├── README.md
├── docs/
├── modules/
├── apps/
├── services/
├── packages/
└── data/
```

## What Gravity should become

Gravity should feel like one operating layer with one assistant identity:

- Grav for conversation and execution
- one shared memory model
- one tool and capability registry
- one approval and safety layer
- one UI shell
- many integrated subsystems behind it

## Gravity Core

Gravity Core is the missing center of the system.

It should live in:

```text
services/grav-core/
```

The shared contracts should live in:

```text
packages/grav-contracts/
```

Gravity Core is responsible for routing user requests, selecting modes, loading memory, choosing models, running tools, enforcing approvals, calling module adapters, writing audit logs, and composing Grav's final response.

Imported repos should not bypass Gravity Core. If a module can do something useful, Grav should eventually access it through Gravity Core.

## Important docs

- [Gravity System](docs/GRAVITY_SYSTEM.md)
- [Gravity Modules](docs/GRAVITY_MODULES.md)
- [Gravity Core](docs/GRAVITY_CORE.md)
- [Gravity Contracts](docs/GRAVITY_CONTRACTS.md)
- [Gravity Safety Policy](docs/GRAVITY_SAFETY_POLICY.md)
- [Gravity Roadmap](docs/GRAVITY_ROADMAP.md)
- [Gravity Blueprints](docs/blueprints/README.md)
- [gravity.modules.yaml](gravity.modules.yaml)

## Documentation source of truth

The blueprint docs in `docs/blueprints/` are the Gravity-level source of truth.

Module-level READMEs remain useful as upstream reference material for setup, license, and source-specific details. They should not be deleted until their critical information has been safely migrated into Gravity-level docs.

## Immediate build direction

1. create `packages/grav-contracts` so modules can expose shared tools, model providers, memory providers, UI surfaces, approvals, and audit events
2. create `services/grav-core` as the kernel that routes across all modules
3. connect Ollama as the first local model provider
4. connect memory through a Gravity-owned memory service, with MemPalace as an adapter rather than the only source of truth
5. add Coding Mode through the coding modules with approval gates
6. add Defense Mode through Open Defense Kit with strict defensive boundaries
7. add Locci Proxy as gateway infrastructure after the core services exist
8. fuse UI assets into one Gravity shell once the core contracts are stable

## Current interface rule

- `modules/grav-ui-ash` is the only primary interface
- Ollama is connected as an external engine through `OLLAMA_BASE_URL`
- AstrBot dashboard startup is disabled by default inside Gravity

## Likely additions

The imported modules already cover a lot, but Gravity will probably improve with dedicated support for:

- connectors for email, calendar, drive, GitHub, and business tools
- observability and traces
- background job orchestration
- structured retrieval and indexing
- auth and multi-user controls
- encrypted secrets management
- browser automation for UI testing and controlled web workflows

## Power level, realistically

If Gravity is built correctly, it can become more than a chatbot. It can become a local-first AI operator that:

- remembers long-term project and business context
- uses local Ollama models without requiring cloud API keys for basic work
- codes across repositories with approval gates
- performs defensive security checks on owned assets
- speaks through voice modules
- routes work through channels and dashboards
- runs business workflows such as leads, bookings, quotes, and follow-ups
- gives the user one assistant identity across many systems

The system will only be as powerful as the Gravity Core, contracts, permissions, and module adapters are strong. The imported repos provide raw capability. Gravity Core turns that capability into one controlled product.
