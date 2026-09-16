---
name: create-case
description: Create a PCS possession claim in a CFT environment from a named E2E test fixture, and drive it to a chosen case state. Use when the user asks "create a test case in AAT", "I need a claim with rent and non-rent grounds", "give me a Wales case on my preview", "make me a case in HEARING_READINESS", "what test fixtures are there", "I need a case reference to test with".
---

# Create a possession claim from a test fixture

Drive `${CLAUDE_PLUGIN_ROOT}/scripts/create-case`, which fires the same four CCD data-store
calls the Playwright suites use — an event-trigger GET and a POST for
`createPossessionClaim`, then the same pair for `resumePossessionClaim` — as the claimant
solicitor for that environment.

The claim shapes it offers are not a catalogue this skill keeps. They are the live payload
consts in both clones' test trees (`pcs-api/src/e2eTest/data/api-data/submitCase*.api.data.ts`
and the pcs-frontend equivalents), read off disk on every run. `--list` is therefore the only
accurate list of them, and it works offline. Fixture ids are `<repo>/<country>/<variant>`,
where the repo is `api` for pcs-api's payloads and `web` for pcs-frontend's.

A case stops in `PENDING_CASE_ISSUED` after the claim is submitted. `CASE_ISSUED` — the
default — adds a faked Pay-hub callback, and the eight states beyond it add one
`changeCaseState` event fired as a hearing-centre admin. Environment and journey notes:
`apps/pcs/pcs-api/src/e2eTest/test-README.md`.

To act on a case that already exists, use `/pcs:manage-case` instead.

## When to use

- "Create a test case in AAT"
- "I need a claim with no defendants to reproduce this bug"
- "Give me a Wales case on my preview"
- "Make me a case in HEARING_READINESS"
- "What test fixtures do we have?"

## When NOT to use

- **A claim shape that isn't in the fixture set** — the fixtures are the E2E suites' own
  payloads, not a general-purpose builder. Add a payload to `submitCase.api.data.ts` in
  either repo and it appears in `--list` with no change to this tooling. Do not hand-edit a
  payload through this script.
- **`CASE_ISSUED` or beyond on ithc** — the fee-payment endpoints live on pcs-api's
  testing-support controller, and `ENABLE_TESTING_SUPPORT` is not set in
  `platops/cnp-flux-config/apps/pcs/pcs-api/ithc.yaml`. The script refuses. Ask for
  `PENDING_CASE_ISSUED`, or use another environment.
- **`AWAITING_RESUBMISSION_TO_HMCTS` or `CLOSED`** — declared in `State.java`, but no event
  in pcs-api writes them, so no case can be in them.
- **A preview PR without the `pr-values:ccd` label** — that PR has no CCD stack at all, so
  there is no data-store to create a case in. Add the label and re-run the PR build.
- **A Welsh case in one of the eight advanced states** — the eight states need a
  `changeCaseState` event, which is granted to the hearing-centre roles. Those are AM
  organisational roles scoped by region, and the admin provisioned in these environments is
  assigned to an English one, so the step is refused. The case is still created and issued;
  the script warns before trying. Ask for `CASE_ISSUED` on Welsh fixtures.
- **A shut-down environment** — bring it up with `/pcs:start-env <env>` first.
- **Production** — the script refuses.

## Procedure

1. **Read the help — it is the source of truth for flags, environments and states:**
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/create-case --help
   ```

2. **List the fixtures before choosing one.** This needs no VPN, no Azure login and no
   environment, so do it even when nothing else is reachable:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/create-case --list
   ```
   Match the user's description against the fixture ids and the claimant type — "rent and
   non-rent grounds" is `web/england/rent-non-rent`, "assured tenancy" is
   `web/england/assured-tenancy`. If two fixtures fit, ask rather than picking.

3. **Resolve the environment from `$ARGUMENTS`.** `local`, `preview-<PR>`, `aat`, `demo`,
   `perftest`, `ithc`. If it is missing, ask — don't default to AAT, because a case created
   there is real and persists.

4. **Dry-run to show what will be hit.** This resolves every URL, the Key Vault and the case
   type without touching the network:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/create-case aat api/england/case-file-view --dry-run
   ```

5. **Create the case**, then report the reference and the XUI link it prints:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/create-case aat api/england/case-file-view
   ${CLAUDE_PLUGIN_ROOT}/scripts/create-case local web/wales/base PENDING_CASE_ISSUED
   ```
   `local` needs the cftlib stack up (`./gradlew bootWithCCD` in `apps/pcs/pcs-api`) but no
   VPN and no secrets, which makes it the cheapest environment to iterate in.

6. **Read a failure as the script frames it.** A `422` is the fixture drifting from the
   deployed CCD definition, not a broken environment — the callback body names the field.
   A `403` is the case type or S2S and will not change on a retry. A `502` on a named
   environment means it is shut down.

## Don't

- Don't enumerate fixture names in your answer from memory or from this file. Run `--list`;
  the set changes whenever either suite gains a payload.
- Don't set `CASE_TYPE_SUFFIX` by hand. Use `--case-type-suffix`, which also sets
  `PCS_API_CHANGE_ID` — the Wales create payload builds its endpoint from that one, so
  setting only the first sends the event-token GET and the create POST to different case
  types and the token comes back invalid.
- Don't check a LaunchDarkly flag before firing an event and don't report a flag as the
  cause of a failure. Event show-conditions are evaluated only when XUI builds its trigger
  list, so the API path works regardless. The one exception is
  `link-defendant-solicitor-to-party`, which really does enforce flags and returns `412`.
- Don't retry a `403` or a `422` unchanged. Both are deterministic; only `409` and a dropped
  VPN are worth re-running.
- Don't reach for `POST /testing-support/{country}/create-case` as a shortcut. It offers two
  base payloads instead of thirty, is absent on ithc, and its `issueAndGenerateAccessCodes`
  flag writes only the pcs database — it does not move the CCD state.
