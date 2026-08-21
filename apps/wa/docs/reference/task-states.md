---
title: Task States
topic: task-lifecycle
diataxis: reference
product: wa
audience: both
sources:
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/enums/CFTTaskState.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/enums/TaskAction.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/enums/TerminationProcess.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskManagementService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java
  - wa-task-management-api:src/main/resources/db/migration/V1.0.2__init_enums.sql
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/controllers/ExclusiveTaskActionsController.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/controllers/TaskActionsController.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/entity/TaskResource.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/operation/TaskReconfigurationService.java
  - wa-standalone-task-bpmn:src/main/resources/wa-task-initiation-ia-asylum.bpmn
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/operation/MarkTaskReconfigurationService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/operation/TaskReconfigurationTransactionHandler.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/CaseConfigurationProviderService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/CFTTaskMapper.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskAutoAssignmentService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/query/CftQueryService.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/query/RoleAssignmentFilter.java
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/services/ccd/CcdEventProcessor.java
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/handlers/CancellationCaseEventHandler.java
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/handlers/WarningCaseEventHandler.java
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/handlers/ReconfigurationCaseEventHandler.java
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/handlers/InitiationCaseEventHandler.java
  - wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn
status: reviewed
examples_extracted_from:
  - apps/wa/wa-task-management-api/src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/enums/CFTTaskState.java
  - apps/wa/wa-task-management-api/src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java
  - apps/wa/wa-task-monitor/src/main/java/uk/gov/hmcts/reform/wataskmonitor/domain/taskmonitor/JobName.java
confluence:
  - id: "1552152378"
    title: "HLD - Task Repository v1.2"
    last_modified: "2022-02-22"
    space: "WA"
  - id: "1438947851"
    title: "WA Low Level Design"
    last_modified: "2024-06-18"
    space: "WA"
  - id: "1824158022"
    title: "WA TM: Terminating historic Completed Tasks"
    last_modified: "2025-04-07"
    space: "WA"
  - id: "1824134416"
    title: "WA TM: Setting the Assignee for Task Initiation"
    last_modified: "2025-01-01"
    space: "WA"
  - id: "1616388317"
    title: "Granular Task Permissions Onboarding"
    last_modified: "2023-01-01"
    space: "WA"
  - id: "1544031765"
    title: "Task Reconfiguration"
    last_modified: "2022-06-01"
    space: "WA"
confluence_checked_at: "2026-05-13T12:00:00Z"
sources_sha:
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/enums/CFTTaskState.java": "016267cf74a1cefbc05d5e54fc56b4843d6164f2"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/enums/TaskAction.java": "3c741595f2f8c2aed2e4654ce7b70d05cf44bf14"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/enums/TerminationProcess.java": "b83f756ff73266f9ae6181f0427ae32e1f4a09e9"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskManagementService.java": "0464400520dda69b754e7ed2105eecfbbfcd100a"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java": "272fb0b4257fe638eeea7af521ae84738cec491a"
  "wa-task-management-api:src/main/resources/db/migration/V1.0.2__init_enums.sql": "69212e903c7dfc1015511dbda39ef8b17ae65cbd"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/controllers/ExclusiveTaskActionsController.java": "168f462c0af08458dfe4bcd8629946cb74b30a91"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/controllers/TaskActionsController.java": "1d99034722b1261ca9e19f97571a035b04c649d1"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/entity/TaskResource.java": "393c141b62ac3e6271a8790997f40a1c253b0cbe"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/operation/TaskReconfigurationService.java": "a6e0eb1659e9b67f5ef737edcd4340c33bac0421"
  "wa-standalone-task-bpmn:src/main/resources/wa-task-initiation-ia-asylum.bpmn": "ef2e773a0dfbc538d1b0e7dab33fb6906c2b6510"
  ? "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/operation/MarkTaskReconfigurationService.java"
  : "74b174fcc9b459a1f7df70c7853c5690f9caa631"
  ? "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/operation/TaskReconfigurationTransactionHandler.java"
  : "41f980025a0ebc5f504b5ea94be93031881d036d"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/CaseConfigurationProviderService.java": "0464400520dda69b754e7ed2105eecfbbfcd100a"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/CFTTaskMapper.java": "b1d8bd7df29bb79a3f51aa85e5277be2e5bf0d6a"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskAutoAssignmentService.java": "ed3251b249aa89394bbacdadf277672af62c2a9d"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/query/CftQueryService.java": "a6e0eb1659e9b67f5ef737edcd4340c33bac0421"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/query/RoleAssignmentFilter.java": "60770094dbb454b800079ebed9b18c0c6b2dd26c"
  "wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/services/ccd/CcdEventProcessor.java": "98a029ce763a2f424be687a660ab099ad56ca753"
  "wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/handlers/CancellationCaseEventHandler.java": "81624296cc17947ff85c9b9075fc8d583cab5aeb"
  "wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/handlers/WarningCaseEventHandler.java": "98a029ce763a2f424be687a660ab099ad56ca753"
  "wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/handlers/ReconfigurationCaseEventHandler.java": "bbdda4d6b7cb5a3c0a32fd2b485c83f0f3654732"
  "wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/handlers/InitiationCaseEventHandler.java": "43f8c5abc285ef6fc88d13875586e20a8fb3610f"
  "wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn": "510747dd6d79a189f498d51c500718bb30adf51c"
