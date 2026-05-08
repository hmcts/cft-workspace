---
topic: notice-of-change
audience: both
sources:
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/NoticeOfChangeController.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/domain/ChangeOrganisationRequest.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/domain/ApprovalStatus.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/NoticeOfChangeQuestions.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/ChallengeAnswerValidator.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/VerifyNoCAnswersService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/ApplyNoCDecisionService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/RequestNoticeOfChangeService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/client/definitionstore/DefinitionStoreApiClientConfig.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/client/datastore/CaseEventCreationPayload.java
  - aac-manage-case-assignment:src/main/resources/application.yaml
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemApplyNoticeOfChange.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemRequestNoticeOfChange.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/noticeofchange/client/AssignCaseAccessClient.java
examples_extracted_from:
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemRequestNoticeOfChange.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "1452902365"
    title: "API Operation: Request Notice of Change"
    space: "ACA"
  - id: "1457312216"
    title: "API Operation: Apply Notice of Change Decision"
    space: "ACA"
  - id: "1457321193"
    title: "API Operation: Check for Notice of Change Approval"
    space: "ACA"
  - id: "1460555663"
    title: "API Operation: Prepare Notice of Change Request"
    space: "ACA"
  - id: "1454899818"
    title: "API Operation: Get NoC Questions"
    space: "ACA"
  - id: "1454899819"
    title: "API Operation: Verify NoC Answers"
    space: "ACA"
  - id: "1460552966"
    title: "API Operation: Set Organisation To Remove"
    space: "ACA"
  - id: "1380221923"
    title: "A Guide to Assign Access to cases for professional users: configuration"
    space: "RCCD"
---

# Notice of Change

## TL;DR

- Notice of Change (NoC) is the protocol by which a new solicitor proves identity, claims representation of a litigant, and displaces the existing solicitor — without a caseworker intervening.
- The case-type definition owns the `ChangeOrganisationRequest` (COR) complex field plus **four CCD events**: NoC Request (add/replace), NoC Request (remove), NoC Approval, and NoC Rejection.
- `aac-manage-case-assignment` (AAC, port 4454) orchestrates the multi-step flow: challenge questions, answer verification, role assignment, and notification.
- The COR field carries the in-flight request — `CaseRoleId`, `OrganisationToAdd`, `OrganisationToRemove`, `ApprovalStatus`, `RequestTimestamp` (plus optional `Reason`, `NotesReason`, `ApprovalRejectionTimestamp`).
- `ApprovalStatus` (enum `ApprovalStatus.java`) uses numeric strings: `"0"` = `PENDING`, `"1"` = `APPROVED`, `"2"` = `REJECTED`.
- AAC uses **two system users** with separate IDAM roles: `caseworker-caa` (NoC question/verify/request) and `caseworker-approver` aka `noc-approver` system account (approval/decision); each has access to a single CCD event so AAC can identify the right event without hard-coded names.
- After a decision, AAC bulk-assigns roles to all PRD org users of the incoming org and removes roles for the outgoing org; it appends a `PreviousOrganisation` collection entry (org name, address, from/to timestamps) and emails removed solicitors via GOV.UK Notify.

## The ChangeOrganisationRequest field

Every case type that supports NoC must carry exactly one field of CCD complex type `ChangeOrganisationRequest`. AAC discovers it at runtime by scanning case data for nodes containing both `OrganisationToAdd` and `OrganisationToRemove` children — there is no fixed field name (`CaseDetails.java:82-92`).

The COR is a temporary holding place. AAC and approver users see it; ordinary users should not. CCD's hide capability does not currently preserve values inside complex types, so the recommended workaround is to set the COR fields to `READONLY` rather than hidden until that fix lands.
<!-- CONFLUENCE-ONLY: hide-vs-readonly workaround captured from RCCD config guide; not directly visible in source. -->

