# Gravity Core

Gravity Core is the missing center of Gravity.

It is not a chatbot UI, not Ollama, not Claw, not MemPalace, not Locci Proxy, and not Open Defense Kit. It is the orchestration kernel that lets Grav use all of those modules safely through one system.

## Definition

**Gravity Core** is the service that receives a user request, understands intent, loads memory, selects tools, chooses a model, checks permissions, runs modules, records what happened, and returns a useful result through Grav.

```text
User request
  ↓
Grav personality
  ↓
Gravity Core
  ├─ intent router
  ├─ mode selector
  ├─ memory broker
  ├─ model router
  ├─ tool registry
  ├─ permission engine
  ├─ module adapter layer
  ├─ audit logger
  └─ response composer
```

## Where it should live

The first implementation should live here:

```text
services/grav-core/
```

The shared contracts should live here:

```text
packages/grav-contracts/
```

Gravity Core should not be placed inside `modules/` because `modules/` contains imported or adapted systems. Gravity Core is Gravity-owned infrastructure.

## What Gravity Core does

### 1. Intent routing

Gravity Core classifies a request into one or more modes:

- personal
- business
- coding
- system
- memory
- voice
- defense
- gateway
- channel

Example:

```text
"Fix this repo and check if it is secure."
```

Routes to:

```text
coding mode + defense mode + memory mode
```

### 2. Mode selection

Each mode activates different tool groups.

| Mode | Main tools |
| --- | --- |
| Personal | tasks, notes, memory, planning |
| Business | leads, quotes, bookings, follow-ups, reports |
| Coding | repo scan, file read/write, tests, git, PRs |
| System | logs, services, health checks, local runtime |
| Memory | save, search, summarize, forget, audit |
| Voice | realtime, STT, TTS, call state |
| Defense | dependency scan, secret scan, headers, SSL, hardening |
| Gateway | routing, service health, proxy config |
| Channel | Telegram, Slack, web chat, plugin surfaces |

### 3. Memory brokering

Gravity Core should not let every module create its own isolated memory.

It should broker memory through one service:

```text
services/memory-service/
```

Memory types:

| Type | Purpose |
| --- | --- |
| Working memory | current task/session |
| Episodic memory | events, conversations, project history |
| Semantic memory | facts, documents, policies, knowledge |
| Procedural memory | how Grav performs workflows |
| Audit memory | actions taken, files changed, commands run |

MemPalace can power part of this system, but the source of truth should be Gravity-owned.

### 4. Model routing

Gravity Core should route model calls through:

```text
services/model-router/
```

Default model runtime:

```text
Ollama
```

Optional providers later:

```text
OpenAI, Groq, Gemini, Anthropic, local specialist models
```

The core rule:

> Gravity should be provider-neutral. Ollama is the default local engine, not the whole system.

### 5. Tool registry

Every capability should be exposed as a registered Gravity tool.

Example tools:

```text
memory.search
memory.save
code.scanRepo
code.editFile
code.runTests
defense.scanDependencies
defense.scanHeaders
voice.startSession
gateway.checkHealth
channel.sendMessage
system.readLogs
```

### 6. Permission engine

Gravity Core must check risk before running tools.

| Risk | Meaning | Example |
| --- | --- | --- |
| safe | read-only or low-impact | read file, search memory |
| medium | changes local state | edit file, run test, write memory |
| dangerous | destructive or external impact | delete file, push to main, deploy, send email |
| disallowed | outside Gravity policy | exploit third-party systems |

Dangerous actions require explicit approval.

### 7. Module adapter layer

Gravity Core should not directly depend on every imported repo's internals.

Each module gets an adapter:

```text
modules/*               imported module
modules/*-adapter       Gravity adapter where needed
packages/grav-contracts shared interface
```

The adapter exposes standard Gravity capabilities while keeping the imported project intact.

### 8. Audit logging

Gravity must remember what Grav did.

Audit logs should capture:

- user request
- mode selected
- tools called
- files read
- files changed
- commands executed
- approvals requested
- approvals granted or denied
- model used
- final result

This matters because Gravity is an operator, not a toy assistant.

## First implementation target

Create a small core that can:

1. accept a message,
2. route it to a mode,
3. call Ollama through a model adapter,
4. search/save simple memory,
5. expose a basic tool registry,
6. block dangerous actions unless approved,
7. return a structured response.

That is the first real Gravity Core.

## Non-goals for v1

Do not start by fusing all imported repos into one runtime.

Do not start with full voice.

Do not start with business automation.

Do not start with production deployment.

Build the kernel first, then plug modules into it.

## Minimal folder target

```text
services/grav-core/
├─ src/
│  ├─ index.ts
│  ├─ kernel.ts
│  ├─ router.ts
│  ├─ modes.ts
│  ├─ permissions.ts
│  ├─ registry.ts
│  ├─ memory.ts
│  ├─ models.ts
│  └─ audit.ts
└─ README.md

packages/grav-contracts/
├─ src/
│  ├─ tool.ts
│  ├─ model.ts
│  ├─ memory.ts
│  ├─ module.ts
│  ├─ mode.ts
│  └─ audit.ts
└─ README.md
```

## Final rule

If a module can do something useful, Grav should eventually be able to access that capability through Gravity Core, not by bypassing it.