---

## TL;DR

- Tasks move through a defined set of states tracked in the `CFTTaskState` enum and persisted as the PostgreSQL `task_state_enum` type in `cft_task_db`.
- Active states: `UNCONFIGURED`, `PENDING_AUTO_ASSIGN`, `CONFIGURED`, `UNASSIGNED`, `ASSIGNED`, `PENDING_RECONFIGURATION`.
- Terminal states: `COMPLETED`, `CANCELLED`, `TERMINATED` — once reached, the task is no longer active (`TaskResource.isActive()` returns false).
- A **dual-state model** operates across Camunda (process lifecycle) and the CFT Task DB (authoritative task data). The `cftTaskState` Camunda variable coordinates the two stores; the CFT DB is the single source of truth for task attributes.
- Each transition is triggered by a specific action (user claim, cancel, system initiation, etc.) and requires either bearer-token permissions checked against AM role assignments or S2S-level exclusive/privileged access.
- The GIN search index only covers tasks in `ASSIGNED` or `UNASSIGNED` state with `indexed=true`.

## States

| State | Abbreviation | Description | Active | Indexed |
|-------|-------------|-------------|--------|---------|
| `UNCONFIGURED` | `UCNF` | Task just created by `wa-workflow-api` via initiation; awaiting configuration DMN evaluation. | Yes | No |
| `PENDING_AUTO_ASSIGN` | `PA` | Transient state during auto-assignment processing after configuration. | Yes | No |
| `CONFIGURED` | `CNF` | Configuration DMN has been applied but task has not yet been released to a queue. | Yes | No |
| `UNASSIGNED` | `U` | Task is available in the work queue; no user owns it. | Yes | Yes |
| `ASSIGNED` | `A` | A user has claimed or been assigned the task. | Yes | Yes |
| `PENDING_RECONFIGURATION` | `PR` | Present in the enum and the database type but never written; tasks awaiting DMN re-evaluation are flagged by `reconfigure_request_time` instead. | Yes | No |
| `COMPLETED` | `C` | Task finished via user or case-event completion. | No | No |
| `CANCELLED` | `CAN` | Task cancelled via user action or case-event cancellation. | No | No |
| `TERMINATED` | `T` | Task terminated by the exclusive endpoint, or set during error-handling in `cancelTask` when Camunda cancellation fails. | No | No |

Source: `CFTTaskState.java` defines the enum with abbreviations used in compact representations; `TaskResource.isActive(state)` at line 597 returns `false` for `TERMINATED`, `COMPLETED`, `CANCELLED`.

## Dual-state model (CFT DB + Camunda)

