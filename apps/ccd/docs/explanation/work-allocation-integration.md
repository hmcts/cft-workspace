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
  - sscs-task-configuration:src/main/resources/wa-task-initiation-sscs-benefit.dmn
  - sscs-task-configuration:src/main/resources/wa-task-configuration-sscs-benefit.dmn
  - sscs-task-configuration:src/main/resources/wa-task-permissions-sscs-benefit.dmn
  - sscs-task-configuration:src/main/resources/wa-task-cancellation-sscs-benefit.dmn
  - sscs-tribunals-case-api:definitions/benefit/sheets/CaseEvent/CaseEvent-WA-nonprod.json
  - sscs-tribunals-case-api:definitions/benefit/sheets/CaseField/CaseField-workAllocation.json
  - rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/Service.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/entity/TaskRoleResource.java
  - am-role-assignment-service:src/main/resources/validationrules/core/specific-access-global.drl
status: confluence-augmented
last_reviewed: 2026-08-20T00:00:00Z
confluence_checked_at: 2026-08-20T00:00:00Z
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
    title: "Consented & Contested FR Work Allocation Configuration"
    space: "FR"
    version: 108
    last_modified: "2026-07-30"
  - id: "1457293975"
    title: "WA Task Management API: POST /task"
    space: "WA"
title: Work Allocation Integration
diataxis: explanation
product: ccd
sources_sha:
  "ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskManagementAutoConfiguration.java": "e96997b6818ee8b7d4690b2b14bcdacad85073f9"
  "ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskManagementFeignClient.java": "f21eba4c359e7630356daf50092dfbc47b6ab4ca"
  "ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskManagementProperties.java": "f21eba4c359e7630356daf50092dfbc47b6ab4ca"
  "ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskOutboxService.java": "f21eba4c359e7630356daf50092dfbc47b6ab4ca"
  "ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskOutboxPoller.java": "49f46689ca2fdd6eb78000b1f0e1310bd1bc30db"
  "ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/delay/DelayUntilResolver.java": "f21eba4c359e7630356daf50092dfbc47b6ab4ca"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java": "ac7903028377c2d50c8f1db55c4150eae2fa7414"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/CaseEventMessageService.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/AbstractMessageService.java": "9c7139a70732f6dca95acb412c36706fa9e79be8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/message/MessageQueueCandidateEntity.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "sscs-task-configuration:src/main/resources/wa-task-initiation-sscs-benefit.dmn": "f9c225c38b9e507d420ddf51357168da983992f6"
  "sscs-task-configuration:src/main/resources/wa-task-configuration-sscs-benefit.dmn": "39129320989e98432616d74c6d911f0a15ddd27c"
  "sscs-task-configuration:src/main/resources/wa-task-permissions-sscs-benefit.dmn": "39129320989e98432616d74c6d911f0a15ddd27c"
  "sscs-task-configuration:src/main/resources/wa-task-cancellation-sscs-benefit.dmn": "c2e7ce3a1ffc5389fd29070b497fdad74f1b6f10"
  "sscs-tribunals-case-api:definitions/benefit/sheets/CaseEvent/CaseEvent-WA-nonprod.json": "56ce269dbc5c1c943c0d0eac18c6a78af87eaafb"
  "sscs-tribunals-case-api:definitions/benefit/sheets/CaseField/CaseField-workAllocation.json": "e7dcb4b26956f9dc7d2a63b3abb4a2aa30e73d5d"
  "rse-cft-lib:cftlib/rse-cft-lib-plugin/src/main/java/uk/gov/hmcts/rse/Service.java": "732ec28c7a68359452f0e767b5bd605d10608e61"
  ? "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/auth/permission/entities/PermissionTypes.java"
  : "272fb0b4257fe638eeea7af521ae84738cec491a"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/entity/TaskRoleResource.java": "a6e0eb1659e9b67f5ef737edcd4340c33bac0421"
  "am-role-assignment-service:src/main/resources/validationrules/core/specific-access-global.drl": "bad95f7ce33c1274c781283dd657fb1575bee6bd"
---

# Work Allocation Integration

## TL;DR

