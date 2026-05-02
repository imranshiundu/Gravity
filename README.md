# Gravity

Gravity is the system.

Grav is the assistant personality that lives inside it.

This repository is being shaped into one unified AI operating system that combines personal assistance, business workflows, coding, voice, memory, system control, gateway routing, and defensive security into a single platform.

## Core idea

Everything in this repo is part of Gravity.

We are not treating the imported projects as optional references anymore. They are now Gravity modules, each contributing real capabilities to the final system:

- `grav-core` for assistant UX, terminal-agent behavior, and system foundations
- `grav-ollama` for the local AI brain
- `grav-memory` for long-term memory and retrieval
- `grav-coding-openhands`, `grav-coding-aider`, and `grav-coding-claw` for coding workflows
- `grav-defense` for defensive security capabilities
- `grav-gateway` for proxy and gateway behavior
- `grav-ui` for the primary and only Gravity interface
- `grav-channels` for multi-platform channels and plugins
- `grav-voice-vibevoice`, `grav-voice-realtime-agents`, and `grav-voice-console` for speech and realtime interaction
- `grav-orchestration` for agent orchestration patterns

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

## Important docs

- [Gravity System](docs/GRAVITY_SYSTEM.md)
- [Gravity Modules](docs/GRAVITY_MODULES.md)
- [gravity.modules.yaml](gravity.modules.yaml)

## Immediate build direction

1. fuse the current UI assets from Ash and AstrBot into a Gravity shell
2. create a Gravity core service that can route across all modules
3. expose unified adapters for local models, memory, voice, coding, gateway, and security
4. normalize each module into shared Gravity contracts over time

## Current interface rule

- `modules/grav-ui` is the only primary interface
- Ollama is connected as an external engine through `OLLAMA_BASE_URL`
- AstrBot dashboard startup is disabled by default inside Gravity

## Likely additions

The imported modules already cover a lot, but Gravity will probably improve with dedicated support for:

- connectors for email, calendar, drive, and business tools
- observability and traces
- background job orchestration
- structured retrieval and indexing
- auth and multi-user controls
