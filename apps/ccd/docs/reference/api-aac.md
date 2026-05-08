---
topic: notice-of-change
audience: both
sources:
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/NoticeOfChangeController.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/CaseAssignmentController.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/CaseAssignedUserRolesController.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/domain/ChangeOrganisationRequest.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/ras/RoleAssignmentService.java
  - aac-manage-case-assignment:src/main/resources/application.yaml
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/ChallengeAnswerValidator.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/noc/ApplyNoCDecisionService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/errorhandling/noc/NoCValidationError.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/domain/PreviousOrganisation.java
status: confluence-augmented
confluence:
  - id: "1452902365"
    title: "API Operation: Request Notice of Change"
    last_modified: "unknown"
    space: "ACA"
  - id: "1457312216"
    title: "API Operation: Apply Notice of Change Decision"
    last_modified: "unknown"
    space: "ACA"
  - id: "1454899819"
    title: "API Operation: Verify NoC Answers"
    last_modified: "unknown"
    space: "ACA"
  - id: "1454899818"
    title: "API Operation: Get NoC Questions"
    last_modified: "unknown"
    space: "ACA"
  - id: "1457321193"
    title: "API Operation: Check for Notice of Change Approval"
    last_modified: "unknown"
    space: "ACA"
  - id: "1404567910"
    title: "API Operation: Add Case-Assigned Users and Roles"
    last_modified: "unknown"
    space: "RCCD"
confluence_checked_at: "2026-04-29T00:00:00Z"
---

# API: AAC (aac-manage-case-assignment)

## TL;DR

- AAC runs on port 4454 and owns two capability areas: Notice of Change (NoC) under `/noc/**` and intra-org case assignment under `/case-assignments` and `/case-users`.
- NoC is a multi-step flow: fetch challenge questions (MCA-04) → verify answers (MCA-05) → submit request (MCA-06) → check approval (MCA-08) → apply decision (MCA-07).
- `/noc/apply-decision` always returns HTTP 200; validation errors appear in `response.errors[]`, not as 4xx. It also maintains `PreviousOrganisations` history and sends removal notification emails via GOV.UK Notify.
- `/case-assignments` writes roles to ccd-data-store `/case-users`; `/case-users` writes directly to AMRAS — two different persistence paths.
- `ChangeOrganisationRequest.ApprovalStatus` uses numeric strings: `"0"` = Pending, `"1"` = Approved, `"2"` = Rejected. The check-approval endpoint also accepts string names (`"APPROVED"`).
- Two system user accounts with distinct IdAM roles drive NoC events: `caseworker-caa` triggers `NoCRequest` events; `caseworker-approver` (noc-approver) triggers `NoCDecision` events.

## Notice of Change endpoints

All endpoints are on `@RequestMapping("/noc")` in `NoticeOfChangeController`.

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| `GET` | `/noc/noc-questions` | `?case_id=` (Luhn-validated) | `ChallengeQuestionsResult` | Answer values stripped before return (`NoticeOfChangeController:190`) |
| `POST` | `/noc/verify-noc-answers` | `VerifyNoCAnswersRequest` | `VerifyNoCAnswersResponse` | Checks answers match exactly one `caseRoleId` |
| `POST` | `/noc/noc-requests` | `RequestNoticeOfChangeRequest` | `RequestNoticeOfChangeResponse` | HTTP 201; re-runs verify then submits NoCRequest event; if auto-approved and invoker is a solicitor, also assigns case-roles to the invoker |
| `POST` | `/noc/noc-prepare` | `AboutToStartCallbackRequest` | `AboutToStartCallbackResponse` | CCD callback — populates `CaseRoleId` DynamicList |
| `POST` | `/noc/set-organisation-to-remove` | `CallbackRequest` | `AboutToSubmitCallbackResponse` | Copies matching `OrganisationPolicy.Organisation` into `COR.OrganisationToRemove` |
| `POST` | `/noc/check-noc-approval` | `CallbackRequest` | `SubmitCallbackResponse` | Submitted callback; reads `COR.ApprovalStatus`; triggers NoCDecision event if `"1"` or `"APPROVED"` (`NoticeOfChangeController:516-517`); uses `caseworker-approver` system user |
| `POST` | `/noc/apply-decision` | `ApplyNoCDecisionRequest` | `ApplyNoCDecisionResponse` | AboutToStart callback; always HTTP 200; errors in `response.errors[]`; updates OrganisationPolicy, manages PreviousOrganisations, adds/removes case-user roles, sends notification emails |

