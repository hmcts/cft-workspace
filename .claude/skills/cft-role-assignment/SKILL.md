---
name: cft-role-assignment
description: Create, query or delete AM role assignments in a non-production CFT environment — organisational roles for caseworkers/judiciary, case roles, and case-allocator. Use when the user asks "give this user tribunal-caseworker", "why can't this user see tasks", "what roles does this actor have", "assign a case role", "clear this user's role assignments".
---

# Manage AM role assignments

Drive `scripts/am-role-assignment`, which wraps `am-role-assignment-service` and handles the
vendor media types, the assigner's uid, and the Drools bypass.

Role *assignments* (AM, runtime) are not IDAM *roles* (identity). A user needs both: the IDAM
role to log in and be recognised, the AM assignment to actually see work. If a user can log in
but sees no tasks or cases, this is usually the missing half — use `/cft-create-test-user` for
the IDAM side.

## When to use

- "Give this user `tribunal-caseworker` in CIVIL"
- "Why can't this caseworker see any work-allocation tasks?"
- "What role assignments does this actor have?"
- "Clear the role assignments for this test user"

## When NOT to use

- **IDAM roles / users** — `/cft-create-test-user`.
- **PUI roles on an organisation's users** — that's PRD, so `/cft-manage-test-org`.
- **Production** — no.

## Procedure

1. **Read the help**:
   ```bash
   ./scripts/am-role-assignment --help
   ```

2. **You need a user token for the assigner**, not just S2S. Mint one:
   ```bash
   ./scripts/idam-test-user user  -p <product> --client-id <c> -r caseworker --email you@justice.gov.uk
   ./scripts/idam-test-user login -p <product> --client-id <c> --email you@justice.gov.uk
   ```
   In AAT that user is cleaned up after ~3h, and its assignments become orphaned.

3. **Get the role name right — they are not interchangeable.** `roles` lists what AM knows.
   Staff organisational roles (`tribunal-caseworker`, `hearing-centre-admin`, …) work as
   `ORGANISATION`. `case-allocator` is a **case-role** concept and is rejected as an
   organisational role even with the Drools bypass, so don't reach for it by default.

4. **Most roles need attributes.** `jurisdiction` almost always; `primaryLocation` for staff
   roles; `caseId` for `CASE` roles with `SPECIFIC`/`EXCLUDED` grant types. A missing attribute
   surfaces as a 422 naming a Drools rule, not as "you forgot jurisdiction".

5. **Verify, don't assume.** A 2xx does not mean the assignment is live — AM can return `200`
   with `"status": "REJECTED"` per requested role. Check with `actor` afterwards, and read the
   `log` field on a rejection: it names the rule that approved and the rule that rejected.

6. **Clean up.** Assignments outlive the AAT IDAM user that holds them:
   ```bash
   ./scripts/am-role-assignment delete -m <ms> --user-token "$TOK" --actor-id <uuid>
   ./scripts/am-role-assignment delete -m <ms> --user-token "$TOK" --assignment-id <id>
   ```

## Don't

- Don't reimplement this as curl. Twenty-five teams already did, which is why the script exists.
- Don't debug a 422 by guessing — read `.roleAssignmentResponse.requestedRoles[].log`.
- Don't assume the caller's microservice is allowlisted; the script warns, but check with
  `grep S2S_AUTHORISED platops/cnp-flux-config/apps/am/am-role-assignment-service/<env>.yaml`.
- Don't confuse this with ORM (`am-org-role-mapping-service`), which recomputes assignments in
  bulk from Reference Data via a job. That's not a dev utility.