```json
{
  "CaseRoleId": {
    "value": { "code": "[APPONESOLICITOR]", "label": "Applicant 1 Solicitor" },
    "list_items": [ … ]
  },
  "OrganisationToAdd":    { "OrganisationID": "AAA111", "OrganisationName": "Acme LLP" },
  "OrganisationToRemove": { "OrganisationID": "BBB222", "OrganisationName": "Bettis & Co" },
  "ApprovalStatus": "0",
  "RequestTimestamp": "2026-04-29T10:00:00",
  "Reason": null,
  "NotesReason": null,
  "ApprovalRejectionTimestamp": null,
  "CreatedBy": "solicitor@acme.example"
}
```

`CaseRoleId` is a `DynamicList`, not a plain string. `ApplyNoCDecisionService` reads the selected role via JSON path `/CaseRoleId/value/code` (`ApplyNoCDecisionService.java:103`). After the decision is applied, **all** COR fields are nullified to mark the request complete (`ApplyNoCDecisionService.java`, also confirmed in the API spec response example).
<!-- DIVERGENCE: Earlier draft said only CaseRoleId is nullified. The Apply NoC Decision spec (Confluence ACA-1457312216) and the controller's example response show every COR field reset to null. Source confirms — Source wins. -->

### COR field reference

| Field | Type | Purpose |
|---|---|---|
| `CaseRoleId` | DynamicList | Selected role to (un)represent. Nullified once decision applied. |
| `OrganisationToAdd` | Organisation | Incoming org (NULL for pure remove-rep). |
| `OrganisationToRemove` | Organisation | Outgoing org (NULL for pure add-rep / LiP-to-rep). |
| `ApprovalStatus` | String enum | `"0"` PENDING, `"1"` APPROVED, `"2"` REJECTED. |
| `RequestTimestamp` | DateTime | When the NoC was raised. |
| `Reason` | String | Optional free-text reason. |
| `NotesReason` | String | Optional approver notes. |
| `ApprovalRejectionTimestamp` | DateTime | When approval/rejection was applied. |

## Challenge questions

Challenge questions are defined in the case-type definition under question group id `NoCChallenge` (hardcoded in `NoticeOfChangeQuestions.java:39`). Each question carries a list of candidate answers, each referencing a `caseRoleId` and a set of `fieldIds` — dot-separated paths into case data — whose values the solicitor must supply correctly to prove identity.

AAC fetches questions via definition-store:

```
GET api/display/challenge-questions/case-type/{ctid}/question-groups/NoCChallenge
```

The public `GET /noc/noc-questions?case_id=` endpoint strips answer values before returning to the caller (`NoticeOfChangeQuestions.java:64`); the internal verify path retains them for matching.

The response shape (one entry per question) — useful when wiring the XUI form:

```json
{
  "questions": [
    {
      "case_type_id": "AAT",
      "order": 1,
      "question_text": "What's the name of the party you wish to represent?",
      "answer_field_type": {
        "id": "Text", "type": "Text",
        "min": null, "max": null,
        "regular_expression": null,
        "fixed_list_items": [],
        "complex_fields": [],
        "collection_field_type": null
      },
      "display_context_parameter": "1",
      "challenge_question_id": "NoC",
      "answer_field": "",
      "question_id": "QuestionId1"
    }
  ]
}
```

`answer_field_type.type` can be any CCD primitive (Text, Number, YesOrNo, Email, Date, DateTime…). For `Date` / `DateTime` types, the UI uses `display_context_parameter` to format the answer; AAC then compares date-vs-date directly.
<!-- CONFLUENCE-ONLY: response JSON shape and display_context_parameter semantics from ACA-1454899818. -->

### Answer matching

`ChallengeAnswerValidator` compares supplied answers against fields on the case (`ChallengeAnswerValidator.java:30`):

