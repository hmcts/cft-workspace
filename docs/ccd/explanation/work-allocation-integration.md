---
topic: work-allocation
audience: both
sources:
  - ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskManagementAutoConfiguration.java
  - ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskManagementFeignClient.java
  - ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskManagementProperties.java
  - ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskOutboxService.java
  - ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskOutboxPoller.java
  - ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/delay/DelayUntilResolver.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - sscs-tribunals-case-api:sscs-task-configuration/src/main/resources/wa-task-initiation-sscs-benefit.dmn
  - sscs-tribunals-case-api:sscs-task-configuration/src/main/resources/wa-task-configuration-sscs-benefit.dmn
  - sscs-tribunals-case-api:sscs-task-configuration/src/main/resources/wa-task-permissions-sscs-benefit.dmn
  - sscs-tribunals-case-api:sscs-task-configuration/src/main/resources/wa-task-cancellation-sscs-benefit.dmn
  - sscs-tribunals-case-api:definitions/benefit/sheets/CaseEvent/CaseEvent-WA-nonprod.json
  - sscs-tribunals-case-api:definitions/benefit/sheets/CaseField/CaseField-workAllocation.json
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/Service.java
status: reviewed
last_reviewed: 2026-04-29T00:00:00Z
---

# Work Allocation Integration

## TL;DR

- A CCD event marked `publishToCamunda=true` causes CCD to publish a message to the WA message-handler after the event completes; `wa-task-management-api` then evaluates Camunda DMN tables to decide which tasks to create, reconfigure, or cancel.
- The DMN tables (initiation, configuration, permissions, cancellation, completion) are owned by the service team and deployed to a dedicated task-configuration service — not inside `ccd-data-store-api`.
- Services using `ccd-config-generator` wire the `sdk/task-management` module to push task operations through a transactional outbox to `POST /tasks`, `POST /tasks/terminate`, and `PUT /tasks/reconfigure` on `wa-task-management-api`.
- The outbox poller retries with exponential backoff; task operations are never synchronous.
- Access Management role assignments control who can see and claim tasks; the AM `am-role-assignment-service` is a hard dependency — it runs in-process in local cftlib stacks.
- Two independent gates must both be open for WA to activate: the CCD event `Publish` flag AND the service's application-level feature flag.

---

## How a CCD event produces a task

When a CCD event completes, the data-store checks whether the event definition has `Publish` set to a truthy value. If it does, the data-store publishes a message containing the `eventId`, `caseId`, and `postEventState` to the WA message-handler. The message-handler calls `wa-task-management-api`, which evaluates the service's Camunda DMN initiation table to decide which tasks (if any) to create.

```
CCD event completes
        │
        ▼
CCD data-store checks event.Publish flag
        │  truthy
        ▼
Publishes message {eventId, caseId, postEventState, caseData fields}
        │
        ▼
wa-task-management-api evaluates DMN initiation table
        │
        ├─ create task  →  POST /tasks
        ├─ cancel task  →  POST /tasks/terminate
        └─ reconfigure  →  PUT /tasks/reconfigure
```

### The `Publish` flag in CCD definitions

For services using raw JSON definitions (e.g. SSCS), the flag is set per event in the `CaseEvent` sheet:

```json
{ "Publish": "${CCD_DEF_PUBLISH}" }
```

The placeholder is resolved at definition-build time, letting each environment opt in or out independently (`sscs-tribunals-case-api:definitions/benefit/sheets/CaseEvent/CaseEvent-WA-nonprod.json`).

For services using `ccd-config-generator`, the equivalent is calling `EventBuilder.publishToCamunda()` on the event definition (`ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java:131-134`). This sets the `publishToCamunda` boolean field (`Event.java:37`), which the SDK emits as the `Publish` column when generating the definition spreadsheet.

---

## DMN tables

Each service owns a set of Camunda DMN files, typically deployed as a dedicated `wa-task-configuration-<service>` microservice. SSCS is a concrete example with five tables (`sscs-task-configuration/src/main/resources/`):

| DMN file | Purpose |
|---|---|
| `wa-task-initiation-sscs-benefit.dmn` | Decides which tasks to create; hit policy `COLLECT` |
| `wa-task-configuration-sscs-benefit.dmn` | Sets task attributes (assignee, due date, priority) |
| `wa-task-permissions-sscs-benefit.dmn` | Maps roles to task-level permissions |
| `wa-task-cancellation-sscs-benefit.dmn` | Rules for cancelling tasks on state transitions |
| `wa-task-completion-sscs-benefit.dmn` | Rules for auto-completing tasks on events |

### Initiation DMN inputs

