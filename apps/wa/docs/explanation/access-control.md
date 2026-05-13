---
title: Access Control
topic: access-control
diataxis: explanation
product: wa
audience: both
sources:
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/access/AccessControlService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/role/RoleAssignmentService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/RoleAssignmentVerificationService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/restrict/ClientAccessControlService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/entity/TaskRoleResource.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/clients/RoleAssignmentServiceApi.java
  - wa-task-management-api:src/main/resources/db/migration/V1.0.18__add_permissions_to_task_roles.sql
  - wa-task-management-api:src/main/resources/db/migration/V1.0.29__add_sensitive_task_event_logs_tables.sql
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/role/entities/enums/RoleCategory.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/controllers/TaskActionsController.java
status: reviewed
examples_extracted_from:
  - apps/wa/wa-task-management-api/src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java
  - apps/wa/wa-task-management-api/src/main/resources/application.yaml
confluence:
  - id: "1604494528"
    title: "Granular permission"
    last_modified: "unknown"
    space: "WA"
  - id: "1616388317"
    title: "Granular Task Permissions Onboarding"
    last_modified: "unknown"
    space: "WA"
  - id: "1498614353"
    title: "Cross-Role Assignment"
    last_modified: "unknown"
    space: "WA"
  - id: "1646233149"
    title: "Spike: Describing Role Assignment Verification Errors"
    last_modified: "unknown"
    space: "WA"
  - id: "1515364608"
    title: "WA Task Management API: GET /task/{task-id}/roles"
    last_modified: "unknown"
    space: "WA"
  - id: "1616388305"
    title: "Cross Role Assignment Onboarding"
    last_modified: "unknown"
    space: "WA"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- WA task access is enforced by matching a user's AM role assignments against per-task permission rows (`task_roles` table), entirely independent of CCD case-level access grants.
- Every user-facing request triggers a call to `am-role-assignment-service` to fetch the caller's role assignments; these are filtered by case-level match and required permissions before the action proceeds.
- The permission model is granular (16 types): `READ`, `OWN`, `EXECUTE`, `CLAIM`, `UNCLAIM`, `ASSIGN`, `UNASSIGN`, `MANAGE`, `CANCEL`, `COMPLETE`, `CANCEL_OWN`, `COMPLETE_OWN`, `UNCLAIM_ASSIGN`, `UNASSIGN_CLAIM`, `UNASSIGN_ASSIGN`, plus the deprecated `REFER`.
- Cross-role assignment (CRA) allows tasks to be executed across role categories (e.g. judiciary completing admin tasks) via the `OWN` vs `EXECUTE` permission distinction.
- Machine-to-machine (S2S) callers bypass the role-assignment check and are instead validated against allowlists of privileged or exclusive service names.
- Access failures are recorded in `sensitive_task_event_logs` (90-day TTL) in the database (not Application Insights) because role-assignment data is classified as sensitive.

## How task access control works

### The request flow

Every user-facing endpoint in `wa-task-management-api` follows a consistent pattern:

1. The controller extracts the `Authorization` (bearer) and `ServiceAuthorization` (S2S) headers.
2. `AccessControlService.getRoles(authToken)` (`AccessControlService:30`) calls IDAM to resolve the bearer token to a `userId`, then calls `RoleAssignmentService.getRolesForUser(uid, authToken)` to fetch the user's role assignments from AM.
3. If no role assignments are returned, the service throws `NoRoleAssignmentsFoundException` (mapped to HTTP 401).
4. The resulting `AccessControlResponse(UserInfo, List<RoleAssignment>)` is passed into the service layer where `RoleAssignmentVerificationService` performs task-level permission checks.

### Role assignment fetching

The Feign client `RoleAssignmentServiceApi` calls two AM endpoints:

| Endpoint | Media type | Usage |
|----------|-----------|-------|
| `GET /am/role-assignments/actors/{user-id}` | `application/vnd.uk.gov.hmcts.role-assignment-service.get-assignments+json;version=1.0` | Single-user fetch for user-facing requests |
| `POST /am/role-assignments/query` | version 2.0 | Paginated bulk query for auto-assignment |

