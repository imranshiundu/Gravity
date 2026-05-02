# 08 — Gravity Channels Blueprint

Channels let Grav operate outside the main dashboard.

They connect Gravity to places where users and businesses already communicate.

## One-line definition

**Gravity Channels are controlled external surfaces that let Grav receive and respond through chat platforms, plugins, web widgets, and future business communication tools.**

## Source module

```text
modules/grav-chat-astrbot
```

## Where it should live

Gravity-owned service:

```text
services/channel-service/
```

Adapters:

```text
modules/grav-chat-astrbot
modules/*-adapter where needed
```

## Where it fits

```text
Telegram / Slack / Web chat / Plugin surface
          ↓
Channel Service
          ↓
Gateway
          ↓
Gravity Core
          ↓
Grav response
```

## Why channels come after UI

Gravity must first have Core, memory, tools, permissions, and UI visibility.

Only then should Grav be exposed to external channels.

## Channel types

| Channel | Use |
| --- | --- |
| Web chat | website assistant, dashboard chat |
| Telegram | personal/team command surface |
| Slack/Discord | team/workspace operations |
| Plugin channel | AstrBot-style extension ecosystem |
| Business widget | customer-facing assistant |
| Future WhatsApp/SMS | business support, with stricter approval/compliance |

## Channel service responsibilities

### 1. Receive messages

Channel service normalizes incoming messages into Gravity format.

```json
{
  "channel": "telegram",
  "userId": "telegram_123",
  "workspaceId": "personal",
  "message": "What needs follow-up today?"
}
```

### 2. Apply channel permissions

Not every channel should access every capability.

Example:

| Channel | Allowed |
| --- | --- |
| personal Telegram | personal tasks, memory lookup |
| public web widget | business FAQ only |
| team Slack | project summaries, safe docs |
| customer chat | support, booking, quote intake |

### 3. Route to Gravity Core

Channel service should not answer independently.

```text
Channel → Core → Tool/Memory/Model → Core → Channel
```

### 4. Format responses

Different channels need different formatting.

Examples:

- short Telegram responses
- structured Slack blocks
- web chat cards
- customer-friendly replies
- owner/admin summaries

### 5. Log channel activity

Every channel action should be audited.

Logs should include:

- channel name
- user identity
- workspace
- message summary
- mode selected
- tools used
- response sent

## Service structure

```text
services/channel-service/
├─ src/
│  ├─ index.ts
│  ├─ normalize.ts
│  ├─ permissions.ts
│  ├─ formatter.ts
│  ├─ audit.ts
│  ├─ adapters/
│  │  ├─ astrbot.ts
│  │  ├─ web.ts
│  │  ├─ telegram.ts
│  │  └─ slack.ts
│  └─ policies/
│     ├─ personal.ts
│     ├─ business-public.ts
│     └─ team.ts
└─ README.md
```

## Tool registry

```text
channel.receiveMessage
channel.sendMessage
channel.formatResponse
channel.checkPermission
channel.registerAdapter
channel.listChannels
channel.disableChannel
```

## Safety boundaries

Channels can expose Grav to external users.

Rules:

- no dangerous tools from public channels
- no file edits from unauthenticated channels
- no secret leakage
- no customer data leakage
- no sending external messages without policy approval
- no business action without workspace permissions

## Business use cases

Channels make Gravity sellable.

Examples:

- website assistant
- customer FAQ responder
- booking intake
- quote request collection
- team internal assistant
- Telegram admin bot
- client support bridge

## Acceptance tests

Channels are working when:

- a channel message reaches Gravity Core,
- Core knows which channel sent it,
- permissions are applied,
- Grav responds correctly,
- public channels cannot access private tools,
- channel actions are audited.

## Final blueprint

```text
Channels = external doors into Gravity, controlled by Core and permissions.
```
