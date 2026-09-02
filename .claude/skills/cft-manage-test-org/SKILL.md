---
name: cft-manage-test-org
description: Create, approve, inspect or delete professional organisations in a non-production CFT environment, and manage their users and PUI roles. Use when the user asks "create a test organisation", "I need a solicitor with an org", "add a user to an org", "give this user pui-case-manager", "list the users in org ABC1DEF".
---

# Manage test organisations

Drive `scripts/prd-test-org`, which wraps `rd-professional-api` (PRD) and encodes the traps:
the two separate S2S allowlists, globally-unique PBAs, non-atomic creates, and the misleading
approval `403`.

For plain IDAM users with no organisation, use `/cft-create-test-user`.

## When to use

- "Create a test organisation in AAT"
- "I need a solicitor that belongs to an org"
- "Add a user to organisation ABC1DEF"
- "Give that user `pui-finance-manager`" / "what roles does this org user have?"
- "Clean up the orgs I created"

## When NOT to use

- **A solicitor user with PUI roles but no organisation** — that's just an IDAM user, so
  `/cft-create-test-user`. Ask which they need if unclear; it changes the whole approach.
- **The test only reads org data** — stubbing PRD is far cheaper than creating a real org. See
  `apps/civil/civil-ccd-definition/e2e/helpers/activeOrganisationUsers.js`.
- **Production** — no.

## Procedure

1. **Read the help**:
   ```bash
   ./scripts/prd-test-org --help
   ```

2. **Run `check` first — always.** It needs no network and answers the question that otherwise
   costs an hour:
   ```bash
   ./scripts/prd-test-org check -m <microservice>
   ```
   Two different allowlists apply: PRD's governs **create**, `rd-user-profile-api`'s governs
   **approve**. Most service-team microservices are on the first but not the second.

3. **If `check` says approve is unavailable, say so up front** and recommend create-via-API,
   approve-via-UI (`https://administer-orgs.<env>.platform.hmcts.net`). Don't let the user
   discover it as a `403` that claims their token expired.

4. **`prd-admin` token** for everything except `create`:
   ```bash
   ./scripts/idam-test-user user  -p <product> --client-id <c> -r prd-admin --email you@justice.gov.uk
   ./scripts/idam-test-user login -p <product> --client-id <c> --email you@justice.gov.uk
   ```
   In AAT that admin user is itself cleaned up after ~3h.

5. **Sequence the work**: `create` → approve (UI or API) → `add-user` → `users` / `set-roles`.
   The organisation must be `ACTIVE` before its users can do anything, so don't add users to a
   `PENDING` org and expect them to work.

6. **VPN is required** for everything but `check` — PRD has no public ingress.

7. **Offer to clean up.** Organisations have no automatic expiry, but `prd-admin` can delete them
   while `PENDING`/`REVIEW`:
   ```bash
   ./scripts/prd-test-org list   -m <ms> --name <prefix> --admin-token "$TOK"
   ./scripts/prd-test-org delete -m <ms> --org-id <id>   --admin-token "$TOK"
   ```

## Don't

- Don't retry a failed `create` without running `list` first — a PBA-rejected `400` still creates
  the organisation, so retrying silently duplicates it.
- Don't read the allowlist from `rd-professional-api/src/main/resources/application.yaml`; flux
  overrides it per environment with a much longer list.
- Don't use a disposable email domain for the superUser or org users — RD rejects them.
- Don't pick a vague organisation name. Use an obvious throwaway prefix so it can be found and
  deleted later.
- Don't tell the user an approval `403` means their token is wrong. Run `check`.
