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
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# API: AAC (aac-manage-case-assignment)

## TL;DR

- AAC runs on port 4454 and owns two capability areas: Notice of Change (NoC) under `/noc/**` and intra-org case assignment under `/case-assignments` and `/case-users`.
- NoC is a multi-step flow: fetch challenge questions → verify answers → submit request → check approval → apply decision.
- `/noc/apply-decision` always returns HTTP 200; validation errors appear in `response.errors[]`, not as 4xx.
- `/case-assignments` writes roles to ccd-data-store `/case-users`; `/case-users` writes directly to AMRAS — two different persistence paths.
- `ChangeOrganisationRequest.ApprovalStatus` uses numeric strings: `"0"` = Pending, `"1"` = Approved, `"2"` = Rejected.
- Routes under `/ccd/**` are proxied to ccd-data-store-api; allowed paths controlled by `ccd.data-store.allowed-urls`.

## Notice of Change endpoints

All endpoints are on `@RequestMapping("/noc")` in `NoticeOfChangeController`.

| Method | Path | Request | Response | Notes |
|--------|------|---------|----------|-------|
| `GET` | `/noc/noc-questions` | `?case_id=` (Luhn-validated) | `ChallengeQuestionsResult` | Answer values stripped before return (`NoticeOfChangeController:190`) |
| `POST` | `/noc/verify-noc-answers` | `VerifyNoCAnswersRequest` | `VerifyNoCAnswersResponse` | Checks answers match exactly one `caseRoleId` |
| `POST` | `/noc/noc-requests` | `RequestNoticeOfChangeRequest` | `RequestNoticeOfChangeResponse` | HTTP 201; combines verify + submit internally |
| `POST` | `/noc/noc-prepare` | `AboutToStartCallbackRequest` | `AboutToStartCallbackResponse` | CCD callback — populates `CaseRoleId` DynamicList |
| `POST` | `/noc/set-organisation-to-remove` | `CallbackRequest` | `AboutToSubmitCallbackResponse` | Copies matching `OrganisationPolicy.Organisation` into `COR.OrganisationToRemove` |
| `POST` | `/noc/check-noc-approval` | `CallbackRequest` | `SubmitCallbackResponse` | Reads `COR.ApprovalStatus`; triggers decision event if `"1"` or `"APPROVED"` (`NoticeOfChangeController:516-517`) |
| `POST` | `/noc/apply-decision` | `ApplyNoCDecisionRequest` | `ApplyNoCDecisionResponse` | CCD callback shape; always HTTP 200; errors in `response.errors[]` (`NoticeOfChangeController:361-367`) |

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