Task state is held in **two places**: the CFT Task DB (authoritative, queryable) and the Camunda process engine (lifecycle management). A Camunda variable `cftTaskState` on each process instance coordinates the two stores.

### Camunda-side states

| Camunda State | Description | Trigger |
|---------------|-------------|---------|
| **Active** | Task is a live Camunda user task. | Task creation in BPMN (event bridge sets `cftTaskState = unconfigured`). |
| **Historic Pending Terminate** | Task completed/cancelled in Camunda; awaiting CFT DB termination. | Task deletion event (event bridge sets `cftTaskState = pendingTermination`). |
| **Historic** | Fully terminated in both stores; awaiting Camunda history purge. | `cftTaskState` variable deleted from Camunda history after CFT termination committed. |

The Camunda process history TTL is **90 days** (`camunda:historyTimeToLive="P90D"` in the standalone task BPMN). After that, Camunda automatically purges the process data.

### Transaction pattern

All state transitions that touch both stores follow a strict protocol:

1. **Lock** the task row(s) in the CFT Task DB (prevents concurrent mutations).
2. **Update** the CFT task data (state, assignee, timestamps).
3. **Call Camunda API** (complete, escalate, or update `cftTaskState` variable) — single API call only.
4. **Commit** the CFT DB transaction.

If the Camunda call fails, the CFT transaction rolls back, preserving atomicity. If step 4 fails after Camunda succeeds (rare — e.g. connectivity loss), an inconsistency is logged and picked up by the Task Monitor's scheduled termination/reconciliation job.

<!-- CONFLUENCE-ONLY: Transaction pattern detail from HLD - Task Repository v1.2 (page 1552152378 section 2.5.3). Not codified as a single method in source but implied by TaskManagementService patterns. -->

## State transitions

| From | To | Trigger / Action | Who / Access level |
|------|----|------------------|--------------------|
| _(new)_ | `UNCONFIGURED` | Task initiation (`POST /task/{id}/initiation`) | Exclusive S2S clients (`wa_task_management_api`, `wa_task_monitor`, `wa_case_event_handler`, `wa_workflow_api`) |
| `UNCONFIGURED` | `CONFIGURED` | `ConfigureTaskService.configureCFTTask` applies DMN | System (part of initiation pipeline) |
| `CONFIGURED` | `PENDING_AUTO_ASSIGN` | Auto-assignment query starts | System (internal to `TaskAutoAssignmentService`) |
| `PENDING_AUTO_ASSIGN` | `ASSIGNED` | Matching AM role holder found with `own=true` + `autoAssignable=true` | System (auto-assignment) |
| `PENDING_AUTO_ASSIGN` | `UNASSIGNED` | No matching AM role holder found | System (auto-assignment) |
| `CONFIGURED` | `UNASSIGNED` | No auto-assignment configured or no match | System (initiation pipeline) |
| `UNASSIGNED` | `ASSIGNED` | Claim (`POST /task/{id}/claim`) | User with `CLAIM`+`OWN`, `CLAIM`+`EXECUTE`, `ASSIGN`+`EXECUTE`, or `ASSIGN`+`OWN` permission (`TaskManagementService:219`) |
| `UNASSIGNED` | `ASSIGNED` | Assign (`POST /task/{id}/assign`) | Assigner needs `MANAGE`, `ASSIGN`, `UNASSIGN_CLAIM`, or similar; assignee needs `OWN` or `EXECUTE` (`TaskManagementService:342`) |
| `ASSIGNED` | `UNASSIGNED` | Unclaim (`POST /task/{id}/unclaim`) | User with `UNCLAIM` permission; or owner (`TaskManagementService:272`) |
| `ASSIGNED` | `UNASSIGNED` | Unassign (via assign endpoint with no target) | User with `UNASSIGN` permission |
| `ASSIGNED` | `ASSIGNED` | Reassign (`POST /task/{id}/assign` to different user) | Assigner needs `MANAGE` or `ASSIGN`+`UNASSIGN`; new assignee needs `OWN` or `EXECUTE` |
| `UNASSIGNED` / `ASSIGNED` | `COMPLETED` | Complete (`POST /task/{id}/complete`) | User with `COMPLETE` or `COMPLETE_OWN` permission; or privileged S2S with `completionOptions` (`TaskManagementService:470`) |
| `UNASSIGNED` / `ASSIGNED` | `CANCELLED` | Cancel (`POST /task/{id}/cancel`) | User with `CANCEL` or `CANCEL_OWN` permission (`TaskManagementService:396`) |
| `UNASSIGNED` / `ASSIGNED` | `TERMINATED` | Terminate (`DELETE /task/{id}`) | Exclusive S2S clients only (`ExclusiveTaskActionsController:113`) |
| `CANCELLED` _(error path)_ | `TERMINATED` | Camunda cancellation fails and no CFT state found in Camunda | System error-handling (`TaskManagementService:424`) |
| `ASSIGNED` / `UNASSIGNED` | _(unchanged)_ | Bulk `MARK_TO_RECONFIGURE` operation (`POST /task/operation`) stamps `reconfigure_request_time` and clears `indexed` | Exclusive S2S clients only |
| `ASSIGNED` / `UNASSIGNED` | `ASSIGNED` / `UNASSIGNED` | `EXECUTE_RECONFIGURE` operation re-applies the DMN; may unassign or re-assign if the assignee lost `Own`/`Execute` | Exclusive S2S clients only |

