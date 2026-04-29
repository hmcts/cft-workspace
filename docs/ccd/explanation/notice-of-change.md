---
topic: notice-of-change
audience: both
sources:
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/NoticeOfChangeController.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/domain/ChangeOrganisationRequest.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/NoticeOfChangeQuestions.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/ChallengeAnswerValidator.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/VerifyNoCAnswersService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/ApplyNoCDecisionService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/RequestNoticeOfChangeService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/client/definitionstore/DefinitionStoreApiClientConfig.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemApplyNoticeOfChange.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemRequestNoticeOfChange.java
  - nfdiv-case-api:src/main/java/uk/gov/hmcts/divorce/noticeofchange/client/AssignCaseAccessClient.java
examples_extracted_from:
  - apps/nfdiv/nfdiv-case-api/src/main/java/uk/gov/hmcts/divorce/noticeofchange/event/SystemRequestNoticeOfChange.java
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# Notice of Change

## TL;DR

- Notice of Change (NoC) is the protocol by which a new solicitor proves identity, claims representation of a litigant, and displaces the existing solicitor — without a caseworker intervening.
- The case-type definition owns two artefacts: a `NoCEvent` CCD event and a `ChangeOrganisationRequest` (COR) complex field on the case type.
- `aac-manage-case-assignment` (AAC, port 4454) orchestrates the multi-step flow: challenge questions, answer verification, role assignment, and notification.
- The COR field (`ChangeOrganisationRequest`) tracks the in-flight request — `CaseRoleId`, `OrganisationToAdd`, `OrganisationToRemove`, `ApprovalStatus`, `RequestTimestamp`.
- `ApprovalStatus` uses numeric strings: `"0"` = Pending, `"1"` = Approved, `"2"` = Rejected.
- After a decision, AAC bulk-assigns roles to all PRD org users of the incoming org and removes roles for the outgoing org; it also appends a `PreviousOrganisations` audit entry and emails removed solicitors via GOV.UK Notify.

## The ChangeOrganisationRequest field

Every case type that supports NoC must carry exactly one field of CCD complex type `ChangeOrganisationRequest`. AAC discovers it at runtime by scanning case data for nodes containing both `OrganisationToAdd` and `OrganisationToRemove` children — there is no fixed field name (`CaseDetails.java:82-92`).

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
  "CreatedBy": "solicitor@acme.example"
}
```

`CaseRoleId` is a `DynamicList`, not a plain string. `ApplyNoCDecisionService` reads the selected role via JSON path `/CaseRoleId/value/code` (`ApplyNoCDecisionService.java:103`). After the decision is applied, `CaseRoleId` is nullified to mark the request complete; the other COR fields are left in place.

## Challenge questions

Challenge questions are defined in the case-type definition under question group id `NoCChallenge` (hardcoded in `NoticeOfChangeQuestions.java:39`). Each question carries a list of candidate answers, each referencing a `caseRoleId` and a set of `fieldIds` — dot-separated paths into case data — whose values the solicitor must supply correctly to prove identity.

AAC fetches questions via definition-store:

```
GET api/display/challenge-questions/case-type/{ctid}/question-groups/NoCChallenge
```

The public `GET /noc/noc-questions?case_id=` endpoint strips answer values before returning to the caller (`NoticeOfChangeQuestions.java:64`); the internal verify path retains them for matching.

Answer matching (`ChallengeAnswerValidator.java:30`):

1. Answer count must equal question count.
2. For each question, the submitted answer is looked up by `questionId`.
3. Candidate answers are compared; text fields strip whitespace and `-'` characters and are case-insensitive (`ChallengeAnswerValidator.java:122`).
4. Exactly one `caseRoleId` must have all answers correct — zero answers throws `ANSWERS_NOT_MATCH_LITIGANT`; more than one throws `ANSWERS_NOT_IDENTIFY_LITIGANT`.
5. If the matched organisation is already the caller's own org, `VerifyNoCAnswersService` throws `REQUESTOR_ALREADY_REPRESENTS` (`VerifyNoCAnswersService.java:50`).

## AAC endpoints

All NoC endpoints are under `@RequestMapping("/noc")` (`NoticeOfChangeController.java`):

