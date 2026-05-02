# Gravity Modules

## Active module map

| Module | Source focus | Main Gravity role |
| --- | --- | --- |
| `core` | Assistant source snapshot | Core Gravity behavior, terminal UX, sessions, and tool patterns |
| `ollama` | Open-model runtime | Local AI brain and model serving via external engine bridge |
| `memory` | AI memory system | Long-term memory and retrieval |
| `coding-openhands` | AI software development platform | Deep coding workflows |
| `coding-aider` | Terminal pair-programming tool | Repo editing and CLI coding flows |
| `coding-claw` | Coding-agent implementation | Additional coding-agent patterns |
| `defense` | Defense-first toolkit | Security workflows and audit tooling |
| `gateway` | Reverse proxy/API gateway | Traffic control and service routing |
| `channels` | Multi-platform chatbot framework | Channels, plugins, and conversation patterns |
| `voice` | Voice AI stack | Speech generation and recognition |
| `orchestration` | Multi-agent SDK | Agent orchestration patterns |

## Active app map

| App | Source focus | Main Gravity role |
| --- | --- | --- |
| `apps/web` | Ash-derived Next.js app | Primary and only Gravity shell UI |
| `apps/voice-console` | Realtime console app | Voice testing surface |
| `apps/voice-realtime-agents` | Realtime agent app | Voice prototype surface |

## Embedded UI sources to absorb

- `modules/channels/dashboard`
- `modules/coding-openhands/frontend`
- `modules/coding-openhands/openhands-ui`
- `modules/defense/odk-web/frontend`
- `modules/ollama/app/ui`

## Planned Gravity-owned layer

| Module | Status | Role |
| --- | --- | --- |
| `business-operator` | planned | Business workflows, operator automation, and future connector-heavy execution |

## Integration intent

Each module should eventually expose some combination of:

- UI surfaces
- tool actions
- background workers
- service endpoints
- data models
- memory hooks
- system prompts or policies

## Immediate fusion opportunities

- keep `apps/web` as the sole live interface and bridge other modules into it
- combine `core`, `orchestration`, and coding-agent modules into one Grav execution layer
- connect `ollama` and `memory` behind Gravity-owned service adapters
- combine `voice` with the voice apps into one Gravity voice stack
- expose `gateway` and `defense` as operator modules inside the same system