## Actions (audit labels)

The `last_updated_action` column records which `TaskAction` triggered the most recent state change. The enum constant name is used in code; the serialised value (from `getValue()`) is what appears in the database and API responses.

| Enum Constant | Serialised Value | Description |
|---------------|-----------------|-------------|
| `CLAIM` | `Claim` | User claimed the task |
| `UNCLAIM` | `Unclaim` | User unclaimed the task |
| `ASSIGN` | `Assign` | Task assigned to a user by another user |
| `UNASSIGN` | `Unassign` | Task unassigned from a user |
| `UNASSIGN_ASSIGN` | `UnassignAssign` | Reassigned from one user to another |
| `UNASSIGN_CLAIM` | `UnassignClaim` | Unassigned then claimed in one action |
| `UNCLAIM_ASSIGN` | `UnclaimAssign` | Unclaimed then assigned in one action |
| `AUTO_ASSIGN` | `AutoAssign` | System auto-assigned based on AM role query |
| `AUTO_UNASSIGN` | `AutoUnassign` | System removed assignment (e.g. role revoked) |
| `AUTO_UNASSIGN_ASSIGN` | `AutoUnassignAssign` | System reassigned after auto-unassign |
| `CONFIGURE` | `Configure` | Initial DMN configuration applied |
| `MARK_FOR_RECONFIGURE` | `MarkForReconfigure` | Flagged for reconfiguration |
| `COMPLETED` | `Complete` | Task completed |
| `CANCEL` | `Cancel` | User cancelled the task |
| `AUTO_CANCEL` | `AutoCancel` | System cancelled (case-event driven) |
| `TERMINATE` | `Terminate` | Exclusive termination |
| `TERMINATE_EXCEPTION` | `TerminateException` | Termination due to error handling |
| `ADD_WARNING` | `AddWarning` | Warning metadata added to task |

## Termination process sub-types

The `termination_process` column distinguishes how a task reached a terminal state.

| Enum Constant | Serialised Value | Meaning |
|---------------|-----------------|---------|
| `EXUI_USER_COMPLETION` | `EXUI_USER_COMPLETION` | User explicitly completed the task via ExUI |
| `EXUI_CASE_EVENT_COMPLETION` | `EXUI_CASE-EVENT_COMPLETION` | Case event triggered automatic completion |
| `EXUI_USER_CANCELLATION` | `EXUI_USER_CANCELLATION` | User explicitly cancelled the task via ExUI |
| `EXUI_CASE_EVENT_CANCELLATION` | `CASE_EVENT_CANCELLATION` | Case event triggered automatic cancellation |

