# Gravity Apps

`apps/` holds the interfaces.

Current app surfaces:

- `apps/web` is the primary Gravity UI and the only intended day-to-day interface
- `apps/voice-console` is a voice testing surface that should eventually plug into Gravity endpoints
- `apps/voice-realtime-agents` is a realtime voice prototype app that should also route through Gravity endpoints

Embedded UI sources still exist inside some backend modules, but they are reference material, not primary products:

- `modules/channels/dashboard`
- `modules/coding-openhands/frontend`
- `modules/coding-openhands/openhands-ui`
- `modules/defense/odk-web/frontend`
- `modules/ollama/app/ui`

Gravity direction:

- one main UI shell in `apps/web`
- backend capabilities in `modules/`
- Gravity-owned endpoints between the UI and the engines
