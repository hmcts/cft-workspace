---
name: manage-case
description: Inspect or act on an existing PCS case in a CFT environment — read its state, parties and defendant access codes, issue it, move it to another state, arrange or cancel a hearing, add a case note, or manage its case roles and links. Use when the user asks "what state is this case in", "get me the defendant PINs", "move this case to HEARING_READINESS", "arrange a hearing on this case", "why can't this user see the case", "this case is stuck in PENDING_CASE_ISSUED".
---

# Inspect or act on an existing PCS case

Drive `${CLAUDE_PLUGIN_ROOT}/scripts/manage-case`, which wraps the operations worth having on
a case that already exists. CCD events go through the same two calls the Playwright suites
use — an event-trigger GET for a token, then a POST to `/cases/{ref}/events`. Reads of the fee
rows and the defendant access codes go to pcs-api's testing-support controller and need only
an S2S token, so `pins`, `fee-info` and `set-party-email` work without an Azure login at all.

The thing the script holds that is easy to get wrong is **which user each operation acts as**.
`changeCaseState`, `manageHearing` and the case-link events are granted only to the
hearing-centre roles; `addCaseNote` to a wider caseworker bundle; the testing-support reads to
nobody. Firing one as the claimant solicitor returns a `403` that reads like an infrastructure
fault, so the operation decides the user rather than the caller. Journey and environment
notes: `apps/pcs/pcs-api/src/e2eTest/test-README.md`.

To create a case in the first place, use `/pcs:create-case`.

## When to use

- "What state is case 1712-3456-7890-1234 in?"
- "Get me the defendant PINs for this case"
- "Move this case to HEARING_READINESS"
- "Arrange a hearing on this case"
- "This case is stuck in PENDING_CASE_ISSUED — can you issue it?"

## When NOT to use

- **Enforcement — `enforceTheOrder` or `confirmEviction`** — both are registered only when
  `isDev()` and `ENABLE_ENFORCEMENT` are true, and `ENABLE_ENFORCEMENT` is set nowhere except
  the unit-test block in `build.gradle`. The definition is generated with
  `SPRING_PROFILES_ACTIVE=config-gen`, so these events are absent from **every** deployed CCD
  definition, AAT included. This is not a flag that can be flipped from a client.
- **General applications — `makeAnApplication`** — needs a token for a solicitor who already
  represents a defendant party, which means create, pay, read the defendant ids, call
  `link-defendant-solicitor-to-party`, then mint that solicitor's token. That link endpoint is
  the one place a feature flag is enforced server-side and returns `412` unless both
  `release-1.2-enabled` and `cui-respond-to-claim-lr-enabled` are on.
- **Case links** — `createCaseLink` returns a 500 from pcs-api's `/ccd-persistence/cases`
  callback for every payload tried, down to a minimal
  `{caseLinks:[{value:{caseReference}}]}`, so it is broken server-side rather than a payload
  to get right. Sending `LinkedCasesComponentLauncher` instead fails earlier inside CCD with
  "No validator found for ComponentLauncher". `inspect` reports the link count; nothing here
  writes one.
- **Case flags** — every field is `NEVER_SHOW` plus a component launcher, so a caller would
  have to synthesise the whole `Flags` structure XUI produces. `inspect` reports the flags on
  a case; nothing here writes them.
- **Document events** — they take a CCD `Document`, which needs a CDAM upload first.
- **Notice of change and Work Allocation task listing** — no API path for either exists in
  pcs-api or pcs-frontend.
- **The testing-support operations on ithc** — `pins`, `fee-info`, `pay` and
  `set-party-email` all need `ENABLE_TESTING_SUPPORT`, which ithc does not set. The script
  refuses. Because `pay` is the only route to `CASE_ISSUED`, `set-state` is also
  unreachable there: no ithc case can move past `PENDING_CASE_ISSUED`.
- **The hearing-centre operations in perftest** — the admin user is not provisioned with an
  AM role there, so it cannot even read a case (CCD answers 404). `inspect`, `pay`,
  `set-state` and the hearing operations all depend on it. `add-note` (CTSC), `flags`,
  `roles` and the S2S-only reads still work. This is role provisioning, not feature flags —
  verified identical flag values in aat, demo, perftest and ithc.
