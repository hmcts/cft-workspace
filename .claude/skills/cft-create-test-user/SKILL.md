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

### 3. Use `scripts/idam-test-user` — don't hand-assemble curl

**This is the default path for users/roles.** The workspace ships a wrapper that already encodes
the gotchas (scope check, RD's email-domain validation, role prerequisite, correct exit codes,
per-env cleanup warning). Reassembling curl by hand is how those get lost.

```bash
./scripts/idam-test-user --help
```

| Need | Command |
|---|---|
| one-off login | `idam-test-user user -p <product> --client-id <id> -r citizen` |
| fixture at a stable UUID (idempotent) | `idam-test-user fixture … --id <uuid>` |
| caseworker/judicial visible to Reference Data | `idam-test-user cft-user … -r caseworker` |
| create a role first | `idam-test-user role … -r <role-name>` |
| prove the account works | `idam-test-user login … --email <addr>` |
| read the activation email | `idam-test-user notification … --email <addr>` |
| throwaway, no auth | `idam-test-user burner -r citizen` |
| just a token | `idam-test-user token -p <product> --client-id <id>` |

`-e demo` switches environment. `--json` gives clean stdout for piping into other tooling.

It auto-detects the Key Vault secret name, so usually only `-p` and `--client-id` are needed.
Find `--client-id` from the product's config if you don't know it:

```bash
./scripts/grep -n "client_id\|idam-secret\|IDAM_CLIENT" apps/<product>/<repo>/ | head -20
```

If auto-detection reports several candidate secrets, it lists them and asks for `--secret-name`
— pass the right one rather than guessing.

**Never carry one product's `--client-id` / vault / secret name over to another product.** Resolve
them for the product actually in question.

Also check whether the product already has its own script — if so, mention it, since it may
encode team-specific conventions the generic wrapper doesn't:

```bash
./scripts/grep -l "test/idam/users" apps/<product>/
```

### 4. Fall back to raw curl only when the wrapper doesn't fit

Reach for `docs/how-to/create-idam-test-users.md` and hand-rolled curl only when the user
explicitly wants the underlying calls, needs an endpoint the wrapper doesn't cover, or is
scripting inside their own repo where a workspace script isn't available.

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

1. **Is the caller's microservice on both allowlists?** Check **flux**, not the app's
   `application.yaml` — the compiled-in default is much shorter than what's actually deployed:
   ```bash
   grep -n "S2S_AUTHORISED" platops/cnp-flux-config/apps/rd/rd-professional-api/aat.yaml
   grep -n "S2S_AUTHORISED" platops/cnp-flux-config/apps/rd/rd-user-profile-api/aat.yaml
   ```
   PRD's list governs **create**; `rd-user-profile-api`'s much shorter list governs **approve**,
   because approval makes PRD call it for the superUser profile. Most service-team microservices
   are on the first but not the second.

2. **Do they have a `prd-admin` user?** Approval is `@Secured("prd-admin")`. Create one via step 3
   (`-r prd-admin`, and use an `@justice.gov.uk` address) — the AAT cleanup applies to it too.

**Set expectations before they start:** creating a `PENDING` org via the API works, but approving
it usually returns `403` with a misleading "Bearer token is expired" message. Tell them upfront and
recommend create-via-API, approve-via-UI. Full diagnosis in the how-to.

Always mention: new orgs are `PENDING` and their users can do nothing until approved; PRD creates
the superUser's IDAM account itself (invitation email, not a chosen password); PBA numbers must be
randomised (globally unique); and **a `400` may still have created the org**, so never blind-retry
a failed create.

Organisations have no automatic expiry, but `prd-admin` **can** delete them while `PENDING` —
offer to clean up afterwards rather than leaving litter in a shared environment.

If the user only needs to *read* org data in a test, raise stubbing as the cheaper option
(`apps/civil/civil-ccd-definition/e2e/helpers/activeOrganisationUsers.js` swaps wiremock response
files per user) before walking them through creating a real org.

### 6. Run it, or say why you didn't

`scripts/idam-test-user` is safe to run for the user — it's read-only against Azure apart from
creating the test data they asked for, and AAT self-cleans. Offer to run it and report the created
email / id / password, rather than only printing a command.

Two cases to check first: `az account show` must succeed, and for a **demo** target say so
explicitly before creating, since demo data persists ~90 days.

If they'll repeat this inside their own repo, offer a script in that repo's `bin/` — modelled on
`apps/finrem/finrem-ccd-definitions/create_idam_id_scripts/caseworker.sh` for batch reseeds at
fixed UUIDs. That's a clone-local change belonging in the repo's own history, never in a
workspace-repo commit.

## Don't

- Don't hand-assemble curl when `scripts/idam-test-user` covers the case.
- Don't hand over the legacy `POST /testing-support/accounts` on `idam-api` for new work. It's
  proxied in AAT but not preview, and takes a different payload shape (`roles: [{code}]`).
- Don't promise an AAT user will still exist tomorrow.
- Don't invent Key Vault secret names — let the script auto-detect, or list the vault.
- Don't offer to run `az keyvault secret show` against a vault the user hasn't mentioned working
  in without saying which vault you're reading.
- Don't use `@mailnesia.com` with `cft-user` — RD rejects it.
- Don't create real organisations when the test only reads org data.
- Don't retry a failed org create without checking whether it was created anyway.