<!-- DIVERGENCE: Confluence (HLD Task Repository v1.2) lists these as uniform EXUI_* patterns, but source (TerminationProcess.java) shows the serialised JSON values use a hyphen in CASE-EVENT and omit the EXUI_ prefix for cancellation. Source wins. -->

Source: `TerminationProcess.java`; values added in migrations `V1.0.35`/`V1.0.36`/`V1.0.38`.

## Permissions required per action

Permissions are evaluated by `RoleAssignmentVerificationService` against `TaskRoleResource` rows joined to the user's AM role assignments.

| Endpoint | Required permissions | Access tier |
|----------|---------------------|-------------|
| `GET /task/{id}` | `READ` | Bearer + S2S |
| `POST /task/{id}/claim` | `CLAIM`+`OWN` or `CLAIM`+`EXECUTE` or `ASSIGN`+`EXECUTE` or `ASSIGN`+`OWN` | Bearer + S2S |
| `POST /task/{id}/unclaim` | `UNCLAIM` (or owner of task) | Bearer + S2S |
| `POST /task/{id}/assign` | Assigner: `MANAGE` or `ASSIGN` or `UNASSIGN_CLAIM` / Assignee: `OWN` or `EXECUTE` | Bearer + S2S |
| `POST /task/{id}/complete` | `COMPLETE` or `COMPLETE_OWN` | Bearer + S2S (privileged S2S if `completionOptions` provided) |
| `POST /task/{id}/cancel` | `CANCEL` or `CANCEL_OWN` | Bearer + S2S |
| `POST /task/{id}/initiation` | N/A (no bearer-token check) | Exclusive S2S only |
| `DELETE /task/{id}` | N/A | Exclusive S2S only |
| `POST /task/operation` | N/A | Exclusive S2S only |
| `POST /task/delete` | N/A | Privileged S2S only |

**S2S access tiers**:
- Privileged clients (default): `wa_task_management_api`, `xui_webapp`, `ccd_case_disposer`
- Exclusive clients (default): `wa_task_management_api`, `wa_task_monitor`, `wa_case_event_handler`, `wa_workflow_api`

## Idempotency and conflict behaviour

| Scenario | Behaviour |
|----------|-----------|
| `completeTask` on already `COMPLETED` or `TERMINATED` (with reason `completed`) | No-op; Camunda call skipped (`TaskManagementService:459`) |
| `claimTask` on task `ASSIGNED` to a different user | `ConflictException` (HTTP 409) (`TaskManagementService:215`) |
| Role assignment verification failure | HTTP 403; failure logged to `sensitive_task_event_logs` with 90-day TTL |

## Reconfiguration lifecycle

When a CCD case event matches a row with `Action = Reconfigure` in the service team's Cancellation DMN, `wa-case-event-handler` asks `wa-task-management-api` to flag that case's tasks for re-evaluation. Every message runs through the four handlers in a fixed order, each evaluating its DMN and acting on the results before the next one starts (`wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/services/ccd/CcdEventProcessor.java:79-84`):

1. **Cancel** — `@Order(1)`, matching cancel rules terminate tasks (`.../handlers/CancellationCaseEventHandler.java:34`).
2. **Warn** — `@Order(2)`, matching warn rules add warning metadata to tasks (`.../handlers/WarningCaseEventHandler.java:34`).
3. **Reconfigure** — `@Order(3)`, matching reconfigure rules flag tasks for re-evaluation (`.../handlers/ReconfigurationCaseEventHandler.java:33`).
4. **Initiate** — `@Order(4)`, matching initiation rules create new tasks (`.../handlers/InitiationCaseEventHandler.java:47`).

This ordering avoids reconfiguring tasks that are about to be cancelled, and avoids wasting effort on newly-created tasks that already reflect the latest case data.

Flagging and applying are two separate operations, and only the first is scoped to the case:

- `MARK_TO_RECONFIGURE` filters on `case_id` (`.../handlers/ReconfigurationCaseEventHandler.java:121-128`) and, of those tasks, touches only ones in `ASSIGNED` or `UNASSIGNED` state whose `reconfigure_request_time` is still null (`wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/operation/MarkTaskReconfigurationService.java:48-50`). Tasks in `UNCONFIGURED`, `CONFIGURED` or `PENDING_AUTO_ASSIGN` are passed over even though `isActive()` counts them as active. Flagging stamps `reconfigure_request_time` and sets `indexed = false`, dropping the task out of the search index until reconfiguration finishes (`MarkTaskReconfigurationService.java:92-93`).
- `EXECUTE_RECONFIGURE`, fired by `wa-task-monitor`'s `RECONFIGURATION` job, ignores the case entirely and sweeps every `ASSIGNED`/`UNASSIGNED` task whose `reconfigure_request_time` is later than the cutoff in the request (`.../services/operation/TaskReconfigurationService.java:51-53`). Each task is handled in its own transaction under a pessimistic write lock; its current state is re-read and re-checked immediately before the write, then `reconfigure_request_time` is cleared, `last_reconfiguration_time` stamped, and `indexed` restored (`.../services/operation/TaskReconfigurationTransactionHandler.java:78-103`).

Applying a reconfiguration does the following:

- Case data is re-fetched from CCD and both the Configuration and the Permissions DMN are re-evaluated (`.../services/CaseConfigurationProviderService.java:68,76-110`).
- Only configuration rows where `canReconfigure = true` are written back, which is what keeps attributes like `dueDate` set-once at initiation (`.../services/CFTTaskMapper.java:160-168`). Permissions are not gated that way: the task's entire `TaskRoleResource` set is replaced from the Permissions DMN on every run (`CFTTaskMapper.java:176`).
- The current assignee is re-checked for `Own` or `Execute`. If they hold neither, the assignment is removed and auto-assignment runs again (`.../services/TaskAutoAssignmentService.java:52-77`, requirement built with OR at `.../cft/query/CftQueryService.java:146-159`).
- `Warning Code`, `Warning Text` and `Categories` on a `Reconfigure` row are all ignored, and all three produce the same single `log.warn` (`.../handlers/ReconfigurationCaseEventHandler.java:88-98`).

No code path writes the `PENDING_RECONFIGURATION` state. What marks a task as awaiting reconfiguration is the `reconfigure_request_time` column; the enum value exists in `CFTTaskState` and in the `task_state_enum` database type, and is mapped to a display label by the replica reporting function, but is never stored.
<!-- DIVERGENCE: Confluence "Task Reconfiguration" describes reconfiguration as a per-case operation over the case's active tasks that moves them into a PENDING_RECONFIGURATION state, and says a non-empty Categories column logs an error. Flagging is per-case but restricted to ASSIGNED/UNASSIGNED tasks with a null reconfigure_request_time; applying is a global sweep by reconfigure_request_time with no case filter; the state is never written; and the ignored-column message is a warning covering Warning Code and Warning Text as well. Source wins. -->

## Nominating an assignee at initiation

Service teams can nominate an assignee from case data, but the mechanism is an `assignee` attribute on the **Configuration** DMN rather than anything on the Initiation DMN (`wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn:2030-2035`).

1. A configuration rule returns `assignee` holding the nominee's IDAM ID. A value containing a comma is rejected outright with `AssigneeConfigurationException`, and when several rules return `assignee` only the last one survives (`wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/CaseConfigurationProviderService.java:102,197-225`).
2. The nominee is written onto the skeleton task and then put through the ordinary auto-assignment check rather than assigned outright (`.../services/TaskAutoAssignmentService.java:84-112`).
3. Passing that check means the nominee holds a role assignment whose role name matches one of the task's `TaskRoleResource` rows and — where that row lists authorisations — holds one of them (`TaskAutoAssignmentService.java:152-158,178-227`). It is not a test for `Own` or `Execute`.
4. A nominee who passes gets the task, saved as `ASSIGNED`. One who fails is cleared, after which auto-assignment picks the highest-priority matching role holder, so the task ends up `ASSIGNED` to a different user or `UNASSIGNED` (`TaskAutoAssignmentService.java:100-108,114-150`).

