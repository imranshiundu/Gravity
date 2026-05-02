# 05 — Gravity Defense Blueprint

Defense Mode gives Grav the ability to inspect and harden owned systems, repositories, and websites.

It must be defensive, permissioned, and audit-friendly.

## One-line definition

**Gravity Defense is the safe security layer that helps users find, understand, and fix weaknesses in assets they own or are authorized to assess.**

## Source module

```text
modules/grav-security-odk
```

## Where it should live

Gravity-owned service:

```text
services/defense-service/
```

Core integration:

```text
services/grav-core/
```

Contracts:

```text
packages/grav-contracts/src/tool.ts
packages/grav-contracts/src/audit.ts
```

## Where it fits

```text
User: "Check if my repo is secure"
  ↓
Gravity Core
  ↓
Defense Mode
  ↓
defense-service
  ├─ dependency scan
  ├─ secret scan
  ├─ config scan
  ├─ headers check
  ├─ SSL/TLS check
  ├─ hardening report
  └─ remediation plan
```

## Defensive scope

Allowed:

- scan owned repos
- detect leaked secrets
- check dependencies
- review security headers
- check SSL/TLS configuration
- inspect Docker/Nginx/config files
- generate hardening reports
- explain risks plainly
- suggest safe fixes

Disallowed:

- attacking third-party systems
- credential attacks
- stealth scanning
- exploit chaining
- persistence
- malware
- bypassing authentication
- destructive payloads

## Features

### 1. Repository security scan

Checks:

- dependency risks
- exposed secrets
- risky scripts
- unsafe config
- missing environment guidance
- weak CORS settings
- insecure defaults

### 2. Website security posture

Checks owned domains for:

- HTTPS
- TLS issues
- security headers
- redirect behavior
- exposed server information
- basic misconfiguration signs

### 3. Secret detection

Searches for:

- `.env` leaks
- API keys
- tokens
- private keys
- passwords
- credentials in code

Secrets should be redacted in output.

### 4. Dependency checks

Finds:

- outdated packages
- known vulnerable dependencies when databases/tools are available
- risky package scripts
- abandoned packages

### 5. Config hardening

Reviews:

- Nginx configs
- Docker files
- GitHub Actions
- package scripts
- environment examples
- server configs

### 6. Plain-English report

Defense Mode should explain:

```text
What was found
Why it matters
How severe it is
How to fix it
Whether approval is needed to apply the fix
```

## Tool registry

```text
defense.scanRepo
defense.scanSecrets
defense.scanDependencies
defense.scanHeaders
defense.scanTLS
defense.reviewConfig
defense.generateReport
defense.planHardening
defense.verifyFix
```

## Service structure

```text
services/defense-service/
├─ src/
│  ├─ index.ts
│  ├─ repo-scan.ts
│  ├─ secrets.ts
│  ├─ dependencies.ts
│  ├─ headers.ts
│  ├─ tls.ts
│  ├─ config-review.ts
│  ├─ report.ts
│  ├─ safety.ts
│  └─ adapters/
│     └─ open-defense-kit.ts
└─ README.md
```

## Risk model

| Action | Risk | Approval |
| --- | --- | --- |
| scan local repo | safe | no |
| scan dependencies | safe/medium | no/maybe |
| check owned website headers | safe | no |
| active external scan | medium/dangerous | yes |
| change config | dangerous | yes |
| exploit target | disallowed | never |

## How Grav should behave

Grav should frame Defense Mode professionally.

Good:

```text
I can run a defensive check on your owned repo and produce a hardening report.
```

Bad:

```text
I can hack sites for you.
```

## Business value

Defense Mode can become a paid feature:

- website security check reports
- repo hardening reports
- launch-readiness checks
- client trust reports
- developer security reviews

## Acceptance tests

Defense Mode is working when:

- Grav scans an owned repo safely,
- secrets are redacted,
- findings are severity-ranked,
- fixes are explained clearly,
- dangerous changes require approval,
- disallowed offensive actions are refused,
- audit logs capture the scan and result.

## Final blueprint

```text
Defense Mode = owned-asset security checks + remediation + audit + strict boundaries.
```
