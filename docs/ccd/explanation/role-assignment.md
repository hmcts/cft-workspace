---
topic: role-assignment
audience: both
sources:
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/CaseAssignmentController.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/controller/CaseAssignedUserRolesController.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/CaseAssignmentService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/cau/CaseAccessOperation.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/ras/RoleAssignmentService.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/service/ras/RoleAssignmentServiceHelperImpl.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/api/payload/RoleAssignment.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/domain/ChangeOrganisationRequest.java
  - aac-manage-case-assignment:src/main/java/uk/gov/hmcts/reform/managecase/ApplicationParams.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Role Assignment

## TL;DR

- Case-level RBAC in CCD is backed by **am-role-assignment-service** (AMRAS); roles are persisted as `CASE`-type `RoleAssignment` records with `grantType=SPECIFIC`.
- **aac-manage-case-assignment** (AAC) is the orchestrator: it owns two separate flows — intra-organisation case assignment (`/case-assignments`) and AMRAS-direct role management (`/case-users`).
- `OrganisationPolicy` fields in case data bind a case role (e.g. `[Claimant]`) to a PRD organisation; AAC reads these to determine which roles to grant or revoke.
- The `ChangeOrganisationRequest` (COR) CCD field tracks an in-flight Notice of Change: `ApprovalStatus` `"0"`/`"1"`/`"2"` (Pending/Approved/Rejected), `CaseRoleId` as a `DynamicList`, and the organisations being swapped.
- Role assignments created by AAC always carry `process="CCD"`, `reference="{caseId}-{userId}"`, and attributes `{ jurisdiction, caseType, caseId }`.
- Supplementary data field `orgs_assigned_users.<orgId>` on the case is kept in sync by AAC after every add/remove.

## How AAC orchestrates role assignment

AAC (`aac-manage-case-assignment`, port 4454) sits between XUI and three downstream systems: `ccd-data-store-api`, `ccd-definition-store-api`, and AMRAS. It also calls PRD to resolve organisation membership.

There are two persistence paths for case-level roles, and they are distinct:

| Path | Endpoint | Writes to |
|---|---|---|
| Intra-org assignment | `POST /case-assignments` | data-store `/case-users` |
| AMRAS-direct | `POST /case-users` | AMRAS `/am/role-assignments` |
| NoC `applyDecision` bulk assign | internal | data-store `/case-users` |

The `/case-assignments` controller is conditionally enabled via `mca.conditional-apis.case-assignments.enabled` (env `MCA_CONDITIONAL_APIS_CASE_ASSIGNMENTS_ENABLED`, default `true`) (`CaseAssignmentController:42`).

The `/case-users` controller is not behind this flag but is gated by S2S: only `aac_manage_case_assignment` and `xui_webapp` may call it (`CaseAssignedUserRolesController:289-295`).

## OrganisationPolicy and case roles

Each `OrganisationPolicy` field in case data binds one case role to a PRD organisation:

```json
{
  "Organisation": { "OrganisationID": "ABC123", "OrganisationName": "Smith LLP" },
  "OrgPolicyCaseAssignedRole": "[Claimant]",
  "PreviousOrganisations": []
}
```

When `CaseAssignmentService.assignCaseAccess` runs (`CaseAssignmentService:58`), it:

1. Loads the case from data-store.
2. Calls PRD to confirm the assignee is a member of the invoker's organisation.
3. Validates the assignee holds solicitor + jurisdiction roles in IDAM.
4. Finds all `OrganisationPolicy` roles matching the invoker's org.
5. Calls `dataStoreRepository.assignCase(policyRoles, caseId, assigneeId, orgId)` — writing to data-store `/case-users`.

`getCaseAssignments` (`CaseAssignmentService:83`) filters results to users in the same PRD org; roles belonging to other organisations are not returned.

## RoleAssignment lifecycle

When `CaseAccessOperation.addCaseUserRoles` runs (`CaseAccessOperation:112`):

1. Existing AMRAS assignments are fetched for the case/user pair.
2. Already-existing roles are filtered out (no duplicate creation).
3. `RoleAssignmentService.createCaseRoleAssignments` builds a `RoleRequestResource` with `process="CCD"`, `reference="{caseId}-{userId}"`.
4. Each `RoleAssignmentResource` is created with: `actorIdType=IDAM`, `roleType=CASE`, `grantType=SPECIFIC`, `classification=RESTRICTED`, `readOnly=false`, `beginTime=now()`.
5. AMRAS is called via `RestTemplate` (not Feign) at `POST /am/role-assignments` (`RoleAssignmentServiceHelperImpl:67`).
6. Supplementary data `orgs_assigned_users.<orgId>` on the case is incremented (`CaseAccessOperation:151`).

