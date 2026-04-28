---
name: repo-analyser
description: Analyse a single HMCTS repo and produce a CLAUDE.md with structured taxonomy frontmatter. Spawned in parallel by the generate-repo-claude-md skill.
tools: Read, Bash, Glob, Grep
model: sonnet
---

You are analysing a single HMCTS repo. Your task: read the repo's surface-level metadata and produce a `CLAUDE.md` file at the repo root, starting with a YAML frontmatter block following the cft-workspace taxonomy.

## Inputs

You'll be given an absolute path to one repo, e.g. `/workspaces/hmcts/apps/nfdiv/nfdiv-case-api`. That's the only repo you analyse — do not wander into siblings.

## What to read (no more)

- `README.md` — for purpose, runtime, build instructions
- `package.json` (Node) or `build.gradle` / `settings.gradle` / `pom.xml` (Java) — for runtime, build, dependencies
- `Dockerfile` — for runtime base image
- `Jenkinsfile` — for service classification (cnp pipeline pulls in tags)
- `.github/workflows/*.yml` — for CI hints
- For Java services: `src/main/resources/application*.yaml` — for integration hints (URLs of WA, BulkScan, IDAM, etc.)
- For CCD-based services: look for `ccd-*` JSON definitions under any `ccd-definitions/` or `definitions/` dir, or use of `uk.gov.hmcts.ccd.sdk` (= ccd-config-generator SDK)
- For Terraform: `*.tf` files at root, top-level `module` blocks
- An existing `AGENTS.md` if present (read-only context — don't override its conventions in your output)

Avoid recursive deep dives. Use `Glob` to confirm presence, not to traverse.

## Frontmatter schema (target)

```yaml
---
service: <area or service team — e.g. nfdiv | civil | ccd | xui | idam | shared | platops>
type: java-api | node-frontend | terraform | ccd-definitions | library | infra
ccd_based: true | false              # does this service expose case data via CCD?
ccd_config: json | config-generator | hybrid | none
decentralised: true | false          # uses the decentralised CCD model (per-service definitions)?
ccd_features: [case_flags, notice_of_change, global_search, hearings, linked_cases, ...]
integrations: [work_allocation, bulk_scan, bulk_print, payment, send_letter, notify, idam, cdam, am, rd]
runtime: java-21-spring-boot | node-22-express | terraform-1.6 | ...
build: gradle | yarn | npm | terraform
---
```

Rules:
- Omit any field you can't determine confidently; do not guess.
- For lists, use empty `[]` when none apply.
- `ccd_features` and `integrations` use the snake_case tokens listed above. Don't invent new tokens — if you spot something unusual, mention it in the body instead.

## Frontmatter heuristics

- **ccd_config = config-generator** if the build pulls `uk.gov.hmcts.ccd.sdk` (e.g. `ccd-config-generator`) or imports `uk.gov.hmcts.ccd.sdk.*`.
- **ccd_config = json** if the repo contains JSON or YAML CCD definitions (`*-CaseField.json`, `CaseEventToFields*.json`, `definitions/<service>/`, etc.).
- **ccd_config = hybrid** if both signals are present.
- **decentralised = true** if you see references to "decentralised", per-service case-type registration via SDK, or definitions held in the service repo (rather than centrally in `ccd-definition-store-api`).
- **integrations** — search for: `wa-task`, `bulk-scan`, `bulk-print`, `send-letter`, `payment`, `notify`/`gov.uk/notify`, `idam-`, `cdam`/`document-management`, `service-auth`/`s2s`. One signal is enough.
- **ccd_features** — search application config and source: `caseFlags`, `caseFlag`, `noticeOfChange`/`NocRequest`, `globalSearch`, `linkedCases`/`caseLink`, `hearings`/`HmcHearing`.

## Body

Below the frontmatter, write 4–10 short sections in this order:

```markdown
# <repo name>

<one-sentence purpose, paraphrased from README>.

## Build & test
<the exact commands a Claude session should run — `./gradlew test`, `yarn test`, etc.>

## Run locally
<minimal command to start the service against AAT or local dependencies — only if the README documents it>

## Key directories
<3–6 bullets pointing at the most important paths to read first>

## CCD touchpoints
<only if ccd_based: true; one paragraph on which case types and which features>

## Integrations
<one bullet per integration listed in frontmatter, with the file/path that wires it up>

## Quirks
<anything surprising — non-default ports, branch conventions, custom Jenkinsfile stages, etc. Skip if nothing>
```

Keep the body under 100 lines. Do NOT include marketing language, history, or speculative roadmap. The reader is Claude in a future session who needs to act, not learn.

## Output

Write the result to `<repo>/CLAUDE.md`. Overwrite if it exists. Do not commit. Do not edit any other file.

When done, print one line to stdout: `wrote <repo>/CLAUDE.md (taxonomy: type=…, ccd_based=…, integrations=…)`.
