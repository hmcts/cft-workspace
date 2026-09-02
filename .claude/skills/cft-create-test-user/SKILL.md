---
name: cft-create-test-user
description: Create IDAM test users, roles, OAuth clients, or professional organisations in a non-production CFT environment (AAT, demo, ithc, perftest). Produces the exact curl/script for the user's service and environment, and warns about the AAT 3-hour cleanup. Use when the user asks "create a test user in AAT", "how do I make a caseworker for demo", "I need a solicitor with an org", "set up test users for <service>".
---

# Create CFT test data

Create IDAM users / roles / OAuth clients, or professional organisations, in a non-prod
environment — and emit a working command or script for the user's specific service and env.

The authoritative recipes are:

- [`docs/how-to/create-idam-test-users.md`](../../../docs/how-to/create-idam-test-users.md)
- [`docs/how-to/create-test-organisations.md`](../../../docs/how-to/create-test-organisations.md)
- [`docs/reference/idam-testing-support-api.md`](../../../docs/reference/idam-testing-support-api.md)

**Read the relevant page before answering.** This skill routes and parameterises; the pages hold
the detail. Don't reproduce their content from memory.

## When to use

- "Create a citizen user in AAT"
- "I need a caseworker test user for <product> in demo"
- "Make me a solicitor with an organisation"
- "How do I create test users for <service>?"
- "Set up an IDAM role called X"

## When NOT to use

- **Local / cftlib development** — the IDAM simulator (`libs/rse-idam-simulator`) or the cftlib
  stack seeds users itself. No testing-support API involved. Say so and stop.
- **Production** — this API isn't deployed to prod, and creating prod users isn't a thing you do.
  Refuse and point at the real access-request process.
- Conceptual questions about IDAM — `/cft-explain idam`.
- Debugging an existing token — that's not this.

## Inputs

`$ARGUMENTS` is free text. Extract what's there and infer the rest:

| Input | Default if unstated |
|---|---|
| environment | **ask** if the answer changes cleanup behaviour (see below); else `aat` |
| roles | ask — there is no safe default |
| service / product (for the Key Vault + IDAM client) | infer from cwd if inside a clone, else ask |
| email | generate `<purpose>-<uuid>@mailnesia.com` |
| user vs org | user, unless the request mentions organisation / solicitor / PBA / superUser |

## Procedure

### 1. Decide user vs organisation

Organisation-shaped signals: "organisation", "org", "solicitor firm", "superUser", "PBA",
"professional user". These need the **PRD flow**, which is completely different — jump to step 5.

A request for a *solicitor user* is ambiguous: a solicitor with PUI roles but no organisation is
just an IDAM user, and is fine for many journeys. A solicitor who must appear in an org's user
list needs the PRD flow. Ask which they need if it isn't clear.

### 2. Warn about environment cleanup — do this early, not as a footnote

This is the single most useful thing this skill does. Before writing any command:

- **AAT** — `CLEANUP_SESSION_LIFESPAN: 3h`. The user is deleted after ~3 hours.
- **demo** — `90d`. Effectively persistent.

