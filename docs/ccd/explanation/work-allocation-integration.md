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
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/CaseEventMessageService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/AbstractMessageService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/message/MessageQueueCandidateEntity.java
  - sscs-tribunals-case-api:sscs-task-configuration/src/main/resources/wa-task-initiation-sscs-benefit.dmn
  - sscs-tribunals-case-api:sscs-task-configuration/src/main/resources/wa-task-configuration-sscs-benefit.dmn
  - sscs-tribunals-case-api:sscs-task-configuration/src/main/resources/wa-task-permissions-sscs-benefit.dmn
  - sscs-tribunals-case-api:sscs-task-configuration/src/main/resources/wa-task-cancellation-sscs-benefit.dmn
  - sscs-tribunals-case-api:definitions/benefit/sheets/CaseEvent/CaseEvent-WA-nonprod.json
  - sscs-tribunals-case-api:definitions/benefit/sheets/CaseField/CaseField-workAllocation.json
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/Service.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "1457304217"
    title: "WA CCD Event Handling NFRs"
    space: "WA"
  - id: "1478710505"
    title: "Task Initiation DMN"
    space: "WA"
  - id: "1632904760"
    title: "Task Configuration repository and Deploying DMNs"
    space: "RET"
  - id: "1753705635"
    title: "Linking Tasks To Case (Event) Data - v2"
    space: "WA"
  - id: "1958285910"
    title: "Consented FR Work Allocation Configuration"
    space: "FR"
  - id: "1457293975"
    title: "WA Task Management API: POST /task"
    space: "WA"
---

# Work Allocation Integration

## TL;DR

- A CCD event marked `Publish=true` causes `ccd-data-store-api` to write a row into its `message_queue_candidates` outbox table; that row is later relayed onto the Azure Service Bus `ccd-case-events` topic, where `wa-case-event-handler` consumes it and drives Camunda DMN evaluation in `wa-workflow-api` and task lifecycle in `wa-task-management-api`.
- ASB sessions are keyed on `caseId`, guaranteeing FIFO per-case processing — only one consumer holds the lock for a given case at a time. Cancellations run before warnings, which run before initiations.
- The DMN tables (initiation, configuration, permissions, cancellation, completion) are owned by the service team and deployed as a dedicated `wa-task-configuration-<service>` Camunda repository. File names must match the pattern `wa-task-{initiation|configuration|cancellation}-{jurisdictionId}-{caseType}` and **a task can only be created when both the initiation and cancellation DMNs are imported**.
- Services using `ccd-config-generator` wire the optional `sdk/task-management` module to push task operations through a transactional outbox to `POST /tasks`, `POST /tasks/terminate`, `PUT /tasks/reconfigure` on `wa-task-management-api`. The outbox poller retries with exponential backoff; task operations are never synchronous with the CCD event.
- Task visibility is governed by the **task permissions DMN** evaluated against the user's AM role assignments — every task type must be mapped to one or more roles in the permissions DMN, otherwise no user can see or claim it.
- Two independent gates must both be open for WA to activate: the CCD event `Publish` flag AND the service's application-level WA feature flag.

---

## How a CCD event produces a task

When a CCD event completes, `ccd-data-store-api` checks whether the event definition has `Publish` set to a truthy value (`CaseEventMessageService.java:41`). If so, it builds a `MessageInformation` payload — `caseId`, `jurisdictionId`, `caseTypeId`, `eventInstanceId`, `eventTimestamp`, `eventId`, `userId`, `previousStateId`, `newStateId`, plus an `AdditionalMessageInformation` block carrying the published case data and definition (`AbstractMessageService.java:33-57`) — and persists it into the `message_queue_candidates` table as a transactional outbox row (`MessageQueueCandidateEntity.java:19`).

A separate publisher then relays each unpublished row onto the Azure Service Bus topic `ccd-case-events`. `wa-case-event-handler` consumes from that topic with a session-based subscription (sessionId = caseId, guaranteeing per-case FIFO) and routes the message into Camunda via `wa-workflow-api`, which evaluates the service's DMN initiation / cancellation tables and correlates messages to BPMN process instances. `wa-task-management-api` is the authoritative store for the resulting tasks.

