# Gravity System

## Identity

- system name: `Gravity`
- assistant personality: `Grav`
- mission: one AI operating system across personal, business, system, coding, voice, memory, and security work

## Principle

All imported codebases are active Gravity modules.

We are not shrinking the workspace into a single-language app first. We are building a unifying operating layer that lets all of these systems contribute their strengths under one name, one shell, and one orchestration model.

## Workspace structure

```text
Gravity/
├── modules/
│   ├── grav-ui-ash
│   ├── grav-chat-astrbot
│   ├── grav-dev-openhands
│   ├── grav-dev-aider
│   ├── grav-dev-claw
│   ├── grav-core-claude-src
│   ├── grav-agents-openai-sdk
│   ├── grav-runtime-ollama
│   ├── grav-memory-mempalace
│   ├── grav-voice-vibevoice
│   ├── grav-voice-realtime-agents
│   ├── grav-voice-realtime-console
│   ├── grav-gateway-locci
│   └── grav-security-odk
├── apps/
├── services/
├── packages/
└── data/
```

## Operating model

Gravity should converge toward four unified layers:

### 1. Shell

The user-facing workspace for chat, tools, sessions, mode-switching, memory browsing, approvals, and administration.

Primary sources:

- `modules/grav-ui-ash`
- `modules/grav-chat-astrbot/dashboard`

### 2. Core

The Gravity brain that brokers requests across models, tools, memory, and runtime services.

Gravity Core should be Gravity-owned, not hidden inside an imported module.

Target path:

```text
services/grav-core/
```

Shared contracts target path:

```text
packages/grav-contracts/
```

Primary sources for patterns:

- `modules/grav-core-claude-src`
- `modules/grav-agents-openai-sdk`
- patterns from coding-agent modules

Gravity Core should own:

- intent routing
- mode selection
- model routing
- memory brokering
- tool registry
- permission checks
- approval requests
- module adapter calls
- audit logs
- response composition

### 3. Capability fabric

The module network that provides actual power:

- coding
- voice
- local inference
- memory
- gateway routing
- defensive security
- future business connectors

Each capability should be exposed through Gravity contracts instead of direct uncontrolled calls.

### 4. Runtime data

Shared storage for:

- sessions
- memory
- indexes
- logs
- user and workspace state
- audit events
- approvals
- tool execution history

## Convergence path

### Phase 1

Normalize the repository as one monorepo and keep every imported system intact.

### Phase 2

Create Gravity-owned wrappers in `apps/`, `services/`, and `packages/` that call into module functionality instead of rewriting it all immediately.

### Phase 3

Gradually standardize module entrypoints, data contracts, and permission boundaries so Grav can use everything through one consistent interface.

### Phase 4

Fuse UI, memory, voice, coding, and system workflows into one coherent operator experience.

## Naming choice

I’m using `modules` rather than `skills`.

Reason:

- these imported projects are larger than skills
- many of them are full runtimes, apps, SDKs, or frameworks
- `modules` leaves room for future Gravity skills inside the core system later

## Cleanup already done

- extracted all archive files
- removed the original `.zip` archives
- renamed imported projects into Gravity-style module names
- removed nested `.git` directories so the workspace can be versioned as one repo
- reduced the documentation set to a smaller core

## Next technical step

Create a small `packages/grav-contracts` package plus a `services/grav-core` wrapper so every module can start registering tools, models, actions, and UI surfaces into one shared Gravity contract.

## Power expectation

Gravity can become very powerful, but only if the kernel is controlled.

The imported modules are engines, tools, limbs, channels, memory, and infrastructure. Gravity Core is what prevents them from becoming chaos.

The goal is not to make Grav do everything blindly. The goal is to make Grav do many things through:

- shared contracts
- explicit modes
- approval gates
- audit logs
- memory boundaries
- local-first model routing
- defensive security rules

That is what turns many repos into one serious system.
