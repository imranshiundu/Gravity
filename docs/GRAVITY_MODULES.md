# Gravity Modules

## Active module map

| Module | Source focus | Main Gravity role |
| --- | --- | --- |
| `grav-core` | Assistant source snapshot | Core Gravity behavior, terminal UX, sessions, and tool patterns |
| `grav-ollama` | Open-model runtime | Local AI brain and model serving via external engine bridge |
| `grav-memory` | AI memory system | Long-term memory and retrieval |
| `grav-coding-openhands` | AI software development platform | Deep coding workflows |
| `grav-coding-aider` | Terminal pair-programming tool | Repo editing and CLI coding flows |
| `grav-coding-claw` | Coding-agent implementation | Additional coding-agent patterns |
| `grav-defense` | Defense-first toolkit | Security workflows and audit tooling |
| `grav-gateway` | Reverse proxy/API gateway | Traffic control and service routing |
| `grav-ui` | Next.js dashboard UI | Primary and only Gravity shell UI |
| `grav-channels` | Multi-platform chatbot framework | Channels, plugins, and conversation patterns |
| `grav-voice-vibevoice` | Voice AI stack | Speech generation and recognition |
| `grav-voice-realtime-agents` | Realtime voice demo | Streaming agent conversation patterns |
| `grav-voice-console` | Realtime console demo | Voice console and WebRTC patterns |
| `grav-orchestration` | Multi-agent SDK | Agent orchestration patterns |

## Planned Gravity-owned layer

| Module | Status | Role |
| --- | --- | --- |
| `grav-business-operator` | planned | Business workflows, operator automation, and future connector-heavy execution |

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

- keep `grav-ui` as the sole live interface and bridge other modules into it
- combine `grav-core`, `grav-orchestration`, and coding-agent modules into one Grav execution layer
- connect `grav-ollama` and `grav-memory` behind Gravity-owned service adapters
- combine the three voice modules into one Gravity voice stack
- expose `grav-gateway` and `grav-defense` as operator modules inside the same system
