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
| `PENDING_RECONFIGURATION` | `PR` | Bulk `MARK_TO_RECONFIGURE` operation has flagged the task for DMN re-evaluation. | Yes | No |
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
| Any active | `PENDING_RECONFIGURATION` | Bulk `MARK_TO_RECONFIGURE` operation (`POST /task/operation`) | Exclusive S2S clients only |
| `PENDING_RECONFIGURATION` | `UNASSIGNED` / `ASSIGNED` | `EXECUTE_RECONFIGURE` operation applies DMN and restores previous assignment state | Exclusive S2S clients only |

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

<!-- DIVERGENCE: Confluence (HLD Task Repository v1.2) and the draft previously listed these as uniform EXUI_* patterns, but source (TerminationProcess.java) shows the serialised JSON values use a hyphen in CASE-EVENT and omit the EXUI_ prefix for cancellation. Source wins. -->

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

When a CCD case event matches a `Reconfigure` rule in the service team's Cancellation DMN, the reconfiguration process is triggered. The event-processing sequence within `wa-case-event-handler` is strictly ordered:

1. **Cancel** — matching cancel rules terminate tasks.
2. **Warn** — matching warn rules add warning metadata to tasks.
3. **Reconfigure** — matching reconfigure rules trigger task re-evaluation.
4. **Initiate** — matching initiation rules create new tasks.

This ordering avoids reconfiguring tasks that are about to be cancelled, and avoids wasting effort on newly-created tasks that already reflect the latest case data.

During reconfiguration:

- Only active tasks for the case are reconfigured.
- Only rows where `canReconfigure = true` in the Configuration DMN are re-applied. This allows attributes like `dueDate` to be set-once at initiation.
- The Permissions DMN is re-evaluated, and auto-assignment re-validates the current assignee. If the assignee no longer holds the required `OWN` or `EXECUTE` permission, their assignment is removed and a new auto-assignment attempt is made.
- The `Categories` column in the DMN is **not** supported for the `Reconfigure` action; a non-empty value logs an error.

<!-- CONFLUENCE-ONLY: Reconfiguration ordering and canReconfigure semantics from "Task Reconfiguration" page 1544031765. Not verified as a single code path in source but consistent with TaskReconfigurationService flow. -->

## Initial assignee at initiation

Service teams can specify an assignee at task initiation via their CCD case data. The mechanism:

1. A CCD callback writes an assignee IDAM ID into a case data field (e.g. `assigneeFromCaseData`).
2. The Initiation DMN outputs an `initialAssignee` column containing that value.
3. `wa-case-event-handler` passes `initialAssignee` to Camunda as a process variable when starting the standalone task BPMN.
4. The BPMN sets the Camunda `assignee` task variable via a FEEL expression: `${initialAssignee != null ? initialAssignee : null}`.
5. During initiation in `wa-task-management-api`, the Configuration DMN can output an `assignee` variable, which the system validates:
   - The proposed assignee must have `OWN` or `EXECUTE` permission via their current AM role assignments.
   - If valid: task is saved as `ASSIGNED` with that user.
   - If invalid (no matching role assignments or no `OWN`/`EXECUTE`): falls back to standard auto-assignment. The task may end up assigned to a different user, or `UNASSIGNED`.

During reconfiguration, the same `assignee` DMN output can override an existing assignment. If the DMN explicitly returns `null`/empty for a reconfigurable `assignee`, the existing assignment is removed and auto-assignment runs.

<!-- CONFLUENCE-ONLY: initialAssignee flow from "WA TM: Setting the Assignee for Task Initiation" page 1824134416. The FEEL expression and validation logic are described in the design doc but implementation status not verified in current source. -->

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
- `OWN` and `CLAIM` permissions **must** appear in the same DMN row for a task to be visible in the "Available tasks" screen in ExUI.
- No spaces after commas in permission value lists — the parser splits on exact comma boundaries and trailing spaces break matching.

<!-- CONFLUENCE-ONLY: DMN configuration rules (OWN+CLAIM same row, no spaces after commas) from "Granular Task Permissions Onboarding" page 1616388317. Business rule not enforced in source code validation but required for correct runtime behaviour. -->

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