The reconfiguration path uses a different and stricter check on the assignee already in place: they must still hold `Own` or `Execute`, or they are unassigned and auto-assignment runs again (`TaskAutoAssignmentService.java:52-77`).
<!-- DIVERGENCE: Confluence "WA TM: Setting the Assignee for Task Initiation" describes an initialAssignee output on the Initiation DMN, carried to Camunda as a process variable, applied to the Camunda assignee task variable by a FEEL expression, and validated against OWN or EXECUTE. The identifier initialAssignee appears nowhere in the WA repos as a DMN column, BPMN expression or Camunda variable, the nomination is a Configuration DMN attribute, and the initiation-time check is role-name and authorisation matching rather than a permission test. Source wins. -->

## Termination failure scenarios

Under normal operation, tasks transition from `COMPLETED`/`CANCELLED` to `TERMINATED` via the Task Monitor's scheduled termination job, which:

1. Queries Camunda history for processes with `cftTaskState = pendingTermination`.
2. Updates the CFT Task DB state to `TERMINATED`.
3. Deletes the `cftTaskState` variable from Camunda history (the only mutable operation on historic tasks).
4. Commits the CFT DB transaction.

**Known failure mode**: If the Camunda process is cleaned up (by the 90-day TTL purge) before termination runs, tasks can become stuck in `COMPLETED` or `CANCELLED` indefinitely. This was observed at scale (circa 2,800 tasks on 2024-07-01). The remediation approach uses a DB function that:

- Selects tasks in `COMPLETED`/`CANCELLED` state created > 90 days ago.
- Updates `state` to `TERMINATED`, sets `termination_reason` to `completed`/`cancelled`, `last_updated_action` to `TerminateException`.
- Does not require a matching Camunda process.

The strategic fix is a periodic reconciliation job that identifies tasks in `COMPLETED`/`CANCELLED` state beyond a configurable threshold (e.g. 30 days) and triggers a termination process resilient to missing Camunda data.

<!-- CONFLUENCE-ONLY: Termination failure detail from "WA TM: Terminating historic Completed Tasks" page 1824158022. Describes operational issue and remediation. -->

## Granular permissions model

The permission types available for task role configuration are defined in `PermissionTypes.java`:

| Permission | Field name | Description |
|-----------|------------|-------------|
| `Read` | `read` | View task details |
| `Refer` | `refer` | Refer a task (legacy, removed from new model) |
| `Own` | `own` | Be assigned as task owner |
| `Manage` | `manage` | Manage task assignments for others |
| `Execute` | `execute` | Execute/perform the task |
| `Cancel` | `cancel` | Cancel any task |
| `Complete` | `complete` | Complete any task |
| `CompleteOwn` | `completeOwn` | Complete only tasks assigned to self |
| `CancelOwn` | `cancelOwn` | Cancel only tasks assigned to self |
| `Claim` | `claim` | Claim an unassigned task |
| `Unclaim` | `unclaim` | Release a claimed task |
| `Assign` | `assign` | Assign a task to another user |
| `Unassign` | `unassign` | Remove assignment from a task |
| `UnclaimAssign` | `unclaimAssign` | Unclaim then assign in one action |
| `UnassignClaim` | `unassignClaim` | Unassign then claim in one action |
| `UnassignAssign` | `unassignAssign` | Reassign from one user to another |

