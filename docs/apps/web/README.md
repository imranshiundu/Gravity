# Gravity Web

- source path: `apps/web`
- role: primary Gravity interface
- current foundation: Ash-derived Next.js shell being rewritten into a Gravity-owned workspace
- endpoint rule: this app should reach backend capability through Gravity-owned `/api/*` routes

## Current state

- `apps/web` is the main daily interface for Grav
- the assistant route is already bridged to Ollama through Gravity endpoints
- parts of the imported Ash workspace still carry legacy ticketing and customer-success flows

## Gravity target

This app should become the single web command center for:

- assistant chat
- runtime and model management
- memory browsing and recall
- coding actions and approvals
- defensive security workflows
- channels and plugin management
- business operator workflows
- system controls and policy settings

## Migration rule

- keep useful interaction patterns from Ash
- remove product identity that is not ours
- move module-specific UI ideas into Gravity routes and shared components
- avoid standing up separate dashboards when a Gravity surface can own the workflow
