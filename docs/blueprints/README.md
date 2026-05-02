# Gravity Blueprints

This folder is the canonical product documentation path for Gravity.

The build order is:

```text
Core → Ollama → Memory → Coding → Defense → Gateway → UI → Channels → Voice → Business Operator
```

## Blueprint order

1. [Core](01-core.md)
2. [Ollama Runtime](02-ollama.md)
3. [Memory](03-memory.md)
4. [Coding](04-coding.md)
5. [Defense](05-defense.md)
6. [Gateway](06-gateway.md)
7. [UI](07-ui.md)
8. [Channels](08-channels.md)
9. [Voice](09-voice.md)
10. [Business Operator](10-business-operator.md)

## Source of truth rule

These blueprint files are the Gravity-level source of truth.

Module-level READMEs should be treated as upstream reference material, not as final Gravity product documentation.

Do not delete upstream READMEs until their license, setup, attribution, and module-specific instructions have been safely migrated. Many imported projects contain legal, install, and operational information that Gravity may still need.

## Documentation style

Each blueprint should explain:

- what the part is,
- why it exists,
- where it lives,
- how it works,
- what features it provides,
- how Grav uses it,
- how it connects to other modules,
- safety boundaries,
- build phases,
- and acceptance tests.