**DMN configuration rules**:
- `Own` and `Claim` **must** appear in the same DMN row for a task to show up in the "Available tasks" screen in ExUI. The available-tasks search builds a single ANDed requirement for the pair (`wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/query/CftQueryService.java:175-184`) and the predicate is applied to one joined `TaskRoleResource` row, so the two flags spread across two rows satisfy neither (`.../cft/query/RoleAssignmentFilter.java:60-77`).
- Permission names are matched case-sensitively against the enum's exact values, and an unrecognised token fails the whole configuration with `IllegalArgumentException: Invalid Permission Type:<token>` (`.../services/CFTTaskMapper.java:402-407`, `.../auth/permission/entities/PermissionTypes.java:38-42`). Spaces around the commas are harmless, because each token is trimmed before the lookup (`CFTTaskMapper.java:404`). The neighbouring `Authorisations` column is not trimmed, so a space there does become part of the authorisation value and will stop it matching (`CFTTaskMapper.java:409-412`).
<!-- DIVERGENCE: Confluence "Granular Task Permissions Onboarding" says permission value lists must have no spaces after commas because trailing spaces break matching. Permission tokens are trimmed before being resolved, so spaces are tolerated there; it is the Authorisations column that is split without trimming. Source wins. -->

## Examples

### CFTTaskState enum

The authoritative state enum with abbreviations used in DB compact storage:

```java
// Source: apps/wa/wa-task-management-api/src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/cft/enums/CFTTaskState.java
public enum CFTTaskState {
    UNCONFIGURED("UNCONFIGURED", "UCNF"),          // active — awaiting DMN config
    PENDING_AUTO_ASSIGN("PENDING_AUTO_ASSIGN", "PA"), // active — transient during auto-assignment
    ASSIGNED("ASSIGNED", "A"),                     // active — task has an owner
    CONFIGURED("CONFIGURED", "CNF"),               // active — DMN applied, not yet in queue
    UNASSIGNED("UNASSIGNED", "U"),                 // active — in work queue, no owner
    COMPLETED("COMPLETED", "C"),                   // terminal
    CANCELLED("CANCELLED", "CAN"),                 // terminal
    TERMINATED("TERMINATED", "T"),                 // terminal
    PENDING_RECONFIGURATION("PENDING_RECONFIGURATION", "PR"); // active — marked for re-evaluation
}
```

`TaskResource.isActive(state)` returns `false` for `TERMINATED`, `COMPLETED`, and `CANCELLED`; all other states are considered active.

### Task Monitor JobName enum

All scheduled job types that `wa-task-monitor` can execute:

```java
// Source: apps/wa/wa-task-monitor/src/main/java/uk/gov/hmcts/reform/wataskmonitor/domain/taskmonitor/JobName.java
public enum JobName {
    TERMINATION,                      // move pendingTermination Camunda tasks to TERMINATED in CFT DB
    INITIATION,                       // poll Camunda for unconfigured tasks and re-trigger configuration
    AD_HOC_DELETE_PROCESS_INSTANCES,  // one-time process instance cleanup
    AD_HOC_PENDING_TERMINATION_TASKS, // removes stale cftTaskState history variables from Camunda
    TASK_INITIATION_FAILURES,         // diagnostic: log tasks still unconfigured beyond time limit
    TASK_TERMINATION_FAILURES,        // diagnostic: log tasks still pendingTermination beyond time limit
    RECONFIGURATION,                  // apply pending reconfigurations (PENDING_RECONFIGURATION → active)
    RECONFIGURATION_FAILURES,         // diagnostic: log reconfiguration failures
    MAINTENANCE_CAMUNDA_TASK_CLEAN_UP,// delete old Camunda process instances (non-prod only)
    UPDATE_SEARCH_INDEX,              // set indexed=true to include tasks in GIN search index
    CLEANUP_SENSITIVE_LOG_ENTRIES,    // purge expired rows from sensitive_task_event_logs
    PERFORM_REPLICATION_CHECK         // verify DB replication lag between primary and read replica
}
```

## See also

- [Task Lifecycle](../explanation/task-lifecycle.md) — narrative explanation of the state machine, including initiation flow, auto-assignment, and reconfiguration
- [API: Task Management](api-task-management.md) — endpoint reference showing which permissions and access tiers each state transition requires
- [How-to: Debug Stuck Tasks](../how-to/debug-stuck-tasks.md) — troubleshooting tasks stuck in `UNCONFIGURED` or other non-terminal states
- [Glossary](glossary.md) — definitions of state-related terms (CFTTaskState, UNCONFIGURED, PENDING_RECONFIGURATION, TerminationProcess)