```
CCD event completes
        │
        ▼
ccd-data-store-api checks event.Publish flag                     [CaseEventMessageService:41]
        │  truthy
        ▼
INSERT INTO message_queue_candidates (transactional outbox)      [MessageQueueCandidateEntity]
        │
        ▼
Azure Service Bus topic: ccd-case-events                         (sessionId = caseId)
        │
        ▼
wa-case-event-handler                                            [apps/wa/wa-case-event-handler]
        │  evaluates DMN via wa-workflow-api
        ▼
        ├─ create task    →  wa-task-management-api  POST /tasks
        ├─ cancel task    →  wa-task-management-api  POST /tasks/terminate
        ├─ reconfigure    →  wa-task-management-api  PUT  /tasks/reconfigure
        └─ warn (raise)   →  Camunda message
```

<!-- DIVERGENCE: Earlier draft said the data-store "publishes a message to the WA message-handler" directly. Source code (ccd-data-store-api/.../CaseEventMessageService.java + MessageQueueCandidateEntity) shows it writes to a `message_queue_candidates` outbox table — delivery to ASB is handled by a separate component, and the consumer is `wa-case-event-handler` (not "wa-message-handler"). Source wins. -->

### The `Publish` flag in CCD definitions

For services using raw JSON definitions (e.g. SSCS), the flag is set per event in the `CaseEvent` sheet:

```json
{ "Publish": "${CCD_DEF_PUBLISH}" }
```

The placeholder is resolved at definition-build time, letting each environment opt in or out independently (`sscs-tribunals-case-api:definitions/benefit/sheets/CaseEvent/CaseEvent-WA-nonprod.json`).

For services using `ccd-config-generator`, the equivalent is calling `EventBuilder.publishToCamunda()` on the event definition (`ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java:131-134`). This sets the `publishToCamunda` boolean field (`Event.java:37`), which the SDK emits as the `Publish` column when generating the definition spreadsheet.

### Per-case ordering and request priority

`wa-case-event-handler` uses ASB session-based subscriptions with `sessionId = caseId`, so events for one case are processed strictly in arrival order and never in parallel. When a single CCD event evaluates to multiple Camunda messages, `wa-case-event-handler` issues them in priority order:

1. Cancellation(s)
2. Warning(s)
3. Initiation(s)

A subsequent group only starts once the prior group is fully delivered. <!-- CONFLUENCE-ONLY: ordering documented in WA CCD Event Handling NFRs (Confluence 1457304217), not directly visible in the consumer source paths grepped. -->

### Idempotency and retries

To make Camunda processing exactly-once even with at-least-once message delivery, each Camunda request carries an idempotency key composed of the **CCD case event message id + an identifier for the row in the DMN initiation table**. If a node crashes mid-processing, another node picks the same ASB message back up, regenerates the same key, and Camunda's idempotent-key check prevents duplicate task creation. <!-- CONFLUENCE-ONLY: WA-internal idempotency strategy (Confluence 1457304217). -->

---

## DMN tables

Each service owns a set of Camunda DMN files, deployed as a dedicated `wa-task-configuration-<service>` microservice (e.g. `civil-wa-task-configuration`, `et-wa-task-configuration`, `sscs-task-configuration`).

### File naming convention

DMN file names must match the pattern:

```
wa-task-{initiation|configuration|cancellation}-{jurisdictionId}-{caseType}
```

A task can only be created when **both** the initiation and cancellation DMNs are imported for the same `{jurisdictionId, caseType}` pair. Deployments to environment Camunda instances run via the `withCamundaOnlyPipeline` Jenkins pipeline (`cnp-jenkins-library`); manual deployment uses the Camunda Cockpit's *Deployments → Deploy* dialog with the tenant ID set to the service's WA tenant identifier (e.g. `employment`, `ia`, `civil`). <!-- CONFLUENCE-ONLY: deployment naming convention from RET space "Task Configuration repository and Deploying DMNs" (Confluence 1632904760). -->