### VerifyNoCAnswersRequest shape

```json
{
  "case_id": "1234567890123456",
  "answers": [
    { "question_id": "QuestionId1", "value": "Smith" }
  ]
}
```

### RequestNoticeOfChangeRequest shape

```json
{
  "case_id": "1234567890123456",
  "answers": [
    { "question_id": "QuestionId1", "value": "Smith" }
  ]
}
```

### RequestNoticeOfChangeResponse shape

```json
{
  "status_message": "The Notice of Change request has been successfully submitted.",
  "case_role": "[Claimant]",
  "approval_status": "PENDING"
}
```

`approval_status` is the enum name (not the numeric value): either `"PENDING"` or `"APPROVED"` (`RequestNoticeOfChangeResponse:33`).

### VerifyNoCAnswersResponse shape

```json
{
  "status_message": "Notice of Change answers verified successfully",
  "organisation": {
    "OrganisationID": "QUK822NA",
    "OrganisationName": "Example Org"
  }
}
```

Returns the `Organisation` from the `OrganisationPolicy` that matched the answers. If the OrganisationPolicy has no incumbent, `organisation` will be null.

### ChallengeQuestionsResult shape (GET /noc/noc-questions)

```json
{
  "questions": [
    {
      "case_type_id": "MyCase",
      "order": 1,
      "question_text": "What is the party name?",
      "answer_field_type": {
        "id": "Text",
        "type": "Text",
        "min": null,
        "max": null,
        "regular_expression": null,
        "fixed_list_items": [],
        "complex_fields": [],
        "collection_field_type": null
      },
      "display_context_parameter": "#DATETIMEENTRY(dd/MM/yyyy)",
      "challenge_question_id": "NoC",
      "answer_field": "",
      "question_id": "QuestionId1",
      "ignore_null_fields": false
    }
  ]
}
```

The `answer_field` is always blank in the response — answer values are stripped before returning to the client (`NoticeOfChangeController:190`). The `display_context_parameter` tells the UI how to format Date/DateTime answers for submission.

## Answer comparison rules

When verifying NoC answers (`ChallengeAnswerValidator`), the following normalization applies:

| Field type | Comparison logic |
|-----------|-----------------|
| `Text` | Remove whitespace, hyphens (`-`), and apostrophes (`'`); then case-insensitive equals (`ChallengeAnswerValidator:123`) |
| `Date` / `DateTime` | Direct case-insensitive string comparison (UI formats per `display_context_parameter`) |
| All types | If expected (case field) is null/empty, the submitted answer must also be null/empty for a match (unless `ignore_null_fields` is true) |

A submitted answer set must match **exactly one** case role. Zero matches gives `answers-not-matched-any-litigant`; multiple matches gives `answers-not-identify-litigant`.

## NoC authorization rules

| Invoker role | Scope |
|-------------|-------|
| `pui-caa` (Case Access Administrator) | Can request NoC for a case in **any** jurisdiction (`NoticeOfChangeQuestions:111`) |
| Solicitor jurisdiction role (e.g. `caseworker-divorce-solicitor`) | Can only request NoC for cases in their own jurisdiction (`SecurityUtils.hasSolicitorAndJurisdictionRoles`) |

## NoC error codes

All NoC endpoints share the same error-code vocabulary, defined in `NoCValidationError.java`:

