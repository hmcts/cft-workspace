---
title: Group Access and Notice of Change
topic: group-access
diataxis: explanation
product: pcs
audience: both
sources:
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/view/CurrentUserView.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/accesscontrol/GroupAccessType.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/accesscontrol/UserRole.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/util/CaseAccessGroupsUtil.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/noc/PcsNoticeOfChange.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/view/PartiesView.java
  - pcs-frontend:src/main/middleware/requireEventAccess.ts
  - pcs-frontend:src/main/steps/utils/userRole.ts
---

# Group Access and Notice of Change

## TL;DR

PCS grants solicitors and claimant organisations case access through **Group Access
organisation roles**, not through per-case roles and not through an IDAM role. A case names the
organisations entitled to it; a user's membership of one of those organisations is what lets them
in. Notice of Change is keyed on the same group role, so no bracketed case role is assigned at
any point in the journey.

## Why an IDAM role is the wrong signal

`caseworker-pcs-solicitor` was a stop-gap while Group Access was being onboarded. It is a CCD
access-control artefact: it says *this account may be granted things*, not *this person is a
professional acting on this case*.

Borrowing it as a proxy for identity breaks in a specific and quiet way. Remove the role from an
account and:

- case access is unaffected, because that comes from the organisation, and
- anything keyed on the IDAM role silently changes behaviour.

pcs-frontend used to gate the legal-representative journey on exactly that role, so an account
that lost it kept working access to its cases while being shown the **citizen** journey. Nothing
errors; the wrong pages simply render.

## Who holds which group role

`GroupAccessType` maps an organisation profile and a party role to a group role:

| Organisation profile | Party role | Group role |
|---|---|---|
| `LOCALAUTH_PROFILE` and the other non-solicitor profiles | claimant | `claimant` |
| `SOLICITOR_PROFILE` | claimant | `claimant-solicitor` |
| `SOLICITOR_PROFILE` | defendant | `defendant-solicitor` |

The group ID template is `PCS:PCS:<accessTypeId>:<groupRoleName>:$ORGID$`, so the organisation ID
is substituted per case. `CaseAccessGroupsUtil.deriveCaseAccessGroups` stamps those onto the case
from the case's own parties: the claim creator's organisation supplies the claimant-side group,
and each defendant's **active** party-to-organisation link supplies the defendant-solicitor group.

## Why the role cannot be read from RAS

Every user in a solicitor organisation holds `claimant-solicitor` **and** `defendant-solicitor` —
`GroupAccessType` declares both with `accessMandatory` and `accessDefault`. The role assignment
therefore cannot say which side of a given case the user acts on. Only the case can.

That is what `CurrentUserView` exists for. On each case read it compares the caller's
rd-professional organisation against the case's parties and states the answer as
`currentUserGroupRole` — `claimant`, `claimant-solicitor`, `defendant-solicitor`, or null. It is
the read-side counterpart of `CaseAccessGroupsUtil`, deliberately derived from the same input, the
case's party set.

Only an **active** party-to-organisation link counts. A notice of change deactivates the outgoing
firm's link rather than deleting it, so treating an inactive row as current would keep the previous
representative in the defendant's journey.

## How pcs-frontend uses it

`requireEventAccess` stores whether `currentUserGroupRole` is `defendant-solicitor` on the session,
and `isLegalRepresentativeUser` reads that boolean. None of the call sites changed when this
replaced the IDAM role — only what backs them.

"Legal representative" in the citizen-facing frontend has only ever meant the **defendant's**
representative: the LR path is the defence journey, and claimants bring claims in XUI. So
`claimant-solicitor` and `claimant` both fall through to the citizen journey, which is correct
rather than a gap.

The signal fails closed. If pcs-api serves no group role the comparison is false, so an
unrecognised caller gets the citizen journey rather than the professional one.

## Notice of Change without a case role

PCS keys its NoC challenge question on `defendant-solicitor` — the group role itself — rather than
on a bracketed case role. Three places must agree on that one string, because
`aac-manage-case-assignment` compares them as plain strings:

| Site | Value |
|---|---|
| ChallengeQuestion `Answer` | `.answerAsDeclared(GA_DEFENDANT_SOLICITOR)` |
| `OrganisationPolicy.OrgPolicyCaseAssignedRole` | `UserRole.GA_DEFENDANT_SOLICITOR` |
| `NocSubmissionResponse.approved(...)` | `GA_DEFENDANT_SOLICITOR.getRole()` |

They share one enum constant precisely so they cannot drift. Changing the answer without the
`OrganisationPolicy` fails with `NO_ORG_POLICY_WITH_ROLE` before any question renders.

Applying the change is pcs-api's own work, not AAC's: `PcsNoticeOfChange.submit` schedules a task
that writes the party-to-organisation link and deactivates the previous representation. **No CCD
case role is assigned** — `case_users` holds only `[CREATOR]` after a successful NoC. Access comes
entirely from the organisation's group role matching the case's `CaseAccessGroups`.

For the platform-level mechanics, see
[Implement Notice of Change for a decentralised service](../../../ccd/docs/how-to/implement-noc-decentralised.md)
and [Group Access](../../../ccd/docs/explanation/group-access.md).

## Consequences worth knowing

**A claimant organisation keeps access after a defendant's NoC.** Group access is organisation-wide
and per case, so nothing about a defendant changing representation revokes the claimant side.

**Access is organisation-wide, not per user.** A colleague in the same firm who took no part in the
NoC can open the case. That is the intended behaviour and is the cheapest way to prove group access
is what granted entry rather than something user-specific.

**A case with no claimant organisation is invisible to any firm.** Claimant-side access is derived
solely from the organisation on the claim-creating party, so a case never stamped with one cannot
be reached this way. Litigants in person are unaffected — they are not organisation members.

**First page load before any case is opened.** `currentUserGroupRole` is per case, so a caller who
has not yet opened one has no stored value and sees citizen chrome on caseless pages. Journey pages
are unaffected, because the middleware that sets it runs first.
