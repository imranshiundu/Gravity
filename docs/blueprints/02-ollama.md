# 02 — Ollama Runtime Blueprint

Ollama is Gravity's default local brain.

It gives Grav the ability to run without depending on cloud API keys for basic assistant, coding, memory, and business tasks.

## One-line definition

**Ollama is the local model runtime that lets Gravity run language models, coding models, and embedding models on the user's own machine or server.**

## Where it fits

```text
User
  ↓
Grav
  ↓
Gravity Core
  ↓
Model Router
  ↓
Ollama
  ↓
Local model response
```

## Where it should live

Ollama itself is an external runtime/module:

```text
modules/ollama/
```

Gravity-owned adapter:

```text
services/model-router/
packages/grav-contracts/src/model.ts
```

## Why Ollama matters

Ollama gives Gravity:

- local-first operation
- privacy
- lower running costs
- offline-friendly capability
- model choice
- local coding models
- local embedding models
- a foundation for API-key-free mode

## What Ollama is not

Ollama is not Gravity Core.

Ollama does not decide permissions, modes, memory, tools, or business workflows.

It only runs models.

```text
Ollama = engine
Gravity Core = driver/controller
Grav = personality/operator
```

## Model roles

Gravity should support different models for different jobs.

| Role | Use |
| --- | --- |
| Main assistant model | general conversation and reasoning |
| Coding model | code analysis and generation |
| Fast router model | cheap intent classification |
| Embedding model | memory search and document retrieval |
| Small local model | low-resource tasks |

## Provider contract

Ollama should implement the Gravity model provider contract.

```ts
export type GravityModelProvider = {
  id: "ollama.local";
  name: "Ollama Local";
  kind: "local";
  chat: (input: GravityChatInput) => Promise<GravityChatOutput>;
  stream?: (input: GravityChatInput) => AsyncIterable<GravityModelToken>;
  embed?: (input: GravityEmbedInput) => Promise<GravityEmbedOutput>;
};
```

## Service structure

```text
services/model-router/
├─ src/
│  ├─ index.ts
│  ├─ router.ts
│  ├─ providers/
│  │  ├─ ollama.ts
│  │  ├─ openai.ts       # future optional
│  │  ├─ groq.ts         # future optional
│  │  └─ mock.ts
│  ├─ health.ts
│  └─ config.ts
└─ README.md
```

## Request flow

```text
Gravity Core
  ↓
model-router.chat({ provider: "ollama.local", model: "qwen-coder" })
  ↓
Ollama HTTP API
  ↓
Local model
  ↓
streamed or complete response
  ↓
Gravity Core
```

## Features Gravity should expose

### 1. Local chat

Grav can respond using a local model.

Use cases:

- personal assistant
- project planning
- document Q&A
- business replies
- offline work

### 2. Local coding model

Grav can use a code-focused model for Coding Mode.

Use cases:

- explain code
- generate patches
- review diffs
- write tests
- debug stack traces

### 3. Local embeddings

Grav can embed documents and memories locally.

Use cases:

- semantic memory search
- document retrieval
- codebase retrieval
- business knowledge base search

### 4. Model health checks

Gravity should know whether Ollama is running.

Example status:

```json
{
  "provider": "ollama.local",
  "status": "online",
  "models": ["llama", "qwen-coder", "nomic-embed-text"]
}
```

### 5. Model selection

Gravity should allow workspaces to choose models per task.

Example:

```yaml
models:
  default: llama3.1
  coding: qwen2.5-coder
  embeddings: nomic-embed-text
  fast_router: llama3.2:3b
```

## How Grav uses Ollama

Grav should not say "I am Ollama."

Grav should say:

```text
I am running locally through Ollama.
```

or:

```text
This task is using the local coding model.
```

## API-key strategy

Gravity should have three model modes:

```text
Local mode    → Ollama only, no cloud API key
Hybrid mode   → Ollama + optional cloud providers
Pro mode      → stronger cloud models where configured
```

## Safety boundaries

Ollama may generate bad outputs. Gravity Core must still enforce:

- tool permissions
- dangerous action approvals
- memory privacy
- defense-mode restrictions
- audit logging

The model never gets final authority. Core does.

## Acceptance tests

Ollama integration is working when:

- model-router detects Ollama health,
- Gravity can send a prompt to a local model,
- Gravity can stream a response,
- embeddings can be generated if an embedding model is installed,
- Core can fall back gracefully when Ollama is offline.

## Final blueprint

```text
Ollama = Gravity's local model engine.
Model Router = the controlled doorway to Ollama.
Gravity Core = the authority that decides when and how to use it.
```
