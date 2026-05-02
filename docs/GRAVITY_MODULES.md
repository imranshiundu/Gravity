# Gravity Modules

## Active module map

| Module | Source focus | Main Gravity role |
| --- | --- | --- |
| `grav-ui-ash` | Next.js dashboard UI | Primary and only Gravity shell UI |
| `grav-chat-astrbot` | Multi-platform chatbot framework | Chat backend, plugins, and conversation patterns |
| `grav-dev-openhands` | AI software development platform | Deep coding workflows |
| `grav-dev-aider` | Terminal pair-programming tool | Repo editing and CLI coding flows |
| `grav-dev-claw` | Coding-agent implementation | Additional coding-agent patterns |
| `grav-core-claude-src` | Assistant source snapshot | Agent UX, CLI, session, tool patterns |
| `grav-agents-openai-sdk` | Multi-agent SDK | Agent orchestration patterns |
| `grav-runtime-ollama` | Open-model runtime | Local inference and model serving via external engine bridge |
| `grav-memory-mempalace` | AI memory system | Long-term memory and retrieval |
| `grav-voice-vibevoice` | Voice AI stack | Speech generation and recognition |
| `grav-voice-realtime-agents` | Realtime voice demo | Streaming agent conversation patterns |
| `grav-voice-realtime-console` | Realtime console demo | Voice console and WebRTC patterns |
| `grav-gateway-locci` | Reverse proxy/API gateway | Traffic control and service routing |
| `grav-security-odk` | Defense-first toolkit | Security workflows and audit tooling |

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

- keep `grav-ui-ash` as the sole live interface and bridge other modules into it
- combine `grav-core-claude-src`, `grav-agents-openai-sdk`, and coding-agent modules into one Grav execution layer
- connect `grav-runtime-ollama` and `grav-memory-mempalace` behind Gravity-owned service adapters
- combine the three voice modules into one Gravity voice stack
- expose `grav-gateway-locci` and `grav-security-odk` as operator modules inside the same system
