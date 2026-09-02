---
name: cft-create-test-user
description: Create IDAM test users, roles or OAuth clients in a non-production CFT environment (AAT, demo, ithc, perftest). Use when the user asks "create a test user in AAT", "how do I make a caseworker for demo", "set up test users for <service>", "I need a citizen login".
---

# Create IDAM test data

Create users / roles / OAuth clients in a non-prod environment by driving
`scripts/idam-test-user`, which encodes the gotchas (token scope, RD's email-domain validation,
role prerequisites, per-environment cleanup).

For **organisations and their users**, use `/cft-manage-test-org` instead.

## When to use

- "Create a citizen user in AAT"
- "I need a caseworker test user for <product> in demo"
- "Set up an IDAM role called X"

## When NOT to use

- **Organisations, org users, or PUI roles** — `/cft-manage-test-org`.
- **Local / cftlib dev** — the IDAM simulator seeds its own users; no testing-support API involved.
- **Production** — not deployed there. Point at the real access-request process.

## Procedure

1. **Read the help** — it is the source of truth for flags and subcommands:
   ```bash
   ./scripts/idam-test-user --help
   ```

2. **Resolve `-p` (product) and `--client-id`.** The script auto-detects the Key Vault secret. If
   the product isn't obvious from the request or cwd, ask; don't reuse another product's values.
   ```bash
   ./scripts/grep -n "client_id\|idam-secret\|IDAM_CLIENT" apps/<product>/<repo>/ | head -20
   ```

3. **State the cleanup consequence before creating anything.** AAT deletes test data after ~3h;
   demo keeps it ~90d. If the request implies persistence ("for the team", "for demo day", "a
   fixture"), say AAT will delete it and recommend `-e demo`.

4. **Pick the subcommand.** `user` for a one-off; `fixture --id <uuid>` for something reseeded
   repeatedly; `cft-user` when roles match `caseworker-.*`, `cwd-user`, `judiciary`, `pui-.*` or
   `solicitor`, because a bare IDAM user is invisible to Reference Data and that breaks most
   caseworker journeys.

5. **Run it** and report the email / id / password. Check `az account show` first. For `-e demo`,
   confirm with the user before creating, since that data persists.

6. **If they'll repeat it in their own repo**, offer a script in that repo's `bin/` (see
   `apps/finrem/finrem-ccd-definitions/create_idam_id_scripts/caseworker.sh` for a batch reseed).
   That's a clone-local change — never a workspace-repo commit.

## Don't

- Don't hand-assemble curl when the script covers it. Fall back to
  `docs/how-to/create-idam-test-users.md` only for an endpoint it doesn't wrap.
- Don't offer the legacy `POST /testing-support/accounts` on `idam-api` for new work — different
  payload shape, and proxied in AAT but not preview.
- Don't promise an AAT user will exist tomorrow.
- Don't use `@mailnesia.com` with `cft-user` — RD rejects it.
