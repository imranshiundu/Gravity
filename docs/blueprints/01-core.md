# 01 — Gravity Core Blueprint

Gravity Core is the kernel of the whole system.

It is the part that turns many powerful modules into one controlled assistant called Grav.

## One-line definition

**Gravity Core receives intent, chooses modes, loads memory, routes model calls, runs approved tools, audits actions, and returns Grav's final response.**

## Why Core comes first

Without Gravity Core, the repository is a collection of powerful but disconnected systems.

With Gravity Core, those systems become one operator.

```text
Disconnected modules                 Gravity with Core
────────────────────                 ─────────────────
Ollama                               User request
Claw / OpenHands / Aider                 ↓
MemPalace                            Grav personality
Locci Proxy                              ↓
AstrBot                              Gravity Core
Voice tools                              ↓
Open Defense Kit                     Controlled module execution
```

## Where Core lives

```text
services/grav-core/
```

Shared contracts live in:

```text
packages/grav-contracts/
```

Core should not live inside `modules/` because imported modules are capability providers. Core is Gravity-owned infrastructure.

## Core structure

```text
services/grav-core/
├─ src/
│  ├─ index.ts              # entrypoint
│  ├─ kernel.ts             # main request lifecycle
│  ├─ router.ts             # intent and mode routing
│  ├─ modes.ts              # personal/business/coding/etc mode definitions
│  ├─ registry.ts           # tool and module registry
│  ├─ permissions.ts        # risk and approval checks
│  ├─ models.ts             # calls model-router
│  ├─ memory.ts             # calls memory-service
│  ├─ audit.ts              # audit event writer
│  ├─ response.ts           # final response composer
│  └─ errors.ts             # controlled failures
└─ README.md
```

Contracts:

```text
packages/grav-contracts/
├─ src/
│  ├─ tool.ts
│  ├─ model.ts
│  ├─ memory.ts
│  ├─ module.ts
│  ├─ mode.ts
│  ├─ approval.ts
│  ├─ audit.ts
│  └─ ui.ts
└─ README.md
```

## Request lifecycle

```text
┌───────────────┐
│ User message  │
└───────┬───────┘
        ↓
┌───────────────┐
│ Grav identity │  personality, tone, rules
└───────┬───────┘
        ↓
┌───────────────┐
│ Intent router │  what does the user want?
└───────┬───────┘
        ↓
┌───────────────┐
│ Mode selector │  coding? memory? defense? business?
└───────┬───────┘
        ↓
┌───────────────┐
│ Memory broker │  what should Grav remember/use?
└───────┬───────┘
        ↓
┌───────────────┐
│ Tool planner  │  what module/tool is needed?
└───────┬───────┘
        ↓
┌───────────────┐
│ Permission    │  safe, medium, dangerous, disallowed
│ engine        │
└───────┬───────┘
        ↓
┌───────────────┐
│ Module call   │  adapter executes approved action
└───────┬───────┘
        ↓
┌───────────────┐
│ Audit log     │  record what happened
└───────┬───────┘
        ↓
┌───────────────┐
│ Final answer  │
└───────────────┘
```

## Modes Core must support

| Mode | Purpose |
| --- | --- |
| `personal` | notes, planning, life/project execution |
| `business` | leads, bookings, quotes, follow-ups, reports |
| `coding` | repo work, tests, diffs, docs, git workflows |
| `system` | local/server checks, logs, service health |
| `memory` | save, search, retrieve, forget, summarize |
| `defense` | defensive security checks for owned assets |
| `gateway` | service routing, proxy health, module routes |
| `channel` | external chat surfaces and plugins |
| `voice` | realtime speech and spoken sessions |

A request can activate multiple modes.

Example:

```text
"Scan my repo, fix the issue, and check if it is secure."
```

Mode result:

```text
coding + defense + memory
```

## Feature set

### 1. Intent routing

Core should classify the user request into modes and goals.

Output example:

```json
{
  "goal": "scan_and_fix_repo",
  "modes": ["coding", "defense"],
  "requiresMemory": true,
  "requiresApproval": true
}
```

### 2. Tool registry

Every module capability must register as a tool.

Examples:

```text
memory.search
memory.save
model.chat
code.scanRepo
code.editFile
code.runTests
defense.scanDependencies
defense.scanHeaders
gateway.checkHealth
voice.startSession
channel.sendMessage
business.createQuoteDraft
```

### 3. Permission engine

Core blocks dangerous behavior before it reaches a module.

```text
Safe       → can run directly
Medium     → may run, may request approval depending on workspace policy
Dangerous  → must request approval
Disallowed → never run
```

### 4. Audit trail

Every meaningful action must create an audit event.

Audit events make Grav trustworthy.

Examples:

```text
- user asked to scan repo
- Core selected coding + defense mode
- code.scanRepo ran
- defense.scanDependencies ran
- code.editFile requested approval
- user approved edit
- file changed
- tests ran
- final report returned
```

### 5. Model routing

Core should not call Ollama directly forever. It should call the model router.

```text
Core → model-router → Ollama/OpenAI/Groq/Gemini/etc
```

Ollama is default. Cloud providers are optional.

### 6. Memory brokering

Core should not let modules create isolated memories.

```text
Core → memory-service → MemPalace/vector store/SQL/file index
```

## How Grav uses Core

Grav is the personality. Core is the control layer.

```text
Grav says: "I can scan this repo and prepare a fix. I need approval before editing files."

Core enforces:
- what repo is allowed
- what files can be read
- whether edits require approval
- what module runs
- what gets logged
```

## Build phases

### v0: Skeleton

- HTTP or CLI entrypoint
- basic request lifecycle
- hardcoded modes
- simple registry
- simple audit logs

### v1: Local model

- connect model-router
- Ollama provider
- structured responses

### v2: Memory

- memory search/save
- project context
- memory inspection

### v3: Tools

- tool registration
- approval flow
- module adapters

### v4: UI integration

- approvals panel
- mode display
- audit log view

## Acceptance tests

Core is working when:

- a user message reaches `services/grav-core`,
- Core detects mode correctly,
- Core calls Ollama through a provider interface,
- Core can search/save memory,
- Core blocks dangerous tools without approval,
- Core writes audit logs,
- Core returns a structured response.

## Implementation warning

Do not start by merging all modules together.

Build Core first. Then attach modules.

## Final blueprint

```text
Gravity Core = Router + Planner + Permission Engine + Tool Registry + Memory Broker + Model Broker + Audit Layer
```
