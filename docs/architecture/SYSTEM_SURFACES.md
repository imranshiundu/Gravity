# System Surfaces

Gravity has four user-facing and operator-facing surfaces:

## 1. Web

- path: `apps/web`
- role: primary interface
- target: chat, memory, approvals, module health, business, channels, system, security

## 2. CLI

- source foundation: `modules/core/cli` and `modules/core/commands`
- role: operator and coding surface
- target: full command, automation, and engineering access through Gravity-owned routing

## 3. Voice

- frontend surfaces:
  - `apps/voice-console`
  - `apps/voice-realtime-agents`
- backend capability:
  - `modules/voice`
- target: live voice sessions, transcripts, approvals, fallback handoff to web and CLI

## 4. Channels

- backend surface: `modules/channels`
- reference UI source: `modules/channels/dashboard`
- target: Telegram, Slack, widgets, plugin delivery, inbox, and async communication

## Rule

- `modules/` holds engines, runtimes, adapters, and capability backends
- `apps/` holds user-facing interfaces
- Gravity-owned endpoints are the contract between them

## Access expectation

Every major feature should become reachable from:

- `apps/web`
- the Gravity CLI
- voice workflows where appropriate

Some features may remain web-first or CLI-first, but none should stay trapped behind an imported product UI.