| Error code | Message | Thrown by |
|-----------|---------|-----------|
| `case-id-empty` | Case ID can not be empty | All NoC endpoints |
| `case-id-invalid` | Case ID has to be a valid 16-digit Luhn number | All NoC endpoints |
| `case-id-invalid-length` | Case ID has to be 16-digits long | All NoC endpoints |
| `answers-empty` | Challenge question answers can not be empty | verify, request |
| `answers-mismatch-questions` | The number of provided answers must match the number of questions - expected %s answers, received %s | verify, request |
| `answers-not-matched-any-litigant` | The answers did not match those for any litigant | verify, request |
| `answers-not-identify-litigant` | The answers did not uniquely identify a litigant | verify, request |
| `no-answer-provided-for-question` | No answer has been provided for question ID '%s' | verify, request |
| `no-org-policy` | No OrganisationPolicy exists on the case for the case role '%s' | verify, request, questions |
| `has-represented` | The requestor has answered questions uniquely identifying a litigant that they are already representing | verify, request |
| `multiple-noc-requests-on-user` | Multiple NoC Request events found for the user | questions, verify, request |
| `multiple-noc-requests-on-case` | More than one change request found on the case | questions, verify, request |
| `insufficient-privileges` | Insufficient privileges for notice of change request | questions, verify, request |
| `noc-event-unavailable` | No NoC events available for this case type | questions, verify, request |
| `noc-in-progress` | Ongoing NoC request in progress | questions, verify, request |
| `invalid-case-role` | CaseRole field within ChangeOrganisationRequest matched none or more than one OrganisationPolicy on the case | request |
| `missing-cor-case-role-id` | Missing ChangeOrganisationRequest.CaseRoleID %s in the case definition | request |

These are returned as HTTP 400 with body `{ "code": "<error-code>", "message": "<message>" }`.

## Case assignment endpoints

`/case-assignments` is conditionally enabled via `mca.conditional-apis.case-assignments.enabled` (env: `MCA_CONDITIONAL_APIS_CASE_ASSIGNMENTS_ENABLED`, default `true`) (`CaseAssignmentController:42`).

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| `POST` | `/case-assignments` | `CaseAssignmentRequest` | `CaseAssignmentResponse` | Validates assignee is in caller's PRD org; writes to data-store `/case-users` |
| `GET` | `/case-assignments` | `?case_ids=` | `GetCaseAssignmentsResponse` | Returns only users in the same org |
| `DELETE` | `/case-assignments` | `CaseUnassignmentRequest` | 200 | If `case_roles` omitted, fetches existing roles to expand |

### CaseAssignmentRequest shape

```json
{
  "case_id": "1234567890123456",
  "case_type_id": "MyCase",
  "assignee_id": "idam-user-uuid"
}
```

### GetCaseAssignmentsResponse shape

```json
{
  "case_assignments": [
    {
      "case_id": "1234567890123456",
      "shared_with": [
        {
          "idam_id": "uuid",
          "first_name": "Jane",
          "last_name": "Doe",
          "email": "jane@example.com",
          "case_roles": ["[SOLICITOR]"]
        }
      ]
    }
  ]
}
```

### CaseUnassignmentRequest shape

```json
{
  "unassignments": [
    {
      "case_id": "1234567890123456",
      "assignee_id": "idam-user-uuid",
      "case_roles": ["[SOLICITOR]"]
    }
  ]
}
```

## Case-user role endpoints (AMRAS-backed)

`/case-users` is not guarded by the conditional property. It routes through AMRAS. Inbound S2S is gated to `aac_manage_case_assignment,xui_webapp` (`CaseAssignedUserRolesController:289-295`).

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| `POST` | `/case-users` | `CaseAssignedUserRolesRequest` | 200 | Writes to AMRAS; increments `orgs_assigned_users.<orgId>` supplementary data |
| `GET` | `/case-users` | `?case_ids=&user_ids=` | `CaseAssignedUserRolesResource` | Queries AMRAS |
| `DELETE` | `/case-users` | `CaseAssignedUserRolesRequest` | 200 | Deletes from AMRAS; decrements supplementary data; `[CREATOR]` excluded from counts (`CaseAccessOperation:258`) |

### CaseAssignedUserRolesRequest shape

```json
{
  "case_users": [
    {
      "case_id": "1234567890123456",
      "user_id": "idam-user-uuid",
      "case_role": "[SOLICITOR]",
      "organisation_id": "org-uuid"
    }
  ]
}
```

## ChangeOrganisationRequest field

