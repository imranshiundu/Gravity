# 09 — Gravity Voice Blueprint

Voice Mode lets users speak with Grav instead of only typing.

It should support personal voice control, coding help, business receptionist flows, call summaries, and live operator experiences.

## One-line definition

**Gravity Voice is the speech and realtime interaction layer that lets Grav listen, speak, remember sessions, and run approved workflows through voice.**

## Source surfaces

```text
modules/voice-vibevoice
apps/voice-realtime-agents
apps/voice-console
```

## Where it should live

Gravity-owned service:

```text
services/voice-service/
```

UI app:

```text
apps/voice-console/
```

## Where it fits

```text
Microphone
  ↓
Voice Service
  ├─ speech-to-text
  ├─ realtime session manager
  ├─ tool approval bridge
  ├─ text-to-speech
  └─ call/session memory
  ↓
Gravity Core
  ↓
Grav response
  ↓
Speaker
```

## Voice modes

### 1. Voice Lite

Local or mostly local voice.

Use:

- local STT if available
- local TTS if available
- Ollama for reasoning

Goal:

```text
API-key-light or API-key-free voice where possible.
```

### 2. Voice Pro

Realtime cloud voice where configured.

Use:

- realtime voice APIs
- lower latency
- better turn-taking
- business receptionist experience

### 3. Voice Console

Developer/admin testing surface.

Use:

- inspect events
- test prompts
- test tools
- debug call flow
- view transcripts

## Main features

### 1. Speech-to-text

Turns user speech into text for Gravity Core.

### 2. Text-to-speech

Turns Grav's response into audio.

### 3. Realtime sessions

Keeps live conversation state.

Includes:

- active speaker
- partial transcripts
- interruptions
- tool-call pauses
- approval prompts

### 4. Voice memory

Voice sessions should be summarized into memory.

Example:

```text
Call summary:
- User asked about Gravity Core
- Decision: build services/grav-core first
- Next step: implement contracts
```

### 5. Voice approvals

Dangerous actions must still require approval.

Example:

```text
Grav: "This will edit three files. Say 'approve edit' to continue or 'cancel' to stop."
```

### 6. Business receptionist

Voice can become a paid business feature.

Use cases:

- answer customer calls
- collect booking details
- qualify leads
- summarize calls
- escalate urgent cases
- create follow-up tasks

## Service structure

```text
services/voice-service/
├─ src/
│  ├─ index.ts
│  ├─ session.ts
│  ├─ stt.ts
│  ├─ tts.ts
│  ├─ realtime.ts
│  ├─ transcript.ts
│  ├─ approval-bridge.ts
│  ├─ memory.ts
│  └─ adapters/
│     ├─ vibevoice.ts
│     ├─ realtime-agents.ts
│     └─ local.ts
└─ README.md
```

## UI ideas

Voice UI should show:

- microphone status
- waveform
- transcript
- active mode
- tool calls
- approval prompt
- memory summary
- call end report

## Safety boundaries

Voice must not bypass permissions.

Rules:

- voice commands follow same permission engine as text
- destructive actions require explicit confirmation
- call recordings/transcripts require privacy handling
- customer voice data must be protected
- public voice agents should have restricted tools

## Acceptance tests

Voice Mode is working when:

- user can speak to Grav,
- speech becomes text,
- Gravity Core handles the request,
- Grav can speak back,
- transcripts are stored or summarized according to settings,
- dangerous actions pause for approval,
- Voice Mode can run without breaking text mode.

## Final blueprint

```text
Voice = speech interface + realtime state + transcript memory + Core-controlled tools.
```