On removal (`CaseAccessOperation.removeCaseUserRoles`, `CaseAccessOperation:62`):

1. Existing AMRAS assignments are checked — non-existent ones are silently ignored.
2. A `MultipleQueryRequestResource` containing `RoleAssignmentQuery { caseId, userId, roleNames[] }` is POSTed to `POST /am/role-assignments/query/delete` (`ApplicationParams:91`).
3. Supplementary data count is decremented (`CaseAccessOperation:108`).
4. The `[CREATOR]` role is explicitly excluded from supplementary data counts (`CaseAccessOperation:258`).

`RoleAssignment.isNotExpiredRoleAssignment()` treats null `beginTime` and `endTime` as unbounded (`RoleAssignment:27`).

## ChangeOrganisationRequest field

The `ChangeOrganisationRequest` (COR) is a structured CCD field type that carries an in-flight representation change. Its shape:

```json
{
  "OrganisationToAdd":    { "OrganisationID": "...", "OrganisationName": "..." },
  "OrganisationToRemove": { "OrganisationID": "...", "OrganisationName": "..." },
  "CaseRoleId":           { "value": { "code": "[Claimant]", "label": "..." }, "list_items": [] },
  "RequestTimestamp":     "2026-01-15T10:00:00",
  "ApprovalStatus":       "0",
  "CreatedBy":            "solicitor@example.com"
}
```

`ApprovalStatus` stores numeric strings: `"0"` = Pending, `"1"` = Approved, `"2"` = Rejected. The `check-noc-approval` endpoint also accepts the string `"APPROVED"` as equivalent to `"1"` (`NoticeOfChangeController:516-517`).

The COR field has no fixed name in case data — AAC discovers it at runtime by scanning all case data nodes for children named `OrganisationToAdd` and `OrganisationToRemove` (`CaseDetails:82-92`).

An ongoing NoC is detected by `hasCaseRoleId()` (`CaseDetails:144`): returns true when any COR node has a non-null `CaseRoleId`. A second concurrent NoC request is blocked at that point.

After a decision is applied, `ApplyNoCDecisionService` nullifies `CaseRoleId` in the COR (via `jacksonUtils.nullifyObjectNode`) to mark it complete, but leaves the other COR fields in place (`ApplyNoCDecisionService:90`).

## Case assignment vs NoC: key distinction

Both flows ultimately affect who can access a case, but they are separate mechanisms:

- **`/case-assignments`** — intra-org sharing. A solicitor shares a case with a colleague in the same PRD organisation. No challenge questions, no approval workflow. Writes directly to data-store `/case-users`.
- **NoC** — change of representation. A solicitor from a different organisation proves they represent a litigant by answering challenge questions, then waits for approval before roles are transferred. See the NoC explanation page for the full multi-step protocol.

The NoC `applyDecision` path (`ApplyNoCDecisionService:163,200`) bulk-assigns all PRD org members of the incoming organisation and bulk-removes those of the outgoing organisation. This also goes through data-store `/case-users`, not AMRAS directly.

## System accounts

AAC uses two IDAM system accounts:

| Account | Purpose |
|---|---|
| `caa` | General system-level data-store calls; token cached 1800s |
| `noc-approver` | Triggers the NoC decision event via `NocApprovalDataStoreRepository`; separate identity for audit |

Tokens are cached in Caffeine with a 1800s TTL (`application.yaml:38-39`).

## AMRAS endpoints used

| Operation | Method + path |
|---|---|
| Create role assignments | `POST /am/role-assignments` |
| Query role assignments | `POST /am/role-assignments/query` |
| Delete by query | `POST /am/role-assignments/query/delete` |

Base URL from `role.assignment.api.host` (env `ROLE_ASSIGNMENT_URL`, default `http://localhost:5555`) (`ApplicationParams:83`).

## See also

- [`docs/ccd/explanation/notice-of-change.md`](notice-of-change.md) — full NoC multi-step protocol including challenge questions and approval workflow
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions for OrganisationPolicy, COR, AMRAS, grantType
