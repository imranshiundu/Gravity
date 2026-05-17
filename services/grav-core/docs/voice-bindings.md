# Voice Module Bindings

Gravity treats `modules/voice` as the realtime voice boundary module. This pass connects safe source inspection and constrained service proxy contracts without pretending a full voice runtime exists when the source folder or service is missing.

## Exposed tools

```text
voice.inventory
voice.contract
voice.search
voice.read
voice.session
voice.tts
voice.stt
```

## Source-level tools

These tools inspect the real `modules/voice` folder only.

```text
voice.inventory -> inventory manifests, route hints, config, docs, CLI/tooling signals
voice.search    -> search inside modules/voice only
voice.read      -> read small text/code files from modules/voice only
voice.contract  -> return reviewed voice service contract and source inventory
```

Examples:

```json
{
  "toolName": "voice.search",
  "input": {
    "query": "session",
    "limit": 10
  }
}
```

```json
{
  "toolName": "voice.read",
  "input": {
    "file": "modules/voice/README.md"
  }
}
```

If `modules/voice` is missing, inventory reports that state honestly.

## Service configuration

Voice service tools require:

```bash
GRAVITY_VOICE_BASE_URL=http://127.0.0.1:<voice-port>
```

If the env is missing, Core returns `503` and does not fake a voice session, TTS, or STT result.

## Reviewed route partitions

Read/probe paths:

```text
/health
/status
/models
```

Session paths:

```text
/session
/sessions
```

TTS paths:

```text
/tts
```

STT paths:

```text
/stt
```

The old broad prefixes were removed:

```text
/
/api
```

This is intentional. Core must not treat `GRAVITY_VOICE_BASE_URL` as a general-purpose open proxy.

## Behavior

`voice.session`:

```text
- medium-risk service tool
- default path: /session
- default method: POST
- allowed paths: /session, /sessions
```

`voice.tts`:

```text
- medium-risk service tool
- default path: /tts
- default method: POST
- allowed paths: /tts
```

`voice.stt`:

```text
- medium-risk service tool
- default path: /stt
- default method: POST
- allowed paths: /stt
```

## Shared adapter guards

Core service adapter still rejects:

```text
- absolute URLs
- protocol-relative URLs
- path traversal
- paths outside the reviewed allowlist
```

Future expansion should come from discovered and reviewed routes inside `modules/voice`, not guessed broad service paths.
