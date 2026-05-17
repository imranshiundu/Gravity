# Ollama Module Bindings

Gravity treats `modules/ollama` plus `OLLAMA_BASE_URL` as the local model-provider boundary. This pass connects safe source inspection and constrained Ollama API proxy contracts without turning the provider into a broad `/api` proxy.

## Exposed tools

```text
ollama.inventory
ollama.contract
ollama.search
ollama.read
ollama.models
ollama.generate
ollama.chat
```

## Source-level tools

These tools inspect the real `modules/ollama` folder only.

```text
ollama.inventory -> inventory manifests, route hints, config, docs, CLI/tooling signals
ollama.search    -> search inside modules/ollama only
ollama.read      -> read small text/code files from modules/ollama only
ollama.contract  -> return reviewed Ollama provider contract and source inventory
```

Examples:

```json
{
  "toolName": "ollama.search",
  "input": {
    "query": "chat",
    "limit": 10
  }
}
```

```json
{
  "toolName": "ollama.read",
  "input": {
    "file": "modules/ollama/README.md"
  }
}
```

If `modules/ollama` is missing, inventory reports that state honestly.

## Service configuration

Ollama service tools require:

```bash
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

If the env is missing, Core returns `503` and does not fake model, chat, or generation responses.

## Reviewed route partitions

Model/read paths:

```text
/api/tags
/api/version
```

Generation paths:

```text
/api/generate
```

Chat paths:

```text
/api/chat
```

The old broad prefixes were removed:

```text
/
/api
/health
/status
```

This is intentional. Core must not treat `OLLAMA_BASE_URL` as a general-purpose provider proxy.

## Behavior

`ollama.models`:

```text
- safe service tool
- default path: /api/tags
- default method: GET
- allowed paths: /api/tags, /api/version
```

`ollama.generate`:

```text
- medium-risk service tool
- default path: /api/generate
- default method: POST
- allowed paths: /api/generate
```

`ollama.chat`:

```text
- medium-risk service tool
- default path: /api/chat
- default method: POST
- allowed paths: /api/chat
```

## Shared adapter guards

Core service adapter still rejects:

```text
- absolute URLs
- protocol-relative URLs
- path traversal
- paths outside the reviewed allowlist
```

Future expansion should come from discovered and reviewed source code under `modules/ollama` or from explicit Ollama API endpoints that Gravity intentionally supports.
