# Gravity Contracts

Gravity should expose all module capabilities through shared contracts.

This prevents the system from becoming a pile of unrelated repos.

## Purpose

Contracts define the shape of:

- tools
- model providers
- memory providers
- modules
- modes
- approvals
- audit events
- UI surfaces

The first package should live at:

```text
packages/grav-contracts/
```

## Tool contract

Every action Grav can run should be represented as a tool.

```ts
export type GravityToolRisk = "safe" | "medium" | "dangerous" | "disallowed";

export type GravityTool = {
  name: string;
  title: string;
  description: string;
  moduleId: string;
  risk: GravityToolRisk;
  requiresApproval: boolean;
  inputSchema: unknown;
  outputSchema?: unknown;
  run: (input: unknown, context: GravityContext) => Promise<GravityToolResult>;
};
```

Example:

```ts
const scanRepoTool: GravityTool = {
  name: "code.scanRepo",
  title: "Scan repository",
  description: "Read a repository and summarize structure, risks, and next steps.",
  moduleId: "coding-claw",
  risk: "safe",
  requiresApproval: false,
  inputSchema: {},
  run: async (input, context) => {
    return { ok: true, data: {} };
  },
};
```

## Model provider contract

Gravity should not hard-code itself to one model company.

```ts
export type GravityModelProvider = {
  id: string;
  name: string;
  kind: "local" | "cloud" | "hybrid";
  chat: (input: GravityChatInput) => Promise<GravityChatOutput>;
  stream?: (input: GravityChatInput) => AsyncIterable<GravityModelToken>;
  embed?: (input: GravityEmbedInput) => Promise<GravityEmbedOutput>;
};
```

Initial provider:

```text
ollama.local
```

Future providers:

```text
openai.cloud
groq.cloud
gemini.cloud
anthropic.cloud
```

## Memory contract

Gravity needs shared memory rather than isolated module memory.

```ts
export type GravityMemoryProvider = {
  id: string;
  save: (entry: GravityMemoryEntry) => Promise<void>;
  search: (query: GravityMemoryQuery) => Promise<GravityMemoryResult[]>;
  forget: (query: GravityForgetRequest) => Promise<void>;
};
```

Memory entries should include:

- workspace id
- user id
- project id
- type
- source
- confidence
- timestamps
- privacy level
- linked audit events

## Module contract

Each imported system should register itself as a module.

```ts
export type GravityModule = {
  id: string;
  name: string;
  description: string;
  sourcePath: string;
  capabilities: GravityCapability[];
  tools?: GravityTool[];
  modelProviders?: GravityModelProvider[];
  memoryProviders?: GravityMemoryProvider[];
  uiSurfaces?: GravityUISurface[];
};
```

## Mode contract

Modes tell Grav what kind of operator it should become for a task.

```ts
export type GravityMode =
  | "personal"
  | "business"
  | "coding"
  | "system"
  | "memory"
  | "voice"
  | "defense"
  | "gateway"
  | "channel";
```

A request may activate multiple modes.

## Approval contract

Risky tools should produce approval requests before execution.

```ts
export type GravityApprovalRequest = {
  id: string;
  toolName: string;
  risk: GravityToolRisk;
  summary: string;
  reason: string;
  proposedInput: unknown;
  expiresAt?: string;
};
```

Examples that require approval:

- editing files
- installing packages
- deleting files
- pushing commits
- deploying
- sending emails
- running destructive shell commands
- scanning external systems beyond owned assets

## Audit contract

Gravity must create an audit event for every meaningful action.

```ts
export type GravityAuditEvent = {
  id: string;
  workspaceId: string;
  userId?: string;
  sessionId: string;
  mode: GravityMode[];
  eventType: string;
  summary: string;
  toolName?: string;
  moduleId?: string;
  risk?: GravityToolRisk;
  inputRedacted?: unknown;
  outputSummary?: string;
  createdAt: string;
};
```

## UI surface contract

Modules may expose UI surfaces, but Gravity owns the shell.

```ts
export type GravityUISurface = {
  id: string;
  moduleId: string;
  title: string;
  route: string;
  kind: "page" | "panel" | "widget" | "console";
  requiredMode?: GravityMode;
};
```

## Rule

Every module should eventually speak Gravity contracts.

Imported code can remain intact, but Gravity-owned adapters should translate module-specific behavior into these contracts.
