---
title: Test Notice of Change on a preview
topic: group-access
diataxis: how-to
product: pcs
audience: both
sources:
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/noc/PcsNoticeOfChange.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/view/CurrentUserView.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/testingsupport/endpoint/TestingSupportController.java
  - pcs-api:src/e2eTest/data/api-data/submitCase.api.data.ts
  - pcs-frontend:src/main/steps/respond-to-claim/legalrep.flow.config.ts
  - pcs-frontend:src/main/steps/respond-to-claim/select-defendant/index.ts
---

# Test Notice of Change on a preview

Notice of Change is the one PCS journey where the act itself grants the access: before it the
incoming firm gets `404` on the case, after it they hold `defendant-solicitor` and the case appears
in their list. That flip is the proof, and it is better evidence than the screen.

Background: [Group Access and Notice of Change](../explanation/group-access-and-noc.md).

## Before you start

The preview must carry the `pr-values:ccd` label — without it there is no CCD stack to create a
case in.

You need two organisations that are **not** the same, because NoC rejects a firm already on the
case and separately rejects one acting for both sides. A local authority as claimant and a
solicitor firm as the incoming defendant representative is the usual pairing; credentials for the
manual-test organisations are in `pcs-api`'s own `docs/group-access/test-organisations.md`.

**Capture the before state.** Without it you cannot tell a working NoC from a firm that already
had access:

```bash
# expect 404 for the incoming firm, 200 for the claimant side
curl -s -o /dev/null -w '%{http_code}\n' "$DATA_STORE/cases/$CASE" \
  -H "Authorization: Bearer $TOKEN" -H "ServiceAuthorization: Bearer $S2S" -H 'experimental: true'
```

## Create the case as the claimant organisation

Create it as a user from the claimant organisation, not the default E2E solicitor — otherwise the
test proves nothing about group access, because the default user may still hold roles the change
is meant to remove.

```bash
PCS_IDAM_PASSWORD=<their password> \
  /pcs:create-case preview-<PR> api/england/base --as <claimant-org-user>@test.com
```

The user needs a `claimant` Group Access role on the case type. It does **not** need any solicitor
IDAM role — a user with none creating and issuing a case is the thing worth demonstrating.

## Walk the journey in the browser

Drive this through the screen. A green sequence of API calls does not prove the pages work, and
the pages are what is under test.

1. Open `{XUI}/noc` and enter the case reference, digits only.
2. Answer the challenge. PCS asks for the defendant's first and last name, and they must match
   **`defendant1`** — with the `api/england/base` fixture that is `John Doe`. Additional defendants
   do not match, because the challenge question is keyed on `defendant1` alone.
3. Tick the declaration on the affirmation page. Leaving it unticked gives `AFFIRMATION_NOT_AGREED`
   and the page will not advance.
4. Submit. PCS returns `SUBMISSION_SUCCESS_APPROVED` — the change applies immediately rather than
   queueing for approval.

## Verify it worked

```bash
# after the NoC: 200, and currentUserGroupRole = defendant-solicitor
curl -s "$DATA_STORE/cases/$CASE" -H "Authorization: Bearer $TOKEN" \
  -H "ServiceAuthorization: Bearer $S2S" -H 'experimental: true' \
  | jq -r '.state, .data.currentUserGroupRole'
```

Then check a **colleague** in the same firm who never touched the NoC. They should also read `200`.
If the actor can see the case and the colleague cannot, something other than group access let the
actor in.

## Traps

**The case opens by URL but is missing from the case list.** Case-list visibility is served from
Elasticsearch, and group access reaches the index only when something writes a case revision. That
is what the `noticeOfChangeApplied` system event is for — if it is absent from the pod logs the
case will not appear however long you wait. Preview Elasticsearch may never index at all, in which
case judge by the direct read.

**Only `defendant1` can be taken over by NoC.** The challenge question names it explicitly, so a
firm can never reach the other defendants this way. To represent a second defendant — and so to see
the `select-defendant` page at all — link them directly:

```bash
curl -X POST "$API/testing-support/link-defendant-solicitor-to-party/$CASE/$PARTY_ID" \
  -H "Authorization: Bearer $TOKEN" -H "ServiceAuthorization: Bearer $S2S"
```

It links the **calling user's own** organisation, so authenticate as someone in the incoming firm.
It is also the one PCS endpoint that genuinely enforces LaunchDarkly flags, returning `412` when
`RELEASE_1_DOT_2` or `CUI_RESPOND_TO_CLAIM_LR` is off.

**`select-defendant` not appearing is usually correct.** Its show condition is
`!hasSingleLinkedDefendant`, so a firm representing one defendant is routed past it and
`No selected party id` in the log is expected. Only a firm linked to two or more sees the page.

**"Respond to claim" not offered in XUI.** The `ext:respondPossessionClaim` tile carries a show
condition requiring `legalRepUpdatedDetails="Yes"`, so *Amend representative's details* has to be
completed first.

**Do not deep-link into respond-to-claim.** Landing partway through leaves no draft and no
`draftVersion`, and submit then fails with `DRAFT_CHANGED` in a loop, because the state lives in a
query parameter that survives a reload. Start at `start-now`.

**A preview rebuild destroys the case.** Preview databases are wiped on each build, so a case
created for a manual test does not survive a push to the branch.