So: if the user says anything implying persistence ("a test account for the team", "for
demo day", "a fixture", "so QA can log in tomorrow"), **tell them AAT will delete it** and
recommend demo or a reseed script. If they want a throwaway login for a test run, AAT is right.

Verify the current values rather than trusting these numbers:

```bash
grep -n "CLEANUP" platops/cnp-flux-config/apps/idam/idam-testing-support-api/{aat,demo}.yaml
```

### 3. Find the service's IDAM client and secret

The token needs an IDAM client. Look in the service's own scripts first — several products
already have one, and reusing theirs beats inventing a new call:

```bash
./scripts/grep -l "test/idam/users"                 # any product's existing script
./scripts/grep -l "test/idam/users" apps/<product>/ # just theirs
```

If the target product already has one, **point the user at it** instead of writing a new one —
that's the best outcome. If it doesn't, another product's script is a template, not something to
run as-is: its client ID, vault, and secret names are all product-specific.

Never carry one product's `CLIENT_ID` / vault / secret name over into another product's commands.
Resolve them for the product actually in question.

Otherwise find the client ID and secret name:

```bash
./scripts/grep -n "client_id\|idam-secret\|IDAM_CLIENT" apps/<product>/<repo>/ | head -20
az keyvault secret list --vault-name "<product>-<env>" -o table | grep -i idam
```

Secret naming isn't uniform — `<service>-idam-secret`, `idam-secret`, and
`<service>-idam-client-secret` all occur. Don't guess; list the vault or read the service's
Jenkinsfile/chart.

### 4. Emit the commands (users)

Follow `docs/how-to/create-idam-test-users.md`. Pick the right endpoint for the job:

| Need | Endpoint |
|---|---|
| one-off login | `POST /test/idam/users` |
| repeatable fixture at a stable UUID | `PUT /test/idam/users/{userId}` |
| caseworker/judicial visible to Reference Data | `PUT /test/cft/users/{userId}` |
| throwaway, no auth available | `POST /test/idam/burner/users` (15 min) |
| a role that doesn't exist yet | `POST /test/idam/roles` first |

Emit real values, not placeholders — substitute the env, client ID, vault name, roles, and a
generated email/UUID so the user can paste and run it.

Flag the `roleNames` prerequisite: roles must already exist in IDAM, or creation fails.

If the request implies RD visibility (roles matching `caseworker-.*`, `cwd-user`, `judiciary`,
`pui-.*`, `solicitor`), prefer `PUT /test/cft/users/{userId}` and say why — a bare IDAM user is
invisible to `rd-user-profile-api`, which breaks most caseworker journeys.

### 5. Organisations (PRD flow)

Follow `docs/how-to/create-test-organisations.md`. Two things to establish before writing anything:

1. **Is the caller's microservice on PRD's S2S allowlist?**
   ```bash
   grep -n "PRD_S2S_AUTHORISED_SERVICES" apps/rd/rd-professional-api/src/main/resources/application.yaml
   ```
   If not, the API route needs a PRD change. **Recommend the UI route instead** — it's genuinely
   faster for one org and avoids the allowlist entirely.

2. **Do they have a `prd-admin` user?** Approval to `ACTIVE` is `@Secured("prd-admin")`. If not,
   they need to create one first via step 4 — which means the AAT cleanup applies to that admin
   user too.

Always mention: new orgs are `PENDING` and their users can do nothing until approved; PRD creates
the superUser's IDAM account itself (invitation email, not a chosen password); and **organisations
are never cleaned up**, so name them recognisably.

If the user only needs to *read* org data in a test, raise stubbing as the cheaper option
(`apps/civil/civil-ccd-definition/e2e/helpers/activeOrganisationUsers.js` swaps wiremock response
files per user) before walking them through creating a real org.

### 6. Offer to script it, don't just narrate

If this looks like something they'll repeat, offer to write it into their repo's `bin/` — modelled
on `apps/pcs/pcs-frontend/bin/dev/createIdamUser.sh` for a single user, or
`apps/finrem/finrem-ccd-definitions/create_idam_id_scripts/caseworker.sh` for a batch reseed at
fixed UUIDs.

A script in the service's own repo is a clone-local change — it belongs in that repo's history,
never in a workspace-repo commit.

## Don't

- Don't hand over the legacy `POST /testing-support/accounts` on `idam-api` for new work. It's
  proxied in AAT but not preview, and takes a different payload shape (`roles: [{code}]`).
- Don't promise an AAT user will still exist tomorrow.
- Don't invent Key Vault secret names — list the vault.
- Don't offer to run `az keyvault secret show` against a vault the user hasn't mentioned working
  in without saying which vault you're reading.
- Don't create real organisations when the test only reads org data.
