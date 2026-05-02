# 03 — Gravity Memory Blueprint

Memory is what makes Grav feel continuous instead of temporary.

Without memory, Grav only reacts. With memory, Grav can remember projects, decisions, customers, repositories, preferences, tasks, mistakes, and operating history.

## One-line definition

**Gravity Memory is the shared memory layer that stores, retrieves, audits, edits, and forgets useful context across all Gravity modes.**

## Where it fits

```text
User request
  ↓
Gravity Core
  ↓
Memory broker
  ↓
Memory service
  ├─ MemPalace adapter
  ├─ vector search
  ├─ SQL/project records
  ├─ file/document index
  └─ audit-linked memories
```

## Where it should live

Imported module:

```text
modules/memory/
```

Gravity-owned service:

```text
services/memory-service/
```

Shared contracts:

```text
packages/grav-contracts/src/memory.ts
```

## Why memory comes after Ollama

Core controls the system.

Ollama gives Grav a local brain.

Memory gives Grav continuity.

```text
Core = control
Ollama = thinking engine
Memory = long-term context
```

## Memory types

Gravity should support five memory types.

| Type | Purpose |
| --- | --- |
| Working memory | Current task/session context |
| Episodic memory | Past conversations, events, and decisions |
| Semantic memory | Facts, documents, policies, business knowledge |
| Procedural memory | How Grav performs workflows |
| Audit memory | What Grav did, changed, ran, approved, or refused |

## Memory structure

```text
services/memory-service/
├─ src/
│  ├─ index.ts
│  ├─ memory-store.ts
│  ├─ search.ts
│  ├─ embeddings.ts
│  ├─ ingestion.ts
│  ├─ redaction.ts
│  ├─ forget.ts
│  ├─ providers/
│  │  ├─ mempalace.ts
│  │  ├─ local-json.ts
│  │  ├─ sqlite.ts
│  │  └─ vector.ts
│  └─ audit-link.ts
└─ README.md
```

## Memory record shape

```json
{
  "id": "mem_123",
  "workspaceId": "default",
  "projectId": "gravity",
  "type": "episodic",
  "content": "User decided Gravity Core lives in services/grav-core.",
  "source": "conversation",
  "confidence": 0.95,
  "privacy": "private",
  "createdAt": "2026-05-02T00:00:00Z",
  "linkedAuditEventId": "audit_123"
}
```

## Features

### 1. Save memory

Grav can store useful facts and decisions.

Examples:

- project architecture choices
- user preferences
- business rules
- customer context
- coding decisions
- deployment notes

### 2. Search memory

Grav can retrieve relevant memories before answering.

Example:

```text
User: "Where did we say Gravity Core should live?"

Memory result:
- services/grav-core/
- packages/grav-contracts/
```

### 3. Document ingestion

Gravity should ingest:

- Markdown
- PDF
- DOCX
- plain text
- code files
- CSV/JSON
- business documents
- repo documentation

### 4. Project memory

Each project should have its own memory space.

Examples:

```text
Gravity
Orb21
Pit Performante
Makuzi
Inside Nairobi Tours
```

### 5. Memory inspection

Users must be able to see what Grav remembers.

UI features:

- memory browser
- search
- source filter
- confidence view
- delete memory
- edit memory
- mark as wrong

### 6. Memory deletion

Gravity must support forgetting.

Forget modes:

```text
forget this fact
forget this project
forget this customer
forget memories older than X
forget sensitive data
```

### 7. Sensitive data handling

Memory should avoid storing secrets casually.

Sensitive examples:

- passwords
- API keys
- private keys
- tokens
- bank details
- customer IDs
- personal medical/legal details

## How Grav uses memory

Grav should use memory silently when it improves accuracy, but mention memory when it matters.

Example:

```text
I found the earlier Gravity decision: Core should live in services/grav-core, and shared contracts should live in packages/grav-contracts.
```

## Memory and coding

Coding Mode should store:

- repo summaries
- architecture notes
- unresolved issues
- test results
- known risky files
- branch decisions
- PR summaries

## Memory and business

Business Mode should store:

- customer records
- quote patterns
- service preferences
- follow-up history
- complaints
- business policies
- product/service catalog context

## Memory and defense

Defense Mode should store:

- previous scans
- vulnerabilities found
- remediation status
- ignored findings
- asset inventory

## Safety boundaries

Gravity Memory should not become uncontrolled surveillance.

Rules:

- store useful context, not everything
- mark sources
- allow deletion
- redact secrets
- avoid unnecessary sensitive data
- link actions to audit logs

## Acceptance tests

Memory is working when:

- Grav can save a decision,
- Grav can retrieve it later,
- memories include source metadata,
- user can inspect and delete memory,
- sensitive data is redacted or blocked,
- Coding/Business/Defense modes can write mode-specific memory.

## Final blueprint

```text
Memory = continuity + retrieval + audit-linked context.
MemPalace can help, but Gravity must own the memory contract.
```