1. Answer count must equal question count (else `answers-mismatch-questions`).
2. For each question, the submitted answer is looked up by `questionId`.
3. **Text fields**: lowercased, then apostrophes (`'`), `Character.isWhitespace()` characters, and hyphens (`-`) are removed before comparing. Case-insensitive (`ChallengeAnswerValidator.java:122`).
4. **Date / DateTime fields**: compared directly (UI is responsible for formatting per `display_context_parameter`).
5. **NULL handling**: if the case field is NULL, a positive match requires the answer to also be NULL/empty. A non-NULL answer against a NULL case field is a non-match.
6. Exactly one `caseRoleId` must have all answers correct — zero matches throws `answers-not-matched-any-litigant` (constant `ANSWERS_NOT_MATCH_LITIGANT`); more than one throws `answers-not-identify-litigant` (`ANSWERS_NOT_IDENTIFY_LITIGANT`).
7. If the matched organisation is already the caller's own org, `VerifyNoCAnswersService` throws `has-represented` / `REQUESTOR_ALREADY_REPRESENTS` (`VerifyNoCAnswersService.java:50`).

### Caller eligibility

The caller must hold IDAM role `pui-caa` (CAA, cross-jurisdiction) **OR** a solicitor role plus a matching jurisdiction role (`NoticeOfChangeQuestions.java:109`, via `securityUtils.hasSolicitorAndJurisdictionRoles`).

Pre-flight guards before questions are returned:

- **Multiple COR guard**: more than one COR node in case data → `multiple-noc-requests-on-case` / `CHANGE_REQUEST` (`NoticeOfChangeQuestions.java:127-128`).
- **Ongoing NoC guard**: `COR.CaseRoleId` non-null → `noc-in-progress` / `NOC_REQUEST_ONGOING` (`NoticeOfChangeQuestions.java:131-132`).
- **No OrganisationPolicy for matched role**: → `no-org-policy`.
- **No NoC events available** (system user has no events accessible): → `noc-event-unavailable`.

## AAC endpoints

All NoC endpoints are under `@RequestMapping("/noc")` (`NoticeOfChangeController.java`). Operation codes (`MCA-04` etc.) are AAC's internal HLD identifiers — useful when correlating with Confluence specs.

| Op code | Endpoint | Method | Callback type | Purpose |
|---|---|---|---|---|
| MCA-04 | `/noc/noc-questions` | GET | n/a (REST) | Returns challenge questions (answers stripped). Validates `case_id` with Luhn check. |
| MCA-05 | `/noc/verify-noc-answers` | POST | n/a (REST) | Verifies submitted challenge answers; returns matched `OrganisationPolicy.Organisation`. |
| n/a | `/noc/noc-prepare` | POST | about-to-start | Populates `CaseRoleId` DynamicList of eligible roles for the remove-representation event. |
| MCA-09 | `/noc/set-organisation-to-remove` | POST | about-to-submit | Finds matching `OrganisationPolicy` and writes `OrganisationToRemove` into COR. |
| MCA-06 | `/noc/noc-requests` | POST | n/a (REST) | Combined verify + submit in one call (HTTP 201 on success). |
| MCA-08 | `/noc/check-noc-approval` | POST | submitted (post-commit) on NoC Request event | Reads `ApprovalStatus`; if not `PENDING`, triggers the case-type's NoC Decision event. |
| MCA-07 | `/noc/apply-decision` | POST | about-to-start on NoC Approval / Rejection event | Applies approved NoC — assigns incoming org roles, removes outgoing org roles. Returns HTTP 200 even on soft errors; check `response.errors[]`. |

`/noc/apply-decision` always returns HTTP 200 — this is the CCD callback contract. Errors appear in the `errors[]` array of the response body (`NoticeOfChangeController.java:361-367`).
<!-- DIVERGENCE: Earlier draft labelled apply-decision as a 'submitted' callback. Confluence spec (ACA-1457312216) and nfdiv's SystemApplyNoticeOfChange.aboutToStart() — which calls /noc/apply-decision from inside the about-to-start handler — both confirm it is invoked during AboutToStart processing of the NoC Decision event. Source wins. -->

