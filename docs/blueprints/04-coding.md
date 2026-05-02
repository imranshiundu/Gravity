# 04 — Gravity Coding Blueprint

Coding Mode gives Grav hands inside software projects.

It should let Grav inspect repositories, understand code, propose patches, run tests, prepare commits, and document systems without becoming reckless.

## One-line definition

**Gravity Coding is the controlled software-engineering layer that lets Grav work on repositories through safe tools, approvals, memory, and audit logs.**

## Source modules

```text
modules/grav-dev-claw
modules/grav-dev-openhands
modules/grav-dev-aider
modules/grav-core-claude-src
modules/grav-agents-openai-sdk
```

Each module provides useful patterns, but Gravity should expose coding capability through one Gravity-owned service.

## Where it should live

Gravity-owned service:

```text
services/code-service/
```

Core integration:

```text
services/grav-core/
```

Contracts:

```text
packages/grav-contracts/src/tool.ts
```

## Where it fits

```text
User: "Fix this repo"
  ↓
Grav
  ↓
Gravity Core
  ↓
Coding Mode
  ↓
code-service
  ├─ repo scanner
  ├─ file reader
  ├─ patch planner
  ├─ file editor
  ├─ test runner
  ├─ git helper
  └─ audit logger
```

## Main features

### 1. Repo scanning

Grav should inspect:

- folder structure
- package managers
- languages
- frameworks
- entrypoints
- scripts
- tests
- docs
- config files
- risky files

Output:

```text
repo summary
architecture map
detected stack
missing docs
likely build commands
next actions
```

### 2. File reading

Grav can read files relevant to a task.

Rules:

- prefer targeted reads
- avoid reading secrets
- summarize large files
- track files read in audit logs

### 3. Patch planning

Before editing, Grav should prepare a patch plan.

Example:

```text
Plan:
1. Update README architecture section
2. Add missing service contract docs
3. Do not touch UI
4. Run markdown checks if available
```

### 4. File editing

File editing is medium-risk and sometimes dangerous.

Approval required when:

- many files change
- protected files change
- generated files change
- config changes affect deployment
- user specifically says be surgical

### 5. Test running

Grav should run safe test commands.

Examples:

```text
npm test
pnpm test
pytest
go test ./...
cargo test
```

Approval required for:

- package installation
- unknown scripts
- commands with network or destructive effects

### 6. Git workflows

Grav should support:

- branch creation
- diff summary
- commit preparation
- PR description
- conflict diagnosis
- safe merge guidance

Dangerous:

- pushing to main
- force pushing
- deleting branches
- rebasing shared branches

These require explicit approval.

### 7. Documentation generation

Coding Mode should create:

- README updates
- architecture docs
- module docs
- API docs
- setup docs
- troubleshooting docs
- changelogs

### 8. Repo memory

Grav should remember:

- architecture decisions
- known issues
- test commands
- safe commands
- previous fixes
- branch context
- deployment notes

## Coding tool registry

```text
code.scanRepo
code.readFile
code.searchRepo
code.planPatch
code.editFile
code.applyPatch
code.runTests
code.summarizeDiff
code.prepareCommit
code.preparePullRequest
code.explainError
code.generateDocs
```

## Coding Mode structure

```text
services/code-service/
├─ src/
│  ├─ index.ts
│  ├─ scan.ts
│  ├─ files.ts
│  ├─ search.ts
│  ├─ patch.ts
│  ├─ commands.ts
│  ├─ tests.ts
│  ├─ git.ts
│  ├─ docs.ts
│  ├─ safety.ts
│  └─ adapters/
│     ├─ claw.ts
│     ├─ openhands.ts
│     └─ aider.ts
└─ README.md
```

## Safety model

| Action | Risk | Approval |
| --- | --- | --- |
| scan repo | safe | no |
| read normal file | safe | no |
| read `.env` or secrets | dangerous | blocked or explicit approval with redaction |
| edit one doc file | medium | often yes |
| edit many source files | dangerous | yes |
| run tests | medium | maybe |
| install dependencies | dangerous | yes |
| delete files | dangerous | yes |
| push to main | dangerous | yes |

## How Grav should behave

Grav must be surgical.

Bad behavior:

```text
I rewrote the whole app and changed the UI without asking.
```

Correct behavior:

```text
I inspected the repo, found the missing docs, added only the requested blueprint files, and left existing module code untouched.
```

## Acceptance tests

Coding Mode is working when:

- Grav can scan a repo,
- Grav can explain the stack,
- Grav can propose a patch plan,
- Grav can edit approved files,
- Grav can run safe tests,
- Grav can summarize diffs,
- Grav records all actions in audit logs,
- Grav refuses or pauses for dangerous actions.

## Final blueprint

```text
Coding Mode = repo intelligence + safe editing + tests + git + docs + audit.
```