| Endpoint | Method | Purpose |
|---|---|---|
| `/noc/noc-questions` | GET | Returns challenge questions (answers stripped). Validates `case_id` with Luhn check. |
| `/noc/verify-noc-answers` | POST | Verifies submitted challenge answers; returns matched `caseRoleId`. |
| `/noc/noc-prepare` | POST | CCD about-to-start callback; populates `CaseRoleId` DynamicList of eligible roles. |
| `/noc/set-organisation-to-remove` | POST | CCD callback; finds matching `OrganisationPolicy` and writes `OrganisationToRemove` into COR. |
| `/noc/noc-requests` | POST | Combined verify + submit in one call (HTTP 201 on success). |
| `/noc/check-noc-approval` | POST | CCD callback; reads `ApprovalStatus`; triggers decision event if `"1"` / `"APPROVED"`. |
| `/noc/apply-decision` | POST | CCD callback; applies approved NoC — assigns incoming org roles, removes outgoing org roles. Returns HTTP 200 even on soft errors; check `response.errors[]`. |

`/noc/apply-decision` always returns HTTP 200 — this is the CCD callback contract. Errors appear in the `errors[]` array of the response body (`NoticeOfChangeController.java:361-367`).

## What the case-type definition must provide

| Artefact | Where defined | Notes |
|---|---|---|
| `ChangeOrganisationRequest` field | Case type field list | Complex field of CCD type `ChangeOrganisationRequest`. Name is arbitrary; AAC finds it by structure scanning. |
| `NoCChallenge` question group | Challenge questions tab | Contains at least one question; each question references `fieldIds` (dot-paths) on the case type. |
| NoC CCD event (e.g. `NoCEvent`) | Event definition | Wired to AAC callbacks: `noc-prepare` (about-to-start), `set-organisation-to-remove` + `check-noc-approval` (about-to-submit or mid-event), `apply-decision` (submitted). |
| `OrganisationPolicy` fields | Case type | One per representable party role; `OrgPolicyCaseAssignedRole` value must match a `caseRoleId` in challenge questions. |

## Role assignment after decision

When a NoC is approved, `ApplyNoCDecisionService` (`ApplyNoCDecisionService.java:163,200`):

1. Calls PRD to resolve all users in `OrganisationToAdd`.
2. Calls `dataStoreRepository.assignCase(...)` to write `[CASE]` roles for all incoming org users via data-store `/case-users`.
3. Calls `dataStoreRepository.removeCaseUserRoles(...)` to remove roles for all users of `OrganisationToRemove`.
4. Appends a `PreviousOrganisation` entry (org name, address, from/to timestamps) to `OrganisationPolicy.PreviousOrganisations` — PRD is consulted for the address.
5. Sends an email to removed solicitors via GOV.UK Notify (`NotifyService`).

Role assignments are written to data-store `/case-users` (not directly to AMRAS) on the NoC decision path. The `/case-users` endpoint on AAC itself routes directly to AMRAS.

## Caller eligibility

`NoticeOfChangeQuestions.java:109`: the caller must hold role `pui-caa` OR have both a solicitor role AND a matching jurisdiction role (`securityUtils.hasSolicitorAndJurisdictionRoles`).

Guards checked before questions are returned:

- **Multiple COR guard**: if more than one COR node exists in case data, throws `CHANGE_REQUEST` (`NoticeOfChangeQuestions.java:127-128`).
- **Ongoing NoC guard**: if `COR.CaseRoleId` is non-null, throws `NOC_REQUEST_ONGOING` (`NoticeOfChangeQuestions.java:131-132`).

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

    DataStore->>AAC: POST /noc/check-noc-approval (submitted callback)
    Note over AAC: Reads COR.ApprovalStatus; "1" or "APPROVED" triggers decision
    AAC->>DataStore: POST /cases/{caseId}/events (trigger decision event, noc-approver system user)

    DataStore->>AAC: POST /noc/apply-decision (submitted callback)
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

| Term | Definition |
|---|---|
| **COR** | `ChangeOrganisationRequest` — the CCD complex field that carries an in-flight NoC request on the case. |
| **NoCChallenge** | The hardcoded question group ID used to fetch challenge questions from definition-store. |
| **AAC / MCA** | `aac-manage-case-assignment` — the microservice (port 4454) that owns the NoC and case-assignment flows. |
| **PRD** | Professional Reference Data service — queried to resolve organisation membership and address during NoC. |
| **AMRAS** | `am-role-assignment-service` — the role persistence layer; AAC's `/case-users` endpoint writes directly to AMRAS, while the NoC decision path writes via data-store `/case-users`. |
| **pui-caa** | IDAM role granting access to the NoC question endpoint; alternative to solicitor + jurisdiction role pair. |