### Endpoint roles in the lifecycle

- **MCA-04 / MCA-05 / MCA-06** are public REST APIs invoked from XUI (or service code) at the start of the journey — they are not CCD callbacks.
- **`noc-prepare` / `set-organisation-to-remove`** are the two callbacks wired onto the *Remove Representation* NoC Request event.
- **`check-noc-approval`** is the post-commit (Submitted) callback wired onto **every** NoC Request event (add/replace and remove). It only triggers the NoC Decision event when `ApprovalStatus` indicates the request is auto-approved.
- **`apply-decision`** is the about-to-start callback wired onto the NoC Approval and NoC Rejection events. Service teams either call it directly (e.g. nfdiv's `AssignCaseAccessClient`) from inside their own about-to-start handler, or wire it as the CCD callback URL.

## What the case-type definition must provide

| Artefact | Where defined | Notes |
|---|---|---|
| `ChangeOrganisationRequest` field | Case type field list | Complex field of CCD type `ChangeOrganisationRequest`. Name is arbitrary; AAC finds it by structure scanning. CRU on `caseworker-caa` and `caseworker-approver`. |
| `NoCChallenge` question group | ChallengeQuestionTab | ID **must be `NoCChallenge`** (hardcoded). Each question references `fieldIds` (dot-paths) on the case type. |
| **NoC Request event — add/replace representation** | Event definition | Default `ApprovalStatus` to `1` (auto-approve) or `0` (subject to approval). Submitted callback → `check-noc-approval`. Restricted to `caseworker-caa`. |
| **NoC Request event — remove representation** | Event definition | About-to-start → `noc-prepare`. About-to-submit → `set-organisation-to-remove`. Submitted → `check-noc-approval`. Restricted to solicitors / HMCTS caseworkers. |
| **NoC Approval event** | Event definition | Default COR `ApprovalStatus` to `1` (Approved). About-to-start → `apply-decision`. Restricted to `caseworker-approver` and approver caseworkers. |
| **NoC Rejection event** | Event definition | Default COR `ApprovalStatus` to `2` (Rejected). About-to-start → `apply-decision`. Restricted to `caseworker-approver` and approver caseworkers. |
| `OrganisationPolicy` fields | Case type | One per representable party role; `OrgPolicyCaseAssignedRole` value must match a `caseRoleId` in challenge questions. CRU on `caseworker-caa` and `caseworker-approver`. |
| Litigant case roles | Roles tab | One per representable party. Don't model litigants as collections — CCD doesn't allow per-element CRUD or per-element NoC. |

<!-- CONFLUENCE-ONLY: the four-event decomposition (add/replace, remove, approval, rejection) and the IDAM role restrictions on each event are taken from the RCCD configuration guide (Confluence 1380221923). The SDK SystemRequestNoticeOfChange / SystemApplyNoticeOfChange examples in nfdiv collapse some of these into combined events, but the canonical guidance is the four-event split. -->

### Auto-approval vs explicit approval

A NoC Request event can be configured for **auto-approval** by defaulting the COR `ApprovalStatus` to `"1"` (APPROVED). When `check-noc-approval` runs as the submitted callback and sees `"1"`, it immediately triggers the case-type's NoC Decision event — which in turn invokes `apply-decision` to assign the incoming org's roles to the new solicitor.

Configured for **explicit approval** (default `"0"` = PENDING), the request waits in COR until a caseworker raises the NoC Approval (or Rejection) event manually. The `apply-decision` callback only proceeds when `ApprovalStatus` is `"1"` or `"2"` — `PENDING` returns the error `"A decision has not yet been made on the pending Notice of Change request"` (HTTP 200 with `errors[]`).

## Role assignment after decision

`ApplyNoCDecisionService` branches on the COR's `OrganisationToAdd` / `OrganisationToRemove` to handle three shapes (`ApplyNoCDecisionService.java:163,200`):

| Shape | `OrganisationToAdd` | `OrganisationToRemove` | Behaviour |
|---|---|---|---|
| **Add representation** | non-null | null | LiP-to-rep: assign incoming org users; no removal; no PreviousOrganisations entry. |
| **Replace representation** | non-null | non-null | Solicitor handover: assign incoming, remove outgoing, append PreviousOrganisations, send removal email. |
| **Remove representation** | null | non-null | Rep-to-LiP: clear `OrganisationPolicy.Organisation`, remove outgoing, append PreviousOrganisations, send removal email. |

For each shape:

1. Get all users currently assigned to the case via data-store `/case-assigned-user-roles`.
2. If adding: call PRD to list users in `OrganisationToAdd`, intersect with current case users, then call data-store `/case-users` to add the case-role for each.
3. If removing: call PRD to list users in `OrganisationToRemove` (also collects org **name + address** for the audit trail), intersect with current case users, then call data-store `/case-users` to remove the case-role.
4. If removing (replace or remove shapes): append a new `PreviousOrganisation` entry to the matched `OrganisationPolicy.PreviousOrganisations` collection:
   - `FromTimeStamp` = the previous PreviousOrganisation's `ToTimeStamp` if any, else case creation timestamp.
   - `ToTimeStamp` = now.
   - `OrganisationName` and `OrganisationAddress` from the PRD lookup.
5. If removing: invoke `SendRemovalNotification` (GOV.UK Notify) to email the outgoing solicitors.
6. Nullify all COR fields.

Role assignments are written to data-store `/case-users` (not directly to AMRAS) on the NoC decision path. The `/case-users` endpoint on AAC itself routes directly to AMRAS.

The system account triggering the decision-event submission (`caseworker-approver` IDAM role, account `noc.approver@gmail.com`) must additionally hold the `prd-aac-system` IDAM role for PRD calls to succeed (per Confluence ACA-1457312216).
<!-- CONFLUENCE-ONLY: prd-aac-system role requirement is from the Confluence spec; not directly grep-able in source. -->

If `ApprovalStatus = "2"` (REJECTED), `ApplyNoCDecisionService` skips all PRD/role logic and simply nullifies the COR fields (`ApplyNoCDecisionService.java`, also matching ACA-1457312216 step 2.ii).

## How nfdiv wires NoC (example)

No Fault Divorce uses three CCD event classes for NoC:

- `SystemRequestNoticeOfChange` — triggers the request.
- `SystemApplyNoticeOfChange` — about-to-start callback reads `COR.CaseRoleId.getRole()` to determine which applicant side is changing, builds a `ChangeOfRepresentative` audit record, then calls `AssignCaseAccessClient.applyNoticeOfChange(sysUserToken, s2sToken, acaRequest)` (`SystemApplyNoticeOfChange.java:91`). Errors from AAC surface as CCD validation errors, not exceptions.
- `CaseworkerNoticeOfChange` — caseworker-triggered variant.

nfdiv calls AAC with a **system user token** (not the triggering user's token) when applying the change (`SystemApplyNoticeOfChange.java:87-91`).

## Sequence diagram

```mermaid
sequenceDiagram
    actor Solicitor
    participant XUI
    participant AAC as aac-manage-case-assignment
    participant DefStore as ccd-definition-store-api
    participant DataStore as ccd-data-store-api
    participant PRD
    participant AMRAS as am-role-assignment-service
    participant Notify as GOV.UK Notify

    Solicitor->>XUI: Open NoC form for case
    XUI->>AAC: GET /noc/noc-questions?case_id=<id>
    AAC->>DataStore: GET /internal/cases/{caseId} (user token)
    AAC->>DataStore: GET /cases/{caseId} (system/CAA token)
    AAC->>DefStore: GET api/display/challenge-questions/case-type/{ctid}/question-groups/NoCChallenge
    AAC-->>XUI: ChallengeQuestionsResult (answers stripped)
    XUI-->>Solicitor: Show challenge questions

    Solicitor->>XUI: Submit answers + select role
    XUI->>AAC: POST /noc/noc-requests (verify + submit combined)
    AAC->>DefStore: GET challenge questions (with answers, internal)
    AAC->>DataStore: GET case field values for answer matching
    Note over AAC: ChallengeAnswerValidator — exactly one caseRoleId must match
    AAC->>PRD: Resolve incoming organisation
    Note over AAC: Guard: REQUESTOR_ALREADY_REPRESENTS if same org
    AAC->>DataStore: POST /cases/{caseId}/events (submit NoCEvent with COR populated)
    AAC-->>XUI: RequestNoticeOfChangeResponse (HTTP 201)

    Note over DataStore: COR.ApprovalStatus = "0" (Pending) written to case

    DataStore->>AAC: POST /noc/check-noc-approval (submitted callback on NoC Request event)
    Note over AAC: Reads COR.ApprovalStatus; "1"/APPROVED triggers decision
    AAC->>DataStore: POST /cases/{caseId}/events (trigger NoC Decision event as caseworker-approver)

    DataStore->>AAC: POST /noc/apply-decision (about-to-start callback on NoC Decision event)
    AAC->>PRD: Resolve all users in OrganisationToAdd
    AAC->>DataStore: POST /case-users (assign roles for incoming org users)
    AAC->>DataStore: DELETE /case-users (remove roles for outgoing org users)
    AAC->>PRD: Get org address for PreviousOrganisations audit
    AAC->>DataStore: POST /cases/{caseId}/events (update COR — nullify CaseRoleId)
    AAC->>Notify: Send removal email to outgoing solicitors
    AAC-->>DataStore: ApplyNoCDecisionResponse (HTTP 200, check errors[])
```

## Example

### config-generator form — `SystemRequestNoticeOfChange.configure()` (nfdiv)

```java
// from apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemRequestNoticeOfChange.java
public static final String NOTICE_OF_CHANGE_REQUESTED = "notice-of-change-requested";

@Override
public void configure(final ConfigBuilder<CaseData, State, UserRole> configBuilder) {
    new PageBuilder(configBuilder
        .event(NOTICE_OF_CHANGE_REQUESTED)
        .forStates(POST_ISSUE_STATES)
        .name("Notice Of Change Requested")
        .grant(CREATE_READ_UPDATE, ORGANISATION_CASE_ACCESS_ADMINISTRATOR)
        .grantHistoryOnly(LEGAL_ADVISOR, JUDGE, CASE_WORKER, SUPER_USER)
        .aboutToStartCallback(this::aboutToStart)
        .submittedCallback(this::submitted))
        .page("nocRequest")
        .complex(CaseData::getChangeOrganisationRequestField)
            .complex(ChangeOrganisationRequest::getOrganisationToAdd)
                .optional(Organisation::getOrganisationId)
                .optional(Organisation::getOrganisationName)
            .done()
            .complex(ChangeOrganisationRequest::getOrganisationToRemove)
                .optional(Organisation::getOrganisationId)
                .optional(Organisation::getOrganisationName)
            .done()
                .optional(ChangeOrganisationRequest::getRequestTimestamp)
                .optional(ChangeOrganisationRequest::getCaseRoleId)
            .optional(
                ChangeOrganisationRequest::getApprovalStatus,
                NEVER_SHOW,
                ChangeOrganisationApprovalStatus.APPROVED.getValue()
            )
        .done();
}
```

<!-- source: apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemRequestNoticeOfChange.java:44-81 -->

## See also

- [Implement NoC](../how-to/implement-noc.md) — step-by-step guide to wiring NoC in a case type
- [AAC API reference](../reference/api-aac.md) — full endpoint reference for `aac-manage-case-assignment`
- [Role assignment](role-assignment.md) — how AAC writes role assignments after a NoC decision is applied

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

