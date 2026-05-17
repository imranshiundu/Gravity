# Gateway Module Bindings

Gravity treats `modules/gateway` as the traffic boundary module. This pass binds it more deeply into Core without pretending a full gateway runtime exists when the source folder or service is missing.

## Exposed tools

```text
gateway.inventory
gateway.contract
gateway.search
gateway.read
gateway.status
gateway.proxy
```

## Source-level tools

These tools inspect the real `modules/gateway` folder.

```text
gateway.inventory -> inventory manifests, route hints, config, docs, CLI/tooling signals
gateway.search    -> search inside modules/gateway only
gateway.read      -> read small text/code files from modules/gateway only
gateway.contract  -> return reviewed gateway service contract and source inventory
```

Examples:

```json
{
  "toolName": "gateway.search",
  "input": {
    "query": "proxy",
    "limit": 10
  }
}
```

```json
{
  "toolName": "gateway.read",
  "input": {
    "file": "modules/gateway/README.md"
  }
}
```

If `modules/gateway` is missing, inventory reports the missing source state honestly.

## Service tools

Gateway service tools require:

```bash
GRAVITY_GATEWAY_BASE_URL=http://127.0.0.1:<gateway-port>
```

`gateway.status` is read-only and defaults to:

```text
/status
```

`gateway.proxy` is approval-gated and defaults to:

```text
/proxy
```

## Reviewed route allowlist

The gateway adapter now allows only reviewed prefixes:

```text
/health
/status
/routes
/proxy
```

The old broad prefixes were removed:

```text
/
/api
```

This is intentional. Core should not become a general-purpose open proxy just because `GRAVITY_GATEWAY_BASE_URL` exists.

## Safety behavior

Core service adapter checks still apply:

```text
- paths must start with /
- protocol-relative paths are rejected
- absolute URLs are rejected
- path traversal is rejected
- non-allowlisted gateway paths are rejected
- gateway.proxy requires operator approval
```

Future expansion must be based on reviewed module routes discovered in `modules/gateway`, not broad guessing.