- A CCD event marked `Publish=true` causes `ccd-data-store-api` to write a row into its `message_queue_candidates` outbox table; that row is later relayed onto the Azure Service Bus `ccd-case-events` topic, where `wa-case-event-handler` consumes it and drives Camunda DMN evaluation in `wa-workflow-api` and task lifecycle in `wa-task-management-api`.
- ASB sessions are keyed on `caseId`, guaranteeing FIFO per-case processing — only one consumer holds the lock for a given case at a time. Cancellations run before warnings, which run before initiations.
- The DMN tables (initiation, configuration, permissions, cancellation, completion) are owned by the service team and deployed as a dedicated `wa-task-configuration-<service>` Camunda repository. File names must match the pattern `wa-task-{initiation|configuration|cancellation}-{jurisdictionId}-{caseType}` and **a task can only be created when both the initiation and cancellation DMNs are imported**.
- Services using `ccd-config-generator` wire the optional `sdk/task-management` module to push task operations through a transactional outbox to `POST /tasks`, `POST /tasks/terminate`, `PUT /tasks/reconfigure` on `wa-task-management-api`. The outbox poller retries with exponential backoff; task operations are never synchronous with the CCD event.
- Task visibility is governed by the **task permissions DMN**, but it is evaluated at task *configuration* time and stamped onto the task as `task_roles` rows; the user's AM role assignments are matched against that stamp at query time. Every task type must be mapped to one or more roles, otherwise no user can see or claim it — and editing the DMN does not fix tasks that already exist.
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

Two conventions make this DMN do more work than "copy case fields onto the task":

- **Defaults.** An output expression can fall back to a constant when the case field is absent —
  e.g. default the task's location to a named venue when the case has no location yet. Without
  this, tasks initiated early in a case's life acquire null attributes and drop out of
  location-filtered work-baskets.
- **Case data as an input, not just a source.** Because case data is also on the input side, one
  task type can take different attributes depending on the case: a *Review Application* task can
  be configured with `role_category = JUDICIAL` when a "complex case" flag is set and
  `LEGAL_OPERATIONS` when it is not. That is the intended mechanism for routing by case
  characteristics — not defining two task types.

Any attribute the DMN reads must have been **published** with the CCD event; the configuration
step sees the message payload, not a live view of the case.

### Permissions DMN

Maps each task type (and optionally each case-data condition) to one or more role names with permission strings.

| Input | Type | Meaning |
|---|---|---|
| Task Type | String | The task ID from the initiation DMN, or `-` for "any task" |
| Case Data | Expression | Case-data condition that selects between alternative permission sets |
| Case Access Category | String | Narrows the rule to cases in a given access category |

| Output | Type | Meaning |
|---|---|---|
| Name | String | Role name (e.g. `judge`, `hmcts-ctsc`, `case-manager`) |
| Value | String | Permissions: comma-separated subset of the 16 `PermissionTypes` values |
| RoleCategory | String | `JUDICIAL`, `LEGAL_OPERATIONS`, `ADMINISTRATOR`, `CTSC`, … |
| Authorisations | String | Restricts to users with these jurisdiction/ticket codes |
| Assignment Priority | Integer | Lower = higher priority when multiple roles match (auto-assignment) |
| Auto Assignable | Boolean | Whether the task can be auto-assigned. Only case roles can be auto-assigned, so this may only be true when `Name` is a case role |
| Annotations | String | Free-text documentation of the rule; no runtime effect |

If a service has only one user type (or all users have identical permissions for all tasks), the Task Type input can be `-` to mean "any task".

The authoritative permission vocabulary is the `PermissionTypes` enum
(`PermissionTypes.java:11-26`): `Read`, `Refer`, `Own`, `Manage`, `Execute`, `Cancel`,
`Complete`, `CompleteOwn`, `CancelOwn`, `Claim`, `Unclaim`, `Assign`, `Unassign`,
`UnclaimAssign`, `UnassignClaim`, `UnassignAssign`. Each maps to a boolean column on the
`task_roles` table (`TaskRoleResource.java:27`, `:43-84`) — **except `Refer`, whose field is
`@Transient`** and therefore never persisted (`TaskRoleResource.java:57-58`). Treat `Refer` in a
permissions DMN as decorative until you have confirmed the behaviour you expect from it.

<!-- DIVERGENCE: An earlier draft of this page enumerated 15 permissions and omitted `Refer`. PermissionTypes.java:12 defines REFER("Refer", "refer"), so a DMN using it parses; it is the persistence that drops it. The same draft cited the enum by GitHub URL — wa-task-management-api is cloned at apps/wa/wa-task-management-api, so it is now cited as source. -->

### Where task permissions actually live

Two things are easy to conflate. The permissions DMN is **not** consulted when a user opens
their work-basket. It is evaluated when the task is configured (and again on reconfiguration),
and the result is written onto the task as `task_roles` rows — one row per role name, with the
boolean permission columns, `authorizations`, `assignment_priority` and `auto_assignable`
(`TaskRoleResource.java:27-90`). At query time `wa-task-management-api` matches the user's
current AM role assignments against those stored rows.