Pagination is governed by `role-assignment-service.maxResults` (default 50). The service reads the `Total-Records` response header and iterates pages as needed (`RoleAssignmentService:109`).

### Task-level permission verification

`RoleAssignmentVerificationService.verifyRoleAssignments(taskId, roleAssignments, permissionsRequired)` (`RoleAssignmentVerificationService:40`) performs the core access decision:

1. Looks up the task's `caseId` from the database. If the task does not exist, throws `TaskNotFoundException` (HTTP 404).
2. Filters the user's role assignments: **ORGANISATION-type** assignments pass through unfiltered; **CASE-type** assignments are kept only if their `caseId` attribute matches the task's `caseId`. CASE-type assignments without a `caseId` attribute are silently dropped (`RoleAssignmentVerificationService:59`).
3. Delegates to `CftQueryService.getTask(taskId, filteredRAs, permissionsRequired)` which performs a database join between the `task_roles` table and the filtered role assignments.
4. If the join yields no match for the required permissions, throws `RoleAssignmentVerificationException` (HTTP 403) and logs the attempt to `sensitive_task_event_logs` asynchronously via an executor service.

The `task_roles` table stores one row per role-per-task, each containing boolean flags for every permission type. These rows are populated during task configuration from Camunda DMN output.

## The permission model

### Permission types

The `PermissionTypes` enum defines all granular permissions. The original model (`V1.0.18`) had 6 permissions; Release 4 introduced 10 additional fine-grained permissions:

| Permission | Enum value | Category | Meaning |
|-----------|-----------|----------|---------|
| `READ` | `Read` | Original | View the task in search results and via GET; controls visibility in All Work |
| `REFER` | `Refer` | Original (deprecated) | Redundant; not enforced. Retained in enum for backwards compatibility but marked `@Transient` in `TaskRoleResource` |
| `OWN` | `Own` | Original | Be assigned as the owner; eligible for auto-assignment; task appears in Available Tasks |
| `MANAGE` | `Manage` | Original | Task appears in All Work list; historically also allowed assign/unassign/complete (now split out) |
| `EXECUTE` | `Execute` | Original | Can be assigned and complete the task, but not auto-assigned; cross-role access path |
| `CANCEL` | `Cancel` | Original | Cancel any task matching the role |
| `COMPLETE` | `Complete` | Granular | Mark any matching task as complete (regardless of assignee) |
| `COMPLETE_OWN` | `CompleteOwn` | Granular | Complete only tasks where user is the current assignee |
| `CANCEL_OWN` | `CancelOwn` | Granular | Cancel only tasks where user is the current assignee |
| `CLAIM` | `Claim` | Granular | Self-assign an unassigned task |
| `UNCLAIM` | `Unclaim` | Granular | Release a task assigned to yourself |
| `ASSIGN` | `Assign` | Granular | Assign an unassigned task to any user (including self) |
| `UNASSIGN` | `Unassign` | Granular | Remove assignment from any user (including self) |
| `UNCLAIM_ASSIGN` | `UnclaimAssign` | Granular | Release from self and assign to another in one action |
| `UNASSIGN_CLAIM` | `UnassignClaim` | Granular | Remove assignment from another user and self-claim |
| `UNASSIGN_ASSIGN` | `UnassignAssign` | Granular | Reassign from one user to another |

<!-- CONFLUENCE-ONLY: The distinction between "Original" and "Granular" categories and the note that REFER is deprecated/redundant comes from Confluence "Granular permission" page. The @Transient annotation on refer is verified in source (TaskRoleResource.java:57). -->

> **Migration note**: When transitioning from the old model to granular permissions, the legacy equivalences are: `Manage` maps to `Manage` + `Unassign` + `Assign` + `Complete`; `Own` maps to `Own` + `Claim`; `Execute` maps to `Execute` + `Claim`; `Cancel` stays as `Cancel`.

### Permission requirements per action

Different endpoints require different permission combinations. The **assignee** (user being assigned the task) always needs `OWN` or `EXECUTE`. The **requester** (user triggering the action) needs the permissions listed below:

| Action | Requester permissions | Notes |
|--------|---------------------|-------|
| Get task | `READ` | |
| Get task role permissions | `READ` | `GET /task/{task-id}/roles` |
| Search (ALL_WORK) | `READ` + `MANAGE` | `MANAGE` governs All Work visibility |
| Search (AVAILABLE_TASKS) | `READ` + `OWN` + `CLAIM` | OWN+CLAIM must be on same DMN row |
| Claim (unassigned to self) | `CLAIM`+`OWN` or `CLAIM`+`EXECUTE` or `ASSIGN`+`OWN` or `ASSIGN`+`EXECUTE` | |
| Unclaim (self) | `UNCLAIM` or `UNASSIGN` | |
| Assign (unassigned to self/other) | `ASSIGN` or `CLAIM` | `CLAIM` only allows assign to self |
| Unassign (assigned to unassigned) | `UNASSIGN` or `UNCLAIM` | `UNCLAIM` only if requester is current assignee |
| Reassign (assigned to different user) | `UNASSIGN_ASSIGN` or (`UNASSIGN`+`ASSIGN`) or `UNCLAIM_ASSIGN` or (`UNCLAIM`+`ASSIGN`) or `UNASSIGN_CLAIM` or (`UNASSIGN`+`CLAIM`) | Compound permissions allow single-action reassignment |
| Complete (self) | `OWN` or `EXECUTE` (+ is assignee) or `COMPLETE_OWN` (+ is assignee) | |
| Complete (other or privileged) | `COMPLETE` | Privileged S2S callers can also complete |
| Cancel (self) | `CANCEL` or `CANCEL_OWN` | `CANCEL_OWN` only if requester is assignee |
| Cancel (other) | `CANCEL` | |
| Search for completable | `OWN` or `EXECUTE` | |

<!-- CONFLUENCE-ONLY: The detailed assign/unassign/reassign scenarios and the MANAGE requirement for ALL_WORK come from Confluence "Granular permission" page. Source confirms the permission builder patterns. -->

### How permissions are populated on tasks

During task initiation, `ConfigureTaskService` evaluates Camunda DMN rules that return role-permission mappings. These are stored as `TaskRoleResource` rows in the `task_roles` table. Each row associates a `roleName` (e.g. `tribunal-caseworker`, `senior-tribunal-caseworker`) with permission booleans and configuration flags:

- `auto_assignable` — whether auto-assignment should target this role
- `assignment_priority` — ordering for auto-assignment; also used as the tie-break when ordering reassignment options in the UI
- `role_category` — one of `JUDICIAL` (J), `LEGAL_OPERATIONS` (L), `ADMIN` (A), `CTSC` (C), `ENFORCEMENT` (E)
- `authorizations` — a `text[]` array of jurisdiction codes (e.g. `["IAC", "SSCS"]`) that restricts which services can use this role-permission mapping

**DMN configuration rules**:
- `OWN` and `CLAIM` permissions **must appear on the same row** in the permissions DMN; otherwise the task will not appear in the Available Tasks screen.
- Ensure there are **no spaces after commas** in the DMN permission strings, as this will break permission parsing.

### The `GET /task/{task-id}/roles` endpoint

This endpoint returns the role-permission configuration for a given task, allowing the UI to determine which actions to offer each user. It requires `READ` permission on the task.

Response shape:
```json
{
  "roles": [
    {
      "role_category": "legal-ops",
      "role_name": "tribunal-caseworker",
      "permissions": ["OWN", "EXECUTE", "READ", "MANAGE", "CANCEL"],
      "authorisations": ["IAC", "SSCS"]
    }
  ]
}
```

The `authorisations` array corresponds to the `authorizations` column in `task_roles` and restricts which jurisdictions the role-permission row applies to.

## Cross-role assignment (CRA)

Cross-role assignment allows tasks to be completed by users outside the task's "natural" role category. For example, a judicial task can be assigned to and completed by a legal operations user. This is governed entirely by the `OWN` vs `EXECUTE` permission distinction:

| Capability | `OWN` | `EXECUTE` (without `OWN`) |
|-----------|-------|--------------------------|
| Auto-assignable (subject to `auto_assignable` flag) | Yes | No |
| Appears in "Available Tasks" | Yes | No |
| Can be assigned the task | Yes | Yes |
| Can claim the task | Yes (with `CLAIM`) | Yes (with `CLAIM`) |
| Can complete the task | Yes | Yes |
| Appears in "My Tasks" when assigned | Yes | Yes |
| Visible in case-view task list | Yes | Yes |

CRA is configurable per task type in the DMN. The `role_category` column on each `task_roles` row determines which category of user gets which permission level. When reassigning a task, the UI queries `GET /task/{task-id}/roles` to discover which role categories have `OWN` or `EXECUTE` permission, then presents them as reassignment options ordered by `assignment_priority`.

<!-- CONFLUENCE-ONLY: The CRA behavioural rules (available tasks visibility, auto-assignment restriction to OWN) come from Confluence "Cross-Role Assignment" and "Cross Role Assignment Onboarding" pages. Source confirms auto_assignable and assignment_priority fields on TaskRoleResource. -->

## CCD case access vs WA task access

CCD and WA enforce access independently. A user who has CCD case-level access (via `AuthorisationCaseField` / `AuthorisationCaseEvent` definitions) does **not** automatically have WA task access for the same case, and vice versa.

| Dimension | CCD case access | WA task access |
|-----------|----------------|----------------|
| Governed by | CCD definition spreadsheet (AuthorisationCaseField/Event/State) | `task_roles` table populated from Camunda DMN |
| Checked against | User roles in IDAM (CCD role-based) and AM case-role grants | AM role assignments matched per-task |
| Scope | Per case type, per field/event/state | Per individual task instance |
| Enforcement point | `ccd-data-store-api` | `wa-task-management-api` |
| Grant granularity | CRUD on fields, access to events | 16 discrete permission types |

