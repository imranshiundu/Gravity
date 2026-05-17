# Core and Defense Module Bindings

Gravity treats `modules/core` and `modules/defense` as foundational module backends, not decoration.

This pass adds safe source-level bindings first. These tools inspect real module files and report missing folders honestly. They do not create fake runtimes.

## Exposed tools

```text
core.module.inventory
core.module.search
core.module.read

defense.inventory
defense.search
defense.read
defense.module.scan
```

The existing workspace-wide defensive scan remains:

```text
defense.scan
```

## Core module tools

### core.module.inventory

Inspects only:

```text
modules/core
```

Reports manifests, route hints, CLI/tooling signals, config files, docs, HTTP clients, warnings, and source state.

Example:

```json
{
  "toolName": "core.module.inventory",
  "input": {
    "includeRoutes": true,
    "includeFiles": false
  }
}
```

### core.module.search

Searches only inside `modules/core`.

```json
{
  "toolName": "core.module.search",
  "input": {
    "query": "contract",
    "limit": 10
  }
}
```

### core.module.read

Reads only small text/code files under `modules/core`.

```json
{
  "toolName": "core.module.read",
  "input": {
    "file": "modules/core/README.md"
  }
}
```

## Defense module tools

### defense.inventory

Inspects only:

```text
modules/defense
```

Reports scanner candidates, policy/config files, route hints, CLI/tooling signals, docs, warnings, and source state.

```json
{
  "toolName": "defense.inventory",
  "input": {
    "includeRoutes": true,
    "includeFiles": false
  }
}
```

### defense.search

Searches only inside `modules/defense`.

```json
{
  "toolName": "defense.search",
  "input": {
    "query": "scanner",
    "limit": 10
  }
}
```

### defense.read

Reads only small text/code files under `modules/defense`.

```json
{
  "toolName": "defense.read",
  "input": {
    "file": "modules/defense/README.md"
  }
}
```

### defense.module.scan

Runs the guarded defensive workspace scanner, then filters results to `modules/defense` only.

```json
{
  "toolName": "defense.module.scan",
  "input": {}
}
```

## Safety behavior

These tools require:

```bash
GRAVITY_ENABLE_LOCAL_TOOLS=true
GRAVITY_WORKSPACE_ROOT=/absolute/path/to/Gravity
```

or:

```bash
GRAVITY_REPO_ROOT=/absolute/path/to/Gravity
```

If local tools are disabled, Core returns `403`.

If a module folder is missing, inventory returns a missing source state. Gravity must display that honestly.

Read tools are scoped:

```text
core.module.read -> modules/core only
defense.read     -> modules/defense only
modules.read     -> any known module source path
```

No dangerous defense-changing action is connected in this pass. Any future mutation, policy update, firewall/proxy change, credential action, or automated remediation must be approval-gated after a reviewed module contract exists.
