# Gravity Roadmap

Gravity should be built in stages.

The goal is not to make every imported module run on day one. The goal is to create a reliable Gravity Core, then connect modules through contracts.

## Phase 0: Documentation foundation

Status: in progress

Deliverables:

- README direction
- Gravity System document
- Gravity Modules document
- Gravity Core document
- Gravity Contracts document
- Gravity Safety Policy
- Gravity Roadmap

## Phase 1: Gravity Core skeleton

Goal: create the first Gravity-owned kernel.

Target paths:

```text
services/grav-core/
packages/grav-contracts/
```

Deliverables:

- message input endpoint
- mode router
- tool registry
- approval engine
- audit logger
- model provider interface
- memory provider interface
- basic CLI or HTTP entrypoint

Success test:

```text
A user sends a message, Gravity Core routes it to a mode, calls a local model adapter, logs the event, and returns a structured response.
```

## Phase 2: Ollama local brain

Goal: make Gravity local-first.

Deliverables:

- Ollama model provider
- local chat support
- streaming support if possible
- embedding support if available
- model health check
- model selection config

Success test:

```text
Gravity can answer through Ollama without cloud API keys.
```

## Phase 3: Memory service

Goal: make Grav remember in a structured, inspectable way.

Deliverables:

- memory save/search API
- MemPalace adapter
- local memory store
- memory source metadata
- memory delete/edit workflow
- project memory
- audit-linked memory

Success test:

```text
Grav can recall prior project decisions and explain where the memory came from.
```

## Phase 4: Coding mode

Goal: give Grav safe coding hands.

Source modules:

- coding-claw
- coding-openhands
- coding-aider
- core patterns

Deliverables:

- repo scan tool
- file read tool
- file edit tool with approval
- test runner tool
- git diff summarizer
- commit preparation
- code audit memory

Success test:

```text
Grav can scan a repo, identify issues, propose edits, apply approved patches, run tests, and summarize the diff.
```

## Phase 5: Defense mode

Goal: integrate Open Defense Kit safely.

Deliverables:

- dependency scan
- exposed-secret scan
- security header check
- SSL/TLS check
- repo hardening report
- website hardening report
- defense-mode safety boundaries

Success test:

```text
Grav can scan an owned repo or website and produce a defensive remediation report without offensive behavior.
```

## Phase 6: Gateway layer

Goal: use Locci Proxy as Gravity infrastructure.

Deliverables:

- gateway config
- service routing
- health checks
- local service status page
- route model requests
- route module requests

Success test:

```text
Gravity services can sit behind one gateway with health checks and clean routes.
```

## Phase 7: UI shell

Goal: create the main Gravity user experience.

Source modules:

- ui
- channels/dashboard
- realtime console patterns later

Deliverables:

- dashboard shell
- chat surface
- mode switcher
- memory browser
- approvals panel
- tool execution log
- module health view

Success test:

```text
A user can talk to Grav, see what mode is active, approve risky actions, and inspect logs/memory.
```

## Phase 8: Channels

Goal: let Grav operate outside the main UI.

Source module:

- channels

Deliverables:

- AstrBot adapter
- plugin bridge
- Telegram/Slack/web chat possibilities
- channel permissions
- channel audit logs

Success test:

```text
A channel message can reach Gravity Core and return a controlled Grav response.
```

## Phase 9: Voice mode

Goal: give Grav speech and live interaction.

Source modules:

- voice-vibevoice
- voice-realtime-agents
- voice-console

Deliverables:

- voice console
- local voice path where possible
- realtime cloud voice path where configured
- call/session memory
- voice tool approval flow

Success test:

```text
A user can speak to Grav, receive a spoken response, and have the session logged into memory.
```

## Phase 10: Business operator

Goal: make Gravity commercially useful.

Deliverables:

- business profile
- knowledge base
- customer memory
- lead capture
- quote draft
- booking workflow
- follow-up tasks
- owner report
- optional voice receptionist
- optional security check report

Success test:

```text
A small business can use Grav to answer customers, remember context, book work, and produce daily owner summaries.
```

## Build rule

Do not build everything at once.

Build the kernel, then attach modules one by one.