### The five DMN tables

SSCS is a concrete example with five tables (`sscs-task-configuration/src/main/resources/`):

| DMN file | Purpose |
|---|---|
| `wa-task-initiation-sscs-benefit.dmn` | Decides which tasks to create; hit policy `COLLECT` |
| `wa-task-configuration-sscs-benefit.dmn` | Sets task attributes (assignee, due date, priority, work type, role category) |
| `wa-task-permissions-sscs-benefit.dmn` | Maps roles to task-level permissions (Read/Own/Manage/Cancel/Execute/Complete/Claim/Assign/…) |
| `wa-task-cancellation-sscs-benefit.dmn` | Rules for cancelling tasks on event/state transitions; can also `Warn` or `Reconfigure` |
| `wa-task-completion-sscs-benefit.dmn` | Rules for auto-completing tasks on events |

### Initiation DMN

Inputs are the **CCD event ID**, the **post-event state**, plus any case-data fields the service has chosen to publish. Outputs are the skeleton of each task to create:

| Output | Meaning |
|---|---|
| Task ID | Stable type identifier (referenced by all other DMNs) |
| Task Name | Display name shown in the work-basket |
| Delay (`delayDuration`) | Optional working-day delay before the task is initiated; supports a fixed value or a FEEL expression |
| Working Days Allowed | SLA — feeds the `due_date` |
| Process Categories Identifiers | Tags for cross-DMN cancellation grouping (see below) |

For SSCS the initiation DMN evaluates these inputs:

| Input | Source |
|---|---|
| `eventId` | CCD event ID from the published message |
| `postEventState` | CCD case state after the event |
| `ftaResponseReviewRequired` | Case data field |
| `languagePreferenceWelsh` | Case data field |
| `scannedDocumentTypes` | `DynamicList` case field from `CaseField-workAllocation.json` |
| `workType` | `FixedList` `FL_workType` case field from `CaseField-workAllocation.json` |

Services should define WA-specific case fields alongside their main definition. SSCS keeps these in `definitions/benefit/sheets/CaseField/CaseField-workAllocation.json`.

Initiation just creates a **skeleton** task (type + case + minimal metadata). The configuration DMN runs separately to populate full task attributes from current case data.

### Configuration DMN

Inputs are the CCD case data plus the task type. Outputs are name/value pairs added as task attributes, plus a `Can Reconfigure?` flag per attribute. Configuration is re-run when a `Reconfigure` cancellation rule fires, so any attribute that depends on **event-time data not present in the current case data** must be marked non-reconfigurable. <!-- CONFLUENCE-ONLY: reconfiguration constraint from Confluence 1753705635 "Linking Tasks To Case (Event) Data - v2". -->

### Permissions DMN

Maps each task type (and optionally each case-data condition) to one or more role names with permission strings.

| Output | Type | Meaning |
|---|---|---|
| Name | String | Role name (e.g. `judge`, `hmcts-ctsc`, `case-manager`) |
| Value | String | Permissions: comma-separated subset of `Read,Own,Manage,Cancel,Execute,Complete,CompleteOwn,CancelOwn,Claim,Unclaim,Assign,Unassign,UnclaimAssign,UnassignClaim,UnassignAssign` |
| RoleCategory | String | `JUDICIAL`, `LEGAL_OPERATIONS`, `ADMINISTRATOR`, `CTSC`, … |
| Authorisations | String | Restricts to users with these jurisdiction/ticket codes |
| Assignment Priority | Integer | Lower = higher priority when multiple roles match (auto-assignment) |
| Auto Assignable | Boolean | Whether the task can be auto-assigned (only valid for case roles) |

If a service has only one user type (or all users have identical permissions for all tasks), the Task Type input can be `-` to mean "any task". Source for the full permission set: <https://github.com/hmcts/wa-task-management-api/blob/master/src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java>.

### Cancellation DMN and Process Categories

