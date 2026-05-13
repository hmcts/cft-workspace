---
title: Api Task Management
topic: architecture
diataxis: reference
product: wa
audience: both
sources:
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/controllers/TaskActionsController.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/controllers/ExclusiveTaskActionsController.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/controllers/TaskSearchController.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/controllers/TaskOperationController.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/controllers/WorkTypesController.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/controllers/TaskTypesController.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/access/AccessControlService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/restrict/ClientAccessControlService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/enums/CFTTaskState.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/domain/search/SearchOperator.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/domain/search/SortField.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/controllers/request/enums/TaskOperationType.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/controllers/request/enums/TaskFilterOperator.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/idam/entities/SearchEventAndCase.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/exceptions/v2/RoleAssignmentVerificationException.java
status: reviewed
examples_extracted_from:
  - apps/wa/wa-task-management-api/src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/enums/CFTTaskState.java
  - apps/wa/wa-task-management-api/src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java
confluence:
  - id: "1457293975"
    title: "WA Task Management API: POST /task"
    last_modified: "unknown"
    space: "WA"
  - id: "1578373991"
    title: "WA Task Management API: POST /task/{task-id}/complete"
    last_modified: "unknown"
    space: "WA"
  - id: "1482336467"
    title: "Task Management API Request Validation & Errors"
    last_modified: "unknown"
    space: "WA"
  - id: "1552143414"
    title: "WA Task Management: POST /task/operation (internal)"
    last_modified: "unknown"
    space: "WA"
  - id: "1498625973"
    title: "WA Task Management API: POST /task/search-for-completable"
    last_modified: "unknown"
    space: "WA"
  - id: "1578374024"
    title: "WA Task Management API: POST /task/{task-id}/assign"
    last_modified: "unknown"
    space: "WA"
  - id: "1457310834"
    title: "Task Access Management"
    last_modified: "unknown"
    space: "WA"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- REST API on port 8087 providing CRUD, search, and lifecycle actions (claim, unclaim, assign, complete, cancel) for WA tasks.