- **Production** — the script refuses.

## Procedure

1. **Read the help — it is the source of truth for the arguments each operation takes:**
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/manage-case --help
   ${CLAUDE_PLUGIN_ROOT}/scripts/manage-case --list
   ```
   `--list` also reports which user each operation acts as and which need testing-support.
   It needs no VPN or secrets.

2. **Inspect before writing.** Most questions are answered by this alone, and the writes
   depend on what it reports — party ids for `set-party-email`, the current state for
   `set-state`, whether a hearing exists at all:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/manage-case aat 1712-3456-7890-1234 inspect
   ```
   When something works in one environment and not another, `flags` reports the
   LaunchDarkly values actually in effect there, read off the case rather than guessed:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/manage-case demo 1712-3456-7890-1234 flags
   ```
   Reach for it before assuming a flag is the cause — as of the last check all five were on
   in every non-prod environment, and the real differences were in AM role provisioning.

3. **Resolve the environment and the case reference from `$ARGUMENTS`.** The reference is
   accepted with or without dashes. If the environment is missing, ask — these operations
   write to real cases.

4. **Dry-run any write.** It prints the resolved URLs and, importantly, the user the
   operation will act as:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/manage-case aat 1712345678901234 set-state CASE_STAYED --dry-run
   ```

5. **Run it**, and say plainly what changed:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/manage-case aat 1712345678901234 pay
   ${CLAUDE_PLUGIN_ROOT}/scripts/manage-case aat 1712345678901234 add-hearing
   ${CLAUDE_PLUGIN_ROOT}/scripts/manage-case aat 1712345678901234 add-note "Reproducing HDPI-1234"
   ```

6. **Read a "No case type found" 404 as a region-scoped role, not a missing case.** The
   hearing-centre roles are AM organisational roles scoped by region and location, so a user
   assigned to one region gets this on another region's case — Welsh cases being the usual
   example. Supply a user assigned to the right region rather than retrying:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/manage-case aat 1712345678901234 set-state CASE_STAYED \
     --as pcs-hearing-centre-wales1@hmcts.net
   ```
   `/cft-role-assignment` reports what a user actually holds.

7. **Warn before a one-way change.** A case cannot return to `CASE_ISSUED` once it has left
   it — `CaseStateOption` has no member for it — so `set-state` off `CASE_ISSUED` is
   effectively permanent for that case. Cancelling a hearing and every event here land in the
   case history. Say so first and let the user decide; there is no undo.

## Don't

- Don't reach for `--as` to work around a `403`. The operation already encodes the role the
  event is granted to, and a `403` means the case type or the S2S allowlist. `--as` is for the
  one case it cannot encode: a role scoped to a region the default user is not assigned to,
  which shows up as a `404` saying "No case type found".
- Don't treat a `403` on `set-state` as a missing feature flag. `changeCaseState`'s enabling
  condition is evaluated only when XUI builds its trigger list, never on the API path.
- Don't read a `0` from `inspect` as "none exist". Fields are ACL'd per role, so a count is
  what the hearing-centre admin can see. `inspect` names the role it used, and omits fields
  it could not read rather than reporting them as empty.
- Don't read an empty `roles` result as "no access". PCS grants case access through AM role
  assignments written by a scheduled task, not through CCD case-user roles.
- Don't try to reach `CASE_ISSUED` with `set-state`. Use `pay`, which fakes the Pay-hub
  callback — that is the only path to it, and it is synchronous.
- Don't argue with `pay` when it refuses. It reads the state first and stops unless the case
  is in `PENDING_CASE_ISSUED`, because the fee row keeps its service-request reference: a
  replayed payment reports success on a case it did not change.
- Don't invent a `manageHearing` payload. `add-hearing` reuses the E2E suite's proven one,
  and `edit-hearing` and `cancel-hearing` take the hearing id from the event-trigger
  response — the event's about-to-start callback is the only thing that populates
  `hearing_HearingId`, and the persisted case data has no hearing id to read.