The cancellation DMN takes `From State` + `Event` + `To State` and outputs an `Action` (`Cancel`, `Warn`, or `Reconfigure`) plus optional warning code/text and **Process Categories Identifiers**. The categories are the link back to the initiation DMN — every task created with category `case_progression` can be cancelled by a single `Cancel` rule that targets that category.

Cancellation rules can also dynamically generate per-instance categories. A common pattern: the initiation DMN computes a category like `orderId_<id>` from case data, so that all tasks created against a specific order can be cancelled when that order is closed, without affecting tasks for other orders on the same case. <!-- CONFLUENCE-ONLY: per-instance process categories pattern from Confluence 1753705635. -->

---

## sdk/task-management module (ccd-config-generator)

Services that use `ccd-config-generator` can include the optional `sdk/task-management` Gradle subproject. It provides:

- A **Feign client** (`TaskManagementFeignClient`) targeting `${task-management.api.url}` (`TaskManagementFeignClient.java:23-27`):
  - `POST /tasks` — create a task
  - `POST /tasks/terminate` — terminate a task
  - `PUT /tasks/reconfigure` — reconfigure task attributes
  - `GET /tasks?case_id=&task_types=` — search tasks
- A **transactional outbox** (`TaskOutboxService` + `TaskOutboxPoller`) that writes task operations to a JDBC table and flushes them in batches, retrying with exponential backoff on failure.
- A **`DelayUntilResolver`** for deferred task creation based on interval or date strategies.

`TaskManagementAutoConfiguration` wires all of these as Spring beans (`TaskManagementAutoConfiguration.java:27-119`). S2S auth is registered conditionally when `idam.s2s-auth.secret` and `idam.s2s-auth.microservice` are present (`TaskManagementAutoConfiguration.java:58-73`).

### Key configuration properties

Defaults are bound from `TaskManagementProperties.java`:

| Property | Default | Description |
|---|---|---|
| `task-management.api.url` | — | Base URL of `wa-task-management-api` |
| `task-management.outbox.poller.enabled` | `true` | Enable/disable background poller |
| `task-management.outbox.poller.batchSize` | `5` | Tasks drained per poll cycle (`Poller.batchSize`) |
| `task-management.outbox.poller.processingTimeout` | `PT5M` | Per-batch processing timeout (`Poller.processingTimeout`) |
| `task-management.outbox.retry.initialDelay` | `PT1S` | Backoff initial delay (`Retry.initialDelay`) |
| `task-management.outbox.retry.maxDelay` | `PT5M` | Backoff ceiling (`Retry.maxDelay`) |
| `task-management.outbox.retry.multiplier` | `2.0` | Backoff multiplier (`Retry.multiplier`) |
| `task-management.outbox.retry.maxAttempts` | `0` | Give-up threshold; `0` means retry indefinitely |

---

## Task configuration and the unconfigured-task monitor

