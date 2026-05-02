# CLI Stack

Gravity already has a large CLI foundation inside `modules/core`.

## Current source areas

- `modules/core/cli`
- `modules/core/commands`
- `modules/core/main.tsx`

## What this means

The CLI is not a side feature. It is one of Gravity's core interfaces.

It already contains patterns for:

- command routing
- remote I/O
- structured output
- transport layers
- bridge flows
- memory commands
- model commands
- plugin commands
- permissions and review flows

## Gravity direction

- keep the deep CLI capability in `modules/core`
- expose Gravity-owned command contracts on top of it
- align CLI feature access with the same backend services used by `apps/web`

## CLI requirement

If a feature exists for the web app, we should ask whether a CLI equivalent is also needed.
