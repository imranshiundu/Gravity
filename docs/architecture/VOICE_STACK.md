# Voice Stack

Voice is both frontend and backend.

## Frontend voice surfaces

- `apps/voice-console`
- `apps/voice-realtime-agents`

These are interfaces, not engines.

## Backend voice capability

- `modules/voice`

This is the speech and voice model side.

## Correct Gravity split

- interfaces go in `apps/`
- voice engines and adapters stay in `modules/`
- future orchestration belongs in `services/voice-service`

## Practical rule

Voice should not be treated as only a frontend and not only a backend.

It is a stack:

- capture and playback UI
- realtime session control
- transcript flow
- approval flow
- speech models
- memory integration
- fallback to text interfaces

## Backup expectation

Voice should degrade safely:

- if realtime fails, fall back to text
- if speech generation fails, preserve transcript
- if the frontend fails, the web and CLI surfaces still work