- Every user-facing request requires `Authorization` (bearer) and `ServiceAuthorization` (S2S) headers; access is checked against AM role assignments with security classification filtering (PUBLIC/PRIVATE/RESTRICTED hierarchy).
- Exclusive endpoints (initiation, termination, batch operations) accept only S2S tokens from allow-listed services (`wa_task_management_api`, `wa_task_monitor`, `wa_case_event_handler`, `wa_workflow_api`).
- Privileged endpoints (delete-by-case, completion with options) accept S2S tokens from `wa_task_management_api`, `xui_webapp`, `ccd_case_disposer`.
- All endpoints consume and produce `application/json` under the `/task` base path; errors follow RFC 7807 (`application/problem+json`).
- Search responses include per-task `permissions` (union of caller's permissions on each task) and support pagination via `first_result`/`max_results` (default 50).

---

## Authentication and authorisation

All endpoints require the `ServiceAuthorization` header containing a valid S2S token. User-facing endpoints additionally require the `Authorization` header with a bearer token.

| Access tier | S2S clients (default) | Additional auth |
|---|---|---|
| **User-facing** | Any valid S2S client | Bearer token; AM role assignments checked per task |
| **Privileged** | `wa_task_management_api`, `xui_webapp`, `ccd_case_disposer` | Bearer token (userId must be non-null) |
| **Exclusive** | `wa_task_management_api`, `wa_task_monitor`, `wa_case_event_handler`, `wa_workflow_api` | S2S only; no bearer required |

Access tier enforcement: `ClientAccessControlService:42` (privileged), `ClientAccessControlService:72` (exclusive).

### Permission types

Task-level permissions are evaluated by joining the caller's AM role assignments against the task's `task_roles` rows:

| Permission | Purpose |
|---|---|
| `READ` | View task details and search results |
| `REFER` | Create a referral task as a child of the task (deprecated since Release 3.5 but still in enum) |
| `OWN` | Self-assign / be assigned; includes ability to execute and complete |
| `MANAGE` | Perform management updates (e.g. unassign and reassign) |
| `EXECUTE` | Execute and complete the task; allows assignment but never auto-assignment |
| `CANCEL` | Cancel any task and any outstanding referrals |
| `COMPLETE` | Complete any task |
| `COMPLETE_OWN` | Complete own task |
| `CANCEL_OWN` | Cancel own task |
| `CLAIM` | Claim an unassigned task |
| `UNCLAIM` | Release own claimed task |
| `ASSIGN` | Assign task to another user |
| `UNASSIGN` | Remove assignment from a task |
| `UNCLAIM_ASSIGN` | Unclaim then assign to another |
| `UNASSIGN_CLAIM` | Unassign then claim |
| `UNASSIGN_ASSIGN` | Unassign then assign to another |

Source: `PermissionTypes.java`.

<!-- DIVERGENCE: Confluence "Task Access Management" page (1457310834) says unclaim requires "Manage" permission, but source (TaskManagementService.java:242) shows it requires UNCLAIM or UNASSIGN. Source wins. -->

---

## Task action endpoints

All endpoints are relative to the base path `/task`.

| Method | Path | Access | Request body | Response | Description |
|---|---|---|---|---|---|
| `GET` | `/{task-id}` | User | — | `200 Task` | Retrieve task. Requires `READ` permission. |
| `POST` | `/{task-id}/claim` | User | — | `204` | Claim task. Requires `CLAIM+OWN`, `CLAIM+EXECUTE`, `ASSIGN+EXECUTE`, or `ASSIGN+OWN`. |
| `POST` | `/{task-id}/unclaim` | User | — | `204` | Release claimed task. Requires `UNCLAIM` or `UNASSIGN`. |
| `POST` | `/{task-id}/assign` | User | `{"user_id": "..."}` | `204` | Assign to another user. Assigner needs `MANAGE`/`ASSIGN`/`UNASSIGN_CLAIM`; assignee needs `OWN` or `EXECUTE`. |
| `POST` | `/{task-id}/complete` | User | `{"completion_options": {...}}` (optional) | `204` | Complete task. Body with `completionOptions` requires privileged S2S. Query param: `?completion_process=`. |
| `POST` | `/{task-id}/cancel` | User | — | `204` | Cancel task. Sets state to `CANCELLED`. Query param: `?cancellation_process=`. |
| `POST` | `/{task-id}/notes` | Exclusive | `{"note_resource": {...}}` | `204` | Add notes to a task. Internal use only. |
| `POST` | `/{task-id}/initiation` | Exclusive | `TaskResource` JSON | `201 TaskResource` | Create and configure a new task. Required fields (default): `name`, `taskType`, `caseId`. |
| `DELETE` | `/{task-id}` | Exclusive | `{"terminate_info": {...}}` | `204` | Terminate a task. |
| `POST` | `/delete` | Privileged | `{"case_ref": "..."}` | `201` | Mark all tasks for a case for deletion. |

Sources: `TaskActionsController.java:115` (get), `:148` (claim), `:199` (assign), `:234` (complete), `:283` (cancel), `:375` (delete-by-case); `ExclusiveTaskActionsController.java:68` (initiation), `:113` (terminate).

### Key behaviours

- **Claim conflict**: if a task is already `ASSIGNED` to a different user, `claimTask` throws `ConflictException` (HTTP 409) — `TaskManagementService:215`.
- **Complete idempotency**: completing an already-completed or terminated task (with reason `completed`) is a no-op; no error is thrown — `TaskManagementService:459`.
- **Feature flags on response**: `termination_process` and `completion_process` fields are stripped from responses if the `WA_COMPLETION_PROCESS_UPDATE` LaunchDarkly flag is off — `TaskActionsController:128`.

---

## Search endpoints

| Method | Path | Access | Request body | Response | Description |
|---|---|---|---|---|---|
| `POST` | `/task` | User | `SearchTaskRequest` | `200 {tasks: [...], total_records: N}` | Search tasks with filters, sorting, pagination. |
| `POST` | `/task/search-for-completable` | User | `SearchEventAndCase` | `200 GetTasksCompletableResponse` | Find completable tasks for a case event. |

### `POST /task` — request shape

```json
{
  "search_parameters": [
    { "key": "jurisdiction", "operator": "IN", "values": ["ia"] },
    { "key": "state", "operator": "IN", "values": ["assigned", "unassigned"] },
    { "key": "location", "operator": "IN", "values": ["366559"] }
  ],
  "sorting_parameters": [
    { "sort_by": "priority_date", "sort_order": "asc" }
  ],
  "request_context": "ALL_WORK"
}
```

**Query parameters**: `first_result` (offset, default 0), `max_results` (page size, default 50).

### Search parameter keys

| Key | Operator | Value type | Notes |
|---|---|---|---|
| `jurisdiction` | `IN` | string[] | e.g. `ia`, `civil`, `sscs` |
| `location` | `IN` | string[] | ePIMMS location IDs |
| `state` | `IN` | string[] | `assigned`, `unassigned`, etc. |
| `user` | `IN` | string[] | IDAM user UUIDs |
| `task_type` | `IN` | string[] | Task type identifiers |
| `case_id` | `IN` | string[] | CCD case references |
| `work_type` | `IN` | string[] | Work type IDs |
| `role_category` | `IN` | string[] | `JUDICIAL`, `LEGAL_OPERATIONS`, `ADMIN`, `CTSC` |

Note: `caseId` (camelCase) is deprecated; use `case_id` — `SearchParameterKey.java`.

### Search operators

| Operator | Usage |
|---|---|
| `IN` | Values list is OR'ed against the key. Multiple search parameters are AND'ed together. |
| `BOOLEAN` | Used only with deprecated `available_tasks_only` key (replaced by `request_context` from Release 3.5). |
| `CONTEXT` | Internal operator for request context handling. |
| `BETWEEN` | Range filter (date values). |
| `BEFORE` | Single ISO 8601 datetime; matches earlier values. |
| `AFTER` | Single ISO 8601 datetime; matches more recent values. |

Source: `SearchOperator.java`.

### Request context

| Value | Permission required | Behaviour |
|---|---|---|
| `ALL_WORK` | `READ` | All tasks readable by the user |
| `AVAILABLE_TASKS` | `READ` + (`OWN` or `CLAIM`) | Tasks the user can pick up |
| _(omitted)_ | `READ` | Same as `ALL_WORK` |

Source: `RequestContext.java`.

### Sorting parameters

Results default to `due_date` descending when no sorting is specified. Clients can provide a `sorting_parameters` array with `sort_by` and `sort_order` fields.

| `sort_by` value | Description |
|---|---|
| `due_date` / `dueDate` | Task due date |
| `priority_date` / `priorityDate` | Priority date for task ordering |
| `task_title` / `taskTitle` | Alphabetical by title |
| `location_name` / `locationName` | Court/location name |
| `case_category` / `caseCategory` | Case category |
| `case_id` / `caseId` | CCD case reference |
| `case_name` / `caseName` | Case name |
| `next_hearing_date` / `nextHearingDate` | Next scheduled hearing |
| `majorPriority` | Major priority weight |
| `minorPriority` | Minor priority weight |
| `taskId` | Task identifier |

`sort_order`: `asc` or `desc`.

Source: `SortField.java`.

### `POST /task/search-for-completable` — request shape

```json
{
  "case_id": "1234567890123456",
  "event_id": "submitAppeal",
  "case_jurisdiction": "ia",
  "case_type": "Asylum"
}
```

All four fields (`case_id`, `event_id`, `case_jurisdiction`, `case_type`) are required per `SearchEventAndCase.java`. Omitting any field returns a `400` constraint violation.

Returns `{ "tasks": [...], "task_required_for_event": true|false }`. Requires `OWN` or `EXECUTE` permission. Always uses the Hibernate search path.

An empty task list does not mean the task does not exist -- it may have been filtered out because the user lacks sufficient permissions on the task(s).

### Search implementation notes

- Production uses a GIN-index-backed SQL path, controlled by LaunchDarkly flag `wa-task-search-gin-index` — `FeatureFlag:5`.
- The GIN index only covers tasks with state `ASSIGNED` or `UNASSIGNED` and `indexed=true`. Completed/cancelled/terminated tasks are not searchable via this path.
- Empty role assignments result in an empty list (HTTP 200), not a 403 — `TaskSearchController:113`.

### Search response shape

```json
{
  "tasks": [
    {
      "id": "string",
      "name": "string",
      "assignee": "string",
      "type": "string",
      "task_state": "string",
      "task_system": "string",
      "security_classification": "PUBLIC|PRIVATE|RESTRICTED",
      "task_title": "string",
      "created_date": "2020-09-05T14:47:01.250542+01:00",
      "due_date": "2020-09-05T14:47:01.250542+01:00",
      "location_name": "string",
      "location": "string",
      "execution_type": "string",
      "jurisdiction": "string",
      "region": "string",
      "case_type_id": "string",
      "case_id": "string",
      "case_category": "string",
      "case_name": "string",
      "auto_assigned": true,
      "warnings": true,
      "warning_list": { "values": [{"code": "123", "text": "warning text"}] },
      "case_management_category": "string",
      "work_type_id": "string",
      "work_type_label": "string",
      "description": "string",
      "role_category": "string",
      "next_hearing_id": "string",
      "next_hearing_date": "2024-01-15T10:00:00Z",
      "priority_date": "2024-01-10T10:00:00Z",
      "additional_properties": { "key": "value" },
      "permissions": { "values": ["Read", "Own", "Manage"] }
    }
  ],
  "total_records": 123
}
```

The `permissions` field returns the **union** of all permissions the requesting user holds on each task across all matching role assignments. If a user has multiple roles granting different permissions on the same task, all are merged into a single list.

### Security classification filtering

During role assignment evaluation, security classification acts as a hierarchical filter:

| Task classification | Matches role assignment classification |
|---|---|
| `PUBLIC` | `PUBLIC`, `PRIVATE`, or `RESTRICTED` |
| `PRIVATE` | `PRIVATE` or `RESTRICTED` |
| `RESTRICTED` | `RESTRICTED` only |

Source: `RoleAssignmentFilter.java:294`.

---

## Batch operation endpoint

| Method | Path | Access | Request body | Response |
|---|---|---|---|---|
| `POST` | `/task/operation` | Exclusive | `TaskOperationRequest` | `200` |

Note: despite `@ResponseStatus(HttpStatus.NO_CONTENT)` annotation, the endpoint returns `200 OK` due to explicit `ResponseEntity.ok()` at `TaskOperationController:68`.

### Operation types

| `name` | Purpose |
|---|---|
| `MARK_TO_RECONFIGURE` | Sets task state to `PENDING_RECONFIGURATION` |
| `EXECUTE_RECONFIGURE` | Re-applies DMN configuration to pending tasks |
| `EXECUTE_RECONFIGURE_FAILURES` | Retries failed reconfigurations |
| `UPDATE_SEARCH_INDEX` | Sets `indexed=true` on tasks for GIN index inclusion |
| `CLEANUP_SENSITIVE_LOG_ENTRIES` | Removes expired `sensitive_task_event_logs` rows |
| `PERFORM_REPLICATION_CHECK` | Checks logical replication lag |

### Request shape

```json
{
  "operation": {
    "name": "MARK_TO_RECONFIGURE",
    "run_id": "unique-run-id",
    "max_time_limit": 120,
    "retry_window_hours": 2
  },
  "task_filter": [
    { "key": "case_id", "operator": "IN", "values": ["1234567890123456"] }
  ]
}
```

### Operation fields

| Field | Description | Required |
|---|---|---|
| `operation.name` | Name of operation (from `TaskOperationType` enum) | yes |
| `operation.run_id` | Unique identifier to correlate results | no |
| `operation.max_time_limit` | Maximum seconds the operation should run | no |
| `operation.retry_window_hours` | Hours window for retrying failures | no |

### Task filter operators

The `task_filter` supports these operators (from `TaskFilterOperator.java`):

| Operator | Description |
|---|---|
| `IN` | List of values OR'ed (e.g. `case_id1 OR case_id2`) |
| `AFTER` | Single ISO 8601 datetime; selects tasks with a more recent match |
| `BEFORE` | Single ISO 8601 datetime; selects tasks with an earlier match |

### Example: execute_reconfigure with time filter

```json
{
  "operation": {
    "name": "EXECUTE_RECONFIGURE",
    "run_id": "run-123",
    "max_time_limit": 120
  },
  "task_filter": [
    {
      "key": "reconfigure_request_time",
      "value": "2022-02-23T11:00:00Z",
      "operator": "AFTER"
    }
  ]
}
```

---

## Lookup endpoints

| Method | Path | Access | Query params | Response | Description |
|---|---|---|---|---|---|
| `GET` | `/work-types` | User | `filter-by-user` (boolean) | `200 {work_types: [...]}` | Lists available work types. When `filter-by-user=true`, filters by the caller's role assignments. |
| `GET` | `/task/task-types` | User | `jurisdiction` (required) | `200 {task_types: [...]}` | Lists task types for a jurisdiction. Cached via Caffeine (60 min default). |

---

## Task states

| State | Description |
|---|---|
| `UNCONFIGURED` | Created but not yet configured via DMN |
| `PENDING_AUTO_ASSIGN` | Transient state during auto-assignment |
| `CONFIGURED` | Configuration applied (may not appear in older DB schemas) |
| `UNASSIGNED` | Ready for pickup; no assignee |
| `ASSIGNED` | Claimed by or assigned to a user |
| `COMPLETED` | Finished successfully |
| `CANCELLED` | Cancelled by user or system |
| `TERMINATED` | Terminated via exclusive endpoint or error handling |
| `PENDING_RECONFIGURATION` | Awaiting DMN reconfiguration |

Active states (where `CFTTaskState.isActive()` returns true): all except `TERMINATED`, `COMPLETED`, `CANCELLED`.

Source: `CFTTaskState.java`.

---

## Error responses

Error responses follow **RFC 7807** (`application/problem+json` content type), implemented via the Zalando Problem library. Each error has a `type` URI, `title`, `status`, and `detail` field.

| HTTP status | Problem type URI suffix | Title | Condition |
|---|---|---|---|
| `400` | `/problem/constraint-violation` | Constraint Violation | Request validation failure (missing fields, empty values, invalid operator) |
| `400` | `/problem/bad-request` | Bad Request | Semantically invalid request (e.g. empty key string) |
| `401` | `/problem/role-assignment-error` | Role Assignment Error | No role assignments found for the user |
| `403` | `/problem/role-assignment-verification-failure` | Role Assignment Verification Error | User's role assignments do not grant required permission |
| `403` | `/problem/forbidden` | Forbidden | Privileged/exclusive endpoint called by unauthorised S2S client |
| `404` | `/problem/task-not-found-error` | Task Not Found | No task exists with the given ID |
| `409` | `/problem/task-already-claimed-error` | Task Already Claimed Error | Task assigned to a different user (claim conflict) |
| `502` | `/problem/downstream-dependency-error` | Downstream Dependency Error | A downstream service (AM, CCD, Camunda) did not respond as expected |
| `503` | `/problem/service-unavailable` | Service Unavailable | Database or infrastructure unavailable |
| `503` | `/problem/database-conflict` | Database Conflict | Database conflict (e.g. optimistic lock failure) |

All type URIs are prefixed with `https://github.com/hmcts/wa-task-management-api`.

### Validation behaviour by endpoint

- **Search (`POST /task`)**: permissions failures filter results rather than returning 403 — an empty list is returned if no tasks pass role assignment checks.
- **Single-task actions**: permissions failures return 403 with the `role-assignment-verification-failure` problem type.
- **Assign**: `user_id` must be present and non-empty; violation returns 400.
- **Search-for-completable**: all of `case_id`, `event_id`, `case_jurisdiction`, `case_type` must be present; violation returns 400.

On 403 failures, the service writes to the `sensitive_task_event_logs` table with user and task data (90-day retention).

---

## OpenAPI spec

The published OpenAPI spec is available at:
`platops/cnp-api-docs/docs/specs/wa-task-management-api.json`

---

## See also

- [Task States](task-states.md) — full state machine reference including which S2S tier each transition requires
- [Access Control](../explanation/access-control.md) — how AM role assignments are fetched and matched against `task_roles` rows for every request
- [Task Lifecycle](../explanation/task-lifecycle.md) — narrative covering initiation, auto-assignment, reconfiguration, and completion flows
- [Architecture](../explanation/architecture.md) — GIN index, read-replica setup, and LaunchDarkly feature flags on this service