The `ChangeOrganisationRequest` (COR) is a CCD complex field of type `"ChangeOrganisationRequest"` embedded in case data. Its key in `case_data` is discovered dynamically by scanning all field values — there is no fixed field name.

| JSON property | Type | Description |
|---------------|------|-------------|
| `OrganisationToAdd` | `Organisation` | Incoming organisation |
| `OrganisationToRemove` | `Organisation` | Outgoing organisation |
| `CaseRoleId` | `DynamicList` | Selected case role (`{ value: { code, label }, listItems[] }`) |
| `RequestTimestamp` | `LocalDateTime` | When the request was created |
| `ApprovalStatus` | `String` | `"0"` Pending / `"1"` Approved / `"2"` Rejected |
| `CreatedBy` | `String` | Email of the requestor |

After a decision is applied, `CaseRoleId` is nullified by `ApplyNoCDecisionService` to mark the request complete (`ApplyNoCDecisionService:90`).

### PreviousOrganisations

When `/noc/apply-decision` removes or replaces representation, it appends an entry to the `OrganisationPolicy.PreviousOrganisations` collection (`ApplyNoCDecisionService:141`). Each entry has the shape:

```json
{
  "value": {
    "OrganisationName": "Old Firm LLP",
    "FromTimestamp": "2024-01-15T10:30:00",
    "ToTimestamp": "2024-06-20T14:00:00",
    "OrganisationAddress": {
      "AddressLine1": "1 High Street",
      "PostTown": "London",
      "PostCode": "EC1A 1BB"
    }
  }
}
```

| Property | Source |
|----------|--------|
| `FromTimestamp` | Previous `PreviousOrganisation.ToTimestamp` if one exists, otherwise case creation timestamp |
| `ToTimestamp` | Current time (when decision is applied) |
| `OrganisationName` | Looked up from PRD for the outgoing organisation |
| `OrganisationAddress` | Looked up from PRD for the outgoing organisation |

### Removal notification emails

When users lose access to a case (representation removed or replaced), `ApplyNoCDecisionService` calls `NotifyService` to send GOV.UK Notify emails to each affected user. The template is configured via:

- `notify.api-key`: `NOTIFY_MCA_API_KEY`
- `notify.email-template-id`: `NOTIFY_EMAIL_TEMPLATE_ID` (default: `a60215dd-08bb-475e-956c-e97fdb7e448c`)

## NoC system accounts

The NoC flow uses two separate system IDAM accounts, each with access to exactly one event type. This ensures the system cannot accidentally trigger the wrong event:

| Account | IdAM role | Event access | Used by |
|---------|-----------|-------------|---------|
| `caa` | `caseworker-caa` | `NoCRequest` event | `/noc/noc-requests` (MCA-06) |
| `noc-approver` | `caseworker-approver` | `NoCDecision` event | `/noc/check-noc-approval` (MCA-08) |

The `noc-approver` account should also have the `prd-aac-system` IdAM role, allowing all PRD external interfaces to be called with the invoking user.

### on_behalf_of_token

When submitting the `NoCRequest` event, AAC passes an `on_behalf_of_token` field containing the IDAM token of the actual invoking user. The Data Store uses this to:

- Store the invoker's user information in the audit event
- Store the system account information in the `proxied_by` field of the audit event

This distinguishes the real requestor from the system account that technically submits the event.

## Authentication

| Concern | Value |
|---------|-------|
| Service name | `aac_manage_case_assignment` |
| S2S secret env | `MANAGE_CASE_S2S_KEY` |
| Authorised inbound services | `xui_webapp,ccd_data,finrem_case_orchestration,prl_cos_api,et_cos,et_sya_api` (configurable) |
| `/case-users` additional S2S gate | `aac_manage_case_assignment,xui_webapp` |
| System IDAM accounts | `caa` (general), `noc-approver` (decision event) |
| Token cache TTL | 1800 s (Caffeine) |

## See also

- [Notice of Change](../explanation/notice-of-change.md) — end-to-end NoC flow narrative
- [Implement NoC](../how-to/implement-noc.md) — how to configure a case type to support Notice of Change
- [Glossary](glossary.md) — COR, DynamicList, OrganisationPolicy definitions
