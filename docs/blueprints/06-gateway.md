# 06 — Gravity Gateway Blueprint

Gateway is the road system of Gravity.

It routes traffic between the UI, Core, model runtime, memory, coding, defense, voice, channels, and business services.

## One-line definition

**Gravity Gateway is the service routing layer that exposes one controlled entrypoint for Gravity while hiding and organizing internal services.**

## Source module

```text
modules/grav-gateway-locci
```

## Where it should live

Imported module:

```text
modules/grav-gateway-locci/
```

Gravity-owned service/config:

```text
services/gateway/
```

## Why Gateway comes after Defense

Core, Ollama, Memory, Coding, and Defense define what Gravity does.

Gateway defines how those services are routed and exposed.

## Where it fits

```text
Browser / CLI / Channel / Voice
          ↓
     Gravity Gateway
          ↓
 ┌────────┼────────┬──────────┬──────────┐
 ↓        ↓        ↓          ↓          ↓
Core   Memory   Models     Coding     Defense
```

## Gateway responsibilities

### 1. Route internal services

Example routes:

```text
/api/grav        → services/grav-core
/api/models      → services/model-router
/api/memory      → services/memory-service
/api/code        → services/code-service
/api/defense     → services/defense-service
/api/voice       → services/voice-service
/api/channels    → services/channel-service
/api/business    → services/business-service
```

### 2. Health checks

Gateway should know which services are alive.

Example:

```json
{
  "grav-core": "online",
  "ollama": "online",
  "memory-service": "online",
  "code-service": "offline",
  "defense-service": "online"
}
```

### 3. Service isolation

Internal services should not all be publicly exposed.

Gateway controls access.

### 4. Rate limits

Gateway can protect services from abuse.

Examples:

- per-user request limits
- per-service limits
- burst protection
- model call limits

### 5. Local network operation

Gravity should support local-first deployment.

Example:

```text
localhost:7878       → Gravity Gateway
localhost:11434      → Ollama internal
localhost:3000       → UI internal
localhost:4001       → Core internal
```

### 6. Multi-service status panel

Gateway should feed UI with service status.

UI can show:

```text
Core: online
Ollama: online
Memory: online
Coding: offline
Defense: online
Voice: not configured
```

## Service structure

```text
services/gateway/
├─ config/
│  ├─ local.yaml
│  ├─ dev.yaml
│  └─ production.yaml
├─ docs/
│  └─ routes.md
└─ README.md
```

If Locci Proxy is used directly, keep Gravity-specific config in `services/gateway/` and keep upstream code in `modules/grav-gateway-locci/`.

## Route blueprint

```text
┌────────────────────┐
│ Gravity Gateway    │
├────────────────────┤
│ /api/grav          │ → Core
│ /api/models        │ → Model Router
│ /api/memory        │ → Memory Service
│ /api/code          │ → Code Service
│ /api/defense       │ → Defense Service
│ /api/voice         │ → Voice Service
│ /api/channels      │ → Channel Service
│ /api/business      │ → Business Service
│ /health            │ → Service Status
└────────────────────┘
```

## Safety boundaries

Gateway must not expose dangerous internal endpoints without authentication and permission checks.

Rules:

- no direct public route to destructive tools
- no public access to memory database
- no public access to secrets
- no unauthenticated admin routes
- no direct unguarded shell/code execution route

## Acceptance tests

Gateway is working when:

- UI calls one base Gravity endpoint,
- requests route to Core,
- Core can reach model/memory/tool services,
- health checks work,
- unavailable services fail gracefully,
- internal services are not unnecessarily exposed.

## Final blueprint

```text
Gateway = one controlled doorway into many Gravity services.
```