After initiation, `wa-task-management-api` configures the task using the configuration DMN — populating attributes from current case data. If the configuration callback fails (e.g. CCD is briefly unreachable, or the service's WA component is down for longer than the retry window), the task is left in an `Unconfigured` state and won't appear in any work-basket.

`wa-task-monitor` (`apps/wa/wa-task-monitor`) is the safety net. It runs scheduled Camunda polls for tasks where `taskState='Unconfigured'` and age exceeds 60 seconds, and re-triggers configuration via `POST /task/{task-id}` on `wa-task-configuration-service`. It also runs periodic maintenance: termination, reconfiguration after `reconfigure_request_time_hours`, and Camunda clean-up in non-production.

---

## Role assignment hooks

Work Allocation task visibility is governed by **AM role assignments evaluated through the permissions DMN**, not by CCD case-level permissions. When `wa-task-management-api` returns or accepts an action on a task, it:

1. Reads the user's role assignments from `am-role-assignment-service`.
2. Evaluates each task against the permissions DMN, taking the **union** of permissions across all matching roles.
3. Filters / authorises the response based on that union.

Service teams do not need to write role-assignment code; they just declare the role types their tasks use inside the permissions DMN. Organisational role assignments are produced upstream by `am-role-assignment-service` from Judicial Reference Data (JRD) and Staff Reference Data (SRD).

<!-- DIVERGENCE: Earlier draft said claiming/assignment grants a "specific-access-* role on the case for the duration of the task". The Consented FR Work Allocation Configuration page (Confluence 1958285910) makes clear that `specific-access-*` roles are produced by the **specific-access-request flow** (the user explicitly requesting case access, with `specific-access-judiciary`/`-admin`/`-ctsc` mapping by their primary org role), not as an automatic side-effect of claiming a WA task. No code in `apps/wa/wa-task-management-api/src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/` creates `specific-access-*` role assignments. Source wins; see [Notice of Change & Specific Access](case-access.md) if/when that page is drafted for the user-driven flow. -->

In local development with `rse-cft-lib`, both `amRoleAssignmentService` and `waTaskManagementApi` are launched in-process (`rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/Service.java:8,15-28`), so no external dependencies are needed for integration testing. `wa-task-management-api` brings its own `cft_task_db` Postgres schema and `CCD_URL` configured to the local data-store on port 4452.

---

## Linking tasks to event-time data

Some services need a task to remember an order ID, document ID, or other entity identifier that was specific to the **event that initiated it**, even after the task is reconfigured against newer case data. The pattern (no code changes required to WA itself):

1. Ensure the relevant ID is **published** in the CCD event message — either by adding it to the published case data, or by populating a top-level `affectedOrderId`-style field at event time.
2. In the **initiation DMN**, dynamically build a Process Category that embeds the ID (e.g. `orderId_12345678`). This becomes a Camunda process variable `__processCategory__orderId_12345678 = true` on the BPMN instance.
3. In the **configuration DMN**, set an `additionalProperties_orderId` task attribute that extracts the ID. **Mark this attribute non-reconfigurable** — process category variables are not available during reconfiguration, only during initial configuration.
4. In the **cancellation DMN**, target the same dynamic category to cancel only this order's tasks when the order closes.

Service callbacks that handle task completion can read the `additionalProperties` collection from EXUI directly, or fetch the full task from `wa-task-management-api` if EXUI hasn't passed it. <!-- CONFLUENCE-ONLY: pattern fully documented in Confluence 1753705635 "Linking Tasks To Case (Event) Data - v2"; not visible in source as it is a configuration convention. -->

---

## Enabling WA: two-gate checklist

Both gates must be open simultaneously:

1. **CCD definition `Publish` flag** — set to a truthy value (or inject via `${CCD_DEF_PUBLISH}`) on every event that should trigger task evaluation. For raw JSON definitions, control this via a build-time argument (`wa_enabled` in `bin/create-xlsx.sh` for SSCS). For `ccd-config-generator`, call `.publishToCamunda()` on the event builder.

2. **Application feature flag** — enable the WA feature flag in the service's `application.yaml` (e.g. `WORK_ALLOCATION_FEATURE=true` for SSCS). Without this, the service will not process or forward WA-related data even if the CCD event publishes.

In SSCS preview environments, add the `pr-values:wa` label to the PR to activate both gates.

Onboarding checklist (per WA programme):
- Reference Data — judicial appointments / staff roles loaded into JRD / SRD.
- Access Management — organisational role mappings configured for the service's RoleCategory and work types.
- Task Management — initiation, configuration, permissions, cancellation (and optionally completion) DMNs delivered in `<service>-wa-task-configuration` and deployed via `withCamundaOnlyPipeline`.

---

## See also

- [`docs/ccd/explanation/callbacks.md`](callbacks.md) — how `aboutToSubmit` and `submitted` callbacks relate to the event lifecycle before WA messages are published
- [`docs/ccd/explanation/work-basket.md`](work-basket.md) — how XUI surfaces WA tasks alongside the work-basket views configured in CCD
- [`docs/ccd/reference/glossary.md`](../reference/glossary.md) — definitions for DMN, outbox pattern, role assignment

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