The initiation DMN for SSCS evaluates these inputs (`service-sscs` research):

| Input | Source |
|---|---|
| `eventId` | CCD event ID from the published message |
| `postEventState` | CCD case state after the event |
| `ftaResponseReviewRequired` | Case data field |
| `languagePreferenceWelsh` | Case data field |
| `scannedDocumentTypes` | `DynamicList` case field from `CaseField-workAllocation.json` |
| `workType` | `FixedList` `FL_workType` case field from `CaseField-workAllocation.json` |

Services should define WA-specific case fields alongside their main definition. SSCS keeps these in `definitions/benefit/sheets/CaseField/CaseField-workAllocation.json`.

---

## sdk/task-management module (ccd-config-generator)

Services that use `ccd-config-generator` can include the optional `sdk/task-management` Gradle subproject. It provides:

- A **Feign client** (`TaskManagementFeignClient`) targeting `${task-management.api.url}`:
  - `POST /tasks` — create a task
  - `POST /tasks/terminate` — terminate a task
  - `PUT /tasks/reconfigure` — reconfigure task attributes
  - `GET /tasks?case_id=&task_types=` — search tasks
- A **transactional outbox** (`TaskOutboxService` + `TaskOutboxPoller`) that writes task operations to a JDBC table and flushes them in batches, retrying with exponential backoff on failure.
- A **`DelayUntilResolver`** for deferred task creation based on interval or date strategies.

`TaskManagementAutoConfiguration` wires all of these as Spring beans (`TaskManagementAutoConfiguration.java:29-118`). S2S auth is registered conditionally when `idam.s2s-auth.secret` and `idam.s2s-auth.microservice` are present (`TaskManagementAutoConfiguration.java:59-72`).

### Key configuration properties

| Property | Default | Description |
|---|---|---|
| `task-management.api.url` | — | Base URL of `wa-task-management-api` |
| `task-management.outbox.poller.enabled` | `true` | Enable/disable background poller |
| `task-management.outbox.poller.batchSize` | `5` | Tasks drained per poll cycle |
| `task-management.outbox.retry.initialDelay` | — | Backoff initial delay |
| `task-management.outbox.retry.maxDelay` | — | Backoff ceiling |
| `task-management.outbox.retry.multiplier` | — | Backoff multiplier |
| `task-management.outbox.retry.maxAttempts` | — | Give-up threshold |

---

## Role assignment hooks

Work Allocation task visibility is governed by AM role assignments, not by CCD case permissions. When a user claims or is assigned a task, `am-role-assignment-service` grants a `specific-access-*` role on the case for the duration of the task. The role assignment is removed when the task completes or is cancelled.

`wa-task-management-api` calls AM directly; service teams do not need to write role-assignment code. However, services must declare the role types their tasks use inside the permissions DMN (`wa-task-permissions-sscs-benefit.dmn`) so that AM can enforce them.

In local development with `rse-cft-lib`, both `amRoleAssignmentService` and `waTaskManagementApi` are launched in-process (`rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/Service.java:7-28`), so no external dependencies are needed for integration testing.

---

## Enabling WA: two-gate checklist

Both gates must be open simultaneously:

1. **CCD definition `Publish` flag** — set to a truthy value (or inject via `${CCD_DEF_PUBLISH}`) on every event that should trigger task evaluation. For raw JSON definitions, control this via a build-time argument (`wa_enabled` in `bin/create-xlsx.sh` for SSCS). For `ccd-config-generator`, call `.publishToCamunda()` on the event builder.

2. **Application feature flag** — enable the WA feature flag in the service's `application.yaml` (e.g. `WORK_ALLOCATION_FEATURE=true` for SSCS). Without this, the service will not process or forward WA-related data even if the CCD event publishes.

In SSCS preview environments, add the `pr-values:wa` label to the PR to activate both gates.

---

## See also

- [`docs/ccd/explanation/callbacks.md`](callbacks.md) — how `aboutToSubmit` and `submitted` callbacks relate to the event lifecycle before WA messages are published
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions for DMN, outbox pattern, role assignment

## Glossary

| Term | Definition |
|---|---|
| **DMN** | Decision Model and Notation — XML-based Camunda rules table evaluated by `wa-task-management-api` to determine task actions |
| **Outbox pattern** | Task operations are persisted to a local DB table first; a background poller delivers them to the remote API with retry, decoupling the event transaction from the WA API call |
| **`publishToCamunda`** | Boolean field on a CCD event definition that tells the data-store to emit a WA message after the event completes |
| **specific-access role** | AM role granted to a user for the lifetime of a WA task, giving them CCD case access scoped to that task |
