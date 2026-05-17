# Channels Module Bindings

Gravity treats `modules/channels` as the external communications boundary module. This binding pass connects safe source inspection and service proxy contracts without turning Channels into a fake messaging system or an open outbound proxy.

## Exposed tools

```text
channels.inventory
channels.contract
channels.search
channels.read
channels.inbox
channels.send
```

## Source-level tools

These tools inspect the real `modules/channels` folder only.

```text
channels.inventory -> inventory manifests, route hints, config, docs, CLI/tooling signals
channels.search    -> search inside modules/channels only
channels.read      -> read small text/code files from modules/channels only
channels.contract  -> return reviewed channels service contract and source inventory
```

Examples:

```json
{
  "toolName": "channels.search",
  "input": {
    "query": "inbox",
    "limit": 10
  }
}
```

```json
{
  "toolName": "channels.read",
  "input": {
    "file": "modules/channels/README.md"
  }
}
```

If `modules/channels` is missing, inventory reports that state honestly.

## Service configuration

Channel service tools require:

```bash
GRAVITY_CHANNELS_BASE_URL=http://127.0.0.1:<channels-port>
```

If the env is missing, Core returns `503` and does not fake an inbox/send result.

## Read/send route partition

Read-only paths:

```text
/health
/status
/providers
/plugins
/inbox
```

Outbound / delivery paths:

```text
/send
/webhook
```

The old broad prefixes were removed:

```text
/
/api
```

This is intentional. Core must not treat `GRAVITY_CHANNELS_BASE_URL` as a general-purpose open communications proxy.

## Behavior

`channels.inbox`:

```text
- safe/read-only tool
- forces GET semantics
- uses reviewed read-only paths only
- default path: /inbox
```

`channels.send`:

```text
- medium-risk tool
- requires operator approval
- uses reviewed send paths only
- default path: /send
```

## Shared adapter guards

Core service adapter still rejects:

```text
- absolute URLs
- protocol-relative URLs
- path traversal
- paths outside the reviewed allowlist
```

Future expansion should come from discovered and reviewed routes inside `modules/channels`, not guessing broad service paths.