The practical consequence: **changing a permissions DMN does not retrospectively change existing
tasks.** Already-configured tasks keep the permissions they were stamped with until something
reconfigures them. A permissions fix that appears to have had no effect has usually worked
correctly on new tasks only.

### Cancellation DMN and Process Categories

The cancellation DMN takes `From State` + `Event` + `To State` and outputs an `Action` (`Cancel`, `Warn`, or `Reconfigure`) plus optional warning code/text and **Process Categories Identifiers**. The categories are the link back to the initiation DMN — every task created with category `case_progression` can be cancelled by a single `Cancel` rule that targets that category.

`From State` may be left blank when the event can occur in any state, so the three inputs
support all three shapes of rule: on an event alone, on an event in a particular state, or on a
state transition. A rule with no Process Categories Identifiers cancels *every* task on the case
— the usual pattern for `closeCase`. Cancellation is terminal: a cancelled task moves to
`Terminated` and stops appearing in task lists, so it cannot be revived by a later event. Users
can also cancel tasks by hand in ExUI; treat that as an escape hatch, not part of the design — a
task that routinely needs manual cancellation is a missing cancellation rule.

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
2. Matches those role names against the task's stored `task_roles` rows — the permissions the DMN
   stamped onto the task when it was configured, not a fresh DMN evaluation — taking the
   **union** of permissions across all matching roles.
3. Filters / authorises the response based on that union.

Service teams do not need to write role-assignment code; they just declare the role types their tasks use inside the permissions DMN. Organisational role assignments are produced upstream by `am-role-assignment-service` from Judicial Reference Data (JRD) and Staff Reference Data (SRD).

<!-- DIVERGENCE: Earlier draft said claiming/assignment grants a "specific-access-* role on the case for the duration of the task". Confluence 1958285910 (v108) describes `specific-access-*` roles as products of the user-driven specific-access-request flow, and source agrees: they are created by drools rules in am-role-assignment-service (specific-access-global.drl:29-62 for the request, :117-140 for grant/deny), keyed on process == "specific-access", not by anything in wa-task-management-api. Source wins. -->

Requesting and approving case access is a role-assignment concern rather than a WA one, and it
touches WA only in that services configure `reviewSpecificAccessRequest<Category>` tasks so the
right approver sees the request. Two details are worth knowing while onboarding:
`specific-access-granted` / `-denied` assignments can only be created by a request whose
`clientId` is `xui_webapp` (`specific-access-global.drl:121`), so an approval cannot be driven
from a service's own S2S integration; and the approver's role must match the requested role
category exactly — `specific-access-approver-judiciary` may approve `specific-access-judiciary`
and nothing else (`:207-211`). See
[Role assignment](role-assignment.md#specific-and-challenged-access) for the full model.

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

Onboarding checklist (per WA programme). WA is three components, and a service must onboard to
all three — a service with perfect DMNs and no role mappings has invisible tasks:

- **Reference Data** — judicial appointments loaded into JRD and staff roles into SRD; the
  service's HMCTS service code and case types registered; the service's **skills** defined, since
  skill codes are what allow tasks to be matched to suitably-qualified users.
- **Access Management** — organisational role mappings configured for the service's
  RoleCategories and work types, plus the case-role validation rules for the jurisdiction.
- **Task Management** — initiation, configuration, permissions, cancellation (and optionally
  completion) DMNs delivered in `<service>-wa-task-configuration` and deployed via
  `withCamundaOnlyPipeline`.

Two things commonly overlooked: **work types** have to be declared before the configuration DMN
can reference them, and services are expected to onboard to **global search** alongside WA, since
that is how users find the cases their tasks point at.
<!-- CONFLUENCE-ONLY: the skills / work-type / global-search onboarding items come from the WA configuration template as used by Consented & Contested Financial Remedy (page 1958285910, v108). Not derivable from source. -->

---

## See also

- [`apps/ccd/docs/explanation/callbacks.md`](callbacks.md) — how `aboutToSubmit` and `submitted` callbacks relate to the event lifecycle before WA messages are published
- [`apps/ccd/docs/explanation/work-basket.md`](work-basket.md) — how XUI surfaces WA tasks alongside the work-basket views configured in CCD
- [Asynchronous Case-Event Messaging](messaging.md) — the outbox table, `ccd-message-publisher`, and the Service Bus pipeline that delivers events to WA
- [`apps/ccd/docs/reference/glossary.md`](../reference/glossary.md) — definitions for DMN, outbox pattern, role assignment

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.