In practice both systems consume role assignments from `am-role-assignment-service`, but they evaluate them against different permission schemas. A `tribunal-caseworker` role assignment scoped to a case may grant both CCD access (because the definition authorises that role) and WA task access (because the task's DMN configuration maps that role to permissions) — but these are two independent evaluations.

## Service-to-service (S2S) access tiers

Machine callers bypass the AM role-assignment flow entirely. Instead, `ClientAccessControlService` validates the S2S token against configured allowlists:

| Tier | Allowlist (`application.yaml`) | Capabilities |
|------|-------------------------------|--------------|
| **Privileged** | `wa_task_management_api`, `xui_webapp`, `ccd_case_disposer` | Supply `CompletionOptions` on complete; delete tasks by case |
| **Exclusive** | `wa_task_management_api`, `wa_task_monitor`, `wa_case_event_handler`, `wa_workflow_api` | Initiate tasks, terminate tasks, run batch operations, add notes |

The check is performed by `ClientAccessControlService.hasPrivilegedAccess` (`ClientAccessControlService:42`) and `hasExclusiveAccess` (`ClientAccessControlService:72`), both of which call `ServiceAuthTokenValidator.getServiceName()` to extract the service identity from the S2S JWT.

## Security audit trail

When a role-assignment verification fails (403), the service writes a record to the `sensitive_task_event_logs` table (`V1.0.29`). The write is performed **asynchronously** via an executor service to avoid adding latency to the error response path.

Each record contains:

| Column | Type | Content |
|--------|------|---------|
| `id` | UUID (PK) | Auto-generated |
| `request_id` | String | Application Insights operation ID for correlation |
| `correlation_id` | String | Request correlation ID |
| `task_id` | String | The task that was being accessed |
| `case_id` | String | The case associated with the task |
| `message` | String | The specific error message (e.g. `ROLE_ASSIGNMENT_VERIFICATIONS_FAILED`) |
| `user_data` | JSONB | The requesting user's identity and full role-assignment snapshot |
| `task_data` | JSONB | The task state (including `TaskRoleResource` entries) at the time of the rejected request |
| `expiry_time` | TIMESTAMP WITH TIME ZONE | Automatically set to 90 days from creation |
| `log_event_time` | TIMESTAMP WITH TIME ZONE | When the failure occurred |

**Why a database table?** Role-assignment data is classified as **sensitive** (contains IDAM-linked identity information). It cannot be logged to Application Insights or AKS pod logs because those do not have sufficient access controls. Only SC-cleared individuals have access to production databases, making the database the approved storage location for this data.

The `CLEANUP_SENSITIVE_LOG_ENTRIES` batch operation (run by `wa-task-monitor`) periodically deletes rows whose `expiry_time` has passed. This provides a time-limited forensic record of access-control failures without unbounded storage growth. The logging level is configurable -- it can range from logging only errors to logging all requests.

## Error responses

Access-control failures return standard `application/problem+json` responses:

**Role assignment verification failure (403)**:
```json
{
  "type": "https://github.com/hmcts/wa-task-management-api/problem/role-assignment-verification-error",
  "title": "Role Assignment Verification Error",
  "status": 403,
  "detail": "The request failed the Role Assignment checks performed."
}
```

**No role assignments found (401)**:
```json
{
  "type": "https://github.com/hmcts/wa-task-management-api/problem/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "User did not have sufficient permissions to perform this action"
}
```

These error responses are intentionally generic and do not specify which condition failed. The detailed failure context (role assignments + task state) is captured only in `sensitive_task_event_logs` for security-cleared personnel to investigate.

## Examples

### PermissionTypes enum

All 16 granular permission types. The first value in each pair is the JSON serialisation; the second is the `task_roles` table column name:

```java
// Source: apps/wa/wa-task-management-api/src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java
public enum PermissionTypes {
    READ("Read", "read"),
    REFER("Refer", "refer"),              // legacy — @Transient on TaskRoleResource; not enforced
    OWN("Own", "own"),
    MANAGE("Manage", "manage"),
    EXECUTE("Execute", "execute"),
    CANCEL("Cancel", "cancel"),
    COMPLETE("Complete", "complete"),
    COMPLETE_OWN("CompleteOwn", "completeOwn"),
    CANCEL_OWN("CancelOwn", "cancelOwn"),
    CLAIM("Claim", "claim"),
    UNCLAIM("Unclaim", "unclaim"),
    ASSIGN("Assign", "assign"),
    UNASSIGN("Unassign", "unassign"),
    UNCLAIM_ASSIGN("UnclaimAssign", "unclaimAssign"),
    UNASSIGN_CLAIM("UnassignClaim", "unassignClaim"),
    UNASSIGN_ASSIGN("UnassignAssign", "unassignAssign");
}
```

### S2S access-tier configuration

```yaml
// Source: apps/wa/wa-task-management-api/src/main/resources/application.yaml
config:
  # Privileged: may supply completionOptions, delete tasks by case
  privilegedAccessClients: ${TASK_MANAGEMENT_PRIVILEGED_CLIENTS:wa_task_management_api,xui_webapp,ccd_case_disposer}
  # Exclusive: may initiate/terminate tasks, run bulk operations, add notes
  exclusiveAccessClients: ${TASK_MANAGEMENT_EXCLUSIVE_CLIENTS:wa_task_management_api,wa_task_monitor,wa_case_event_handler,wa_workflow_api}

idam:
  s2s-authorised:
    # All services allowed to call the API at all (basic S2S gate)
    services: ${WA_S2S_AUTHORIZED_SERVICES:ccd,ccd_data,ccd_gw,ccd_ps,iac,wa_task_management_api,xui_webapp,wa_task_monitor,camunda_bpm,wa_workflow_api,wa_case_event_handler,ccd_case_disposer,civil_service,sscs}
```

## See also

- [Task Lifecycle](task-lifecycle.md) — how permissions are checked at each state transition (claim, assign, complete, cancel)
- [DMN Task Configuration](dmn-task-configuration.md) — how the Permissions DMN populates `task_roles` rows; `OWN`+`CLAIM` same-row constraint
- [Task States](../reference/task-states.md) — permissions required per endpoint in a single reference table
- [How-to: Write DMN Configuration](../how-to/write-dmn-configuration.md) — step 4 covers authoring the permissions DMN with correct role rows
- [Glossary](../reference/glossary.md) — definitions of access-control terms (ABAC, CRA, task_roles, sensitive_task_event_logs)
