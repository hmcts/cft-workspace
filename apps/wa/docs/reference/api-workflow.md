---
title: Api Workflow
topic: architecture
diataxis: reference
product: wa
audience: both
sources:
  - wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/controllers/startworkflow/CreateTaskController.java
  - wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/service/CamundaClient.java
  - wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/service/TaskClientService.java
  - wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/model/EvaluateDmnRequest.java
  - wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/model/SendMessageRequest.java
  - wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/service/ExternalTaskWorker.java
  - wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/service/idempotency/IdempotencyTaskWorkerHandler.java
  - wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/service/handler/WarningTaskWorkerHandler.java
  - wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/domain/camunda/DmnAndMessageNames.java
  - wa-standalone-task-bpmn:src/main/resources/wa-task-initiation-ia-asylum.bpmn
  - wa-workflow-api:src/main/resources/application.yaml
  - wa-standalone-task-bpmn:Jenkinsfile_CNP
  - wa-standalone-task-bpmn:camunda-deployment.sh
  - wa-task-configuration-template:Jenkinsfile_CNP
  - wa-task-configuration-template:camunda-deployment.sh
  - wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn
  - wa-task-configuration-template:src/main/resources/wa-task-completion-wa-wacasetype.dmn
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/domain/camunda/CamundaVariableDefinition.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/calendar/DateCalculator.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/calendar/DateType.java
status: needs-fix
last_reviewed: 2026-05-13T00:00:00Z
examples_extracted_from:
  - apps/wa/wa-workflow-api/src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/service/CamundaClient.java
  - apps/wa/wa-workflow-api/src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/model/SendMessageRequest.java
confluence:
  - id: "1507732125"
    title: "WA Workflow API - POST /workflow/message"
    last_modified: "unknown"
    space: "WA"
  - id: "1507732099"
    title: "Workflow API Guidelines"
    last_modified: "unknown"
    space: "WA"
  - id: "1478692006"
    title: "Camunda API"
    last_modified: "unknown"
    space: "WA"
  - id: "1438947851"
    title: "WA Low Level Design"
    last_modified: "unknown"
    space: "WA"
  - id: "1464025708"
    title: "WA Camunda Artefact Deployments"
    last_modified: "unknown"
    space: "WA"
confluence_checked_at: "2026-05-13T00:00:00Z"
sources_sha:
  "wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/controllers/startworkflow/CreateTaskController.java": "6b973ba98684616920e661cf2653e161e58fd20f"
  "wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/service/CamundaClient.java": "120f1462b5aa74a5c3b9ea39210daa1db5960770"
  "wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/service/TaskClientService.java": "5bd734b0053592f47552289fb0169ec7c23eac28"
  "wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/model/EvaluateDmnRequest.java": "1266bf7d6b0ef225fa88b5223d8c01e19cf470cb"
  "wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/model/SendMessageRequest.java": "f24304488ff069b4b5439b39564646066feccc72"
  "wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/service/ExternalTaskWorker.java": "4fadbadb976f0b5fcc9cf37e588df8da887447e4"
  "wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/service/idempotency/IdempotencyTaskWorkerHandler.java": "98bbde3b945f6fc2ddc831668f96abeed91d1259"
  "wa-workflow-api:src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/service/handler/WarningTaskWorkerHandler.java": "5bd734b0053592f47552289fb0169ec7c23eac28"
  "wa-case-event-handler:src/main/java/uk/gov/hmcts/reform/wacaseeventhandler/domain/camunda/DmnAndMessageNames.java": "677e0581c9fad1f6109115c5eb3d8ed9e1232091"
  "wa-standalone-task-bpmn:src/main/resources/wa-task-initiation-ia-asylum.bpmn": "ef2e773a0dfbc538d1b0e7dab33fb6906c2b6510"
  "wa-workflow-api:src/main/resources/application.yaml": "678f3ee768ea5d724a3a21643aac34eb59859ed0"
  "wa-standalone-task-bpmn:Jenkinsfile_CNP": "b42cd068e293d2cdda5c67fd5a11b3d1258b28aa"
  "wa-standalone-task-bpmn:camunda-deployment.sh": "3eb967ce19a71b9821506abfdd0166fc692e234a"
  "wa-task-configuration-template:Jenkinsfile_CNP": "eb301aedd88b8103f48f58b953ff58c4cbac5333"
  "wa-task-configuration-template:camunda-deployment.sh": "0a58de5ec9a536dc6f319f113a1ff203f6cb77dd"
  "wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn": "510747dd6d79a189f498d51c500718bb30adf51c"
  "wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn": "d93044190a89ac64e5b112dacb6df5c6af2273bd"
  "wa-task-configuration-template:src/main/resources/wa-task-completion-wa-wacasetype.dmn": "f256d9afd3ae0ee4420642d1a7648e271423f4a4"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/domain/camunda/CamundaVariableDefinition.java": "b83f756ff73266f9ae6181f0427ae32e1f4a09e9"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/calendar/DateCalculator.java": "3f8bd2dd559caacad64b6c9c8286d0402dcee87a"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/calendar/DateType.java": "1145b29f89b2e45601917fc0ec0c6b8801b783be"
---

## TL;DR

- `wa-workflow-api` is the thin gateway between WA services and the Camunda BPMN/DMN engine, running on port 8099 (host: `wa-workflow-api-{env}.service.core-compute-{env}.internal`).
- Two HTTP endpoints: DMN evaluation (`POST /workflow/decision-definition/...`) and message correlation (`POST /workflow/message`).
- Three supported BPMN message names: `createTaskMessage` (initiate task), `cancelTasks` (cancel process), `warnProcess` (apply warnings).
- All inbound auth is S2S only; outbound calls to Camunda carry a generated S2S `ServiceAuthorization` header.
- Two external task workers run in-process: `idempotencyCheck` (deduplication) and `wa-warning-topic` (warning propagation).
<!-- REVIEW: The Feign client targets `${camunda.url}` directly (see CamundaClient.java @FeignClient annotation), and `camunda.url` defaults to `http://camunda-bpm/engine-rest` (application.yaml:21). The `/engine-rest` is already part of the configured URL, not appended by the client. Should say `${camunda.url}` not `{camunda.url}/engine-rest`. -->
- The service does not own task data — it is a passthrough to Camunda's REST API via a Feign client targeting `{camunda.url}/engine-rest`.

## Integration Prerequisites

Any service wanting to integrate with the Workflow API must be whitelisted (added to the `WA_S2S_AUTHORIZED_SERVICES` config). The list defaults to `wa_workflow_api`, `wa_case_event_handler`, `camunda-bpm`, `xui_webapp` and `wa_task_management_api` (`wa-workflow-api:src/main/resources/application.yaml:84-85`); a caller presenting a valid S2S token for any other microservice name is rejected before any Camunda call is attempted. The onboarding process:

1. Create a ticket on the Work Allocation team Jira board stating: team name, the endpoint needed, a brief reason, and the S2S microservice name (e.g. `xui_webapp`).
2. Notify the WA dev team on Slack: `#wa-dev` (`https://hmcts-reform.slack.com/archives/C01LY6L40KT`).

<!-- CONFLUENCE-ONLY: not verified in source -->

**OpenAPI docs (AAT, requires VPN)**: `http://wa-workflow-api-aat.service.core-compute-aat.internal/swagger-ui/index.html`

---

## Endpoints

### DMN Evaluation

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/workflow/decision-definition/key/{key}/tenant-id/{tenant-id}/evaluate` |
| **Auth** | S2S token (header `ServiceAuthorization`) |
| **Request body** | `EvaluateDmnRequest` |
| **Success response** | `200 OK` with `EvaluateDmnResponse` |
| **Error responses** | `404` if DMN table not found; `500` on Camunda error |
| **Controller** | `CreateTaskController.evaluateDmn` (`CreateTaskController.java:84-96`) |

**Path parameters**

| Parameter | Description | Example |
|-----------|-------------|---------|
| `key` | Camunda decision definition key (not the DMN filename) | `wa-task-initiation-wa-wacasetype` |
| `tenant-id` | Jurisdiction string used as Camunda tenant | `ia`, `wa`, `civil` |

**Request body: `EvaluateDmnRequest`**

```json
{
  "variables": {
    "eventId": { "value": "uploadHomeOfficeBundle", "type": "String" },
    "postEventState": { "value": "awaitingRespondentEvidence", "type": "String" },
    "additionalData": { "value": { "key": "value" }, "type": null }
  }
}
```

Each entry is a `DmnValue<T>` with fields `value` (typed) and `type` (String, nullable for map values).

**Response body: `EvaluateDmnResponse`**

```json
{
  "results": [
    {
      "taskId": { "value": "reviewRespondentEvidence", "type": "String" },
      "name": { "value": "Review Respondent Evidence", "type": "String" },
      "workingDaysAllowed": { "value": 2, "type": "Integer" },
      "processCategories": { "value": "caseProgression", "type": "String" }
    }
  ]
}
```

If no DMN row matches, response is `200` with `{ "results": [] }`.

**Post-processing**: `TaskClientService.removeSpaces` (`TaskClientService.java:50-76`) strips spaces from comma-separated String values in every output row. For example, `"Read, Own, Cancel"` becomes `"Read,Own,Cancel"`. Callers must not rely on spaces being preserved in multi-value string outputs.

**Known DMN key patterns**

All DMN keys follow the naming convention `<table-name>-<jurisdiction>-<casetype>` (all lowercase). The jurisdiction is used as the Camunda tenant ID.

| Key pattern | Evaluated by | Purpose |
|-------------|--------------|---------|
| `wa-task-initiation-{jurisdiction}-{caseType}` | `wa-case-event-handler` | Determines which tasks to create for a case event |
| `wa-task-cancellation-{jurisdiction}-{caseType}` | `wa-case-event-handler` | Determines tasks/processes to cancel or warn on a case event |
| `wa-task-configuration-{jurisdiction}-{caseType}` | `wa-task-management-api` | Configures task attributes from CCD case data |
| `wa-task-permissions-{jurisdiction}-{caseType}` | `wa-task-management-api` | Returns role-to-permission mappings for a task type |
| `wa-task-completion-{jurisdiction}-{caseType}` | `wa-task-management-api` | Rules for search-for-completable endpoint |
| `wa-task-types-{jurisdiction}-{caseType}` | `wa-task-management-api` | Lists available task types for a jurisdiction/case type |

---

### Message Correlation

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/workflow/message` |
| **Auth** | S2S token (header `ServiceAuthorization`) |
| **Request body** | `SendMessageRequest` |
| **Success response** | `204 No Content` |
| **Error responses** | `500` if message name is invalid or no matching process |
| **Controller** | `CreateTaskController.sendMessage` (`CreateTaskController.java:131-136`) |

**Request body: `SendMessageRequest`**

| Field | Type | Description |
|-------|------|-------------|
| `messageName` | `String` | BPMN message name (e.g. `createTaskMessage`) |
| `processVariables` | `Map<String, DmnValue<?>>` | Variables passed to the BPMN process instance |
| `correlationKeys` | `Map<String, DmnValue<?>>` | Keys to correlate to an existing process; `null` starts a new process |
| `all` | `boolean` | If `true`, correlates to ALL matching process instances |

**Example request for task creation**

```json
{
  "messageName": "createTaskMessage",
  "processVariables": {
    "taskId": { "value": "reviewRespondentEvidence", "type": "String" },
    "name": { "value": "Review Respondent Evidence", "type": "String" },
    "dueDate": { "value": "2024-03-15T16:00:00", "type": "String" },
    "jurisdiction": { "value": "ia", "type": "String" },
    "caseTypeId": { "value": "Asylum", "type": "String" },
    "caseId": { "value": "1234567890123456", "type": "String" },
    "idempotencyKey": { "value": "reviewRespondentEvidence_1234567890123456", "type": "String" },
    "delayUntil": { "value": "2024-03-13T16:00:00", "type": "String" },
    "taskState": { "value": "unconfigured", "type": "String" },
    "workingDaysAllowed": { "value": 2, "type": "Integer" },
    "hasWarnings": { "value": false, "type": "Boolean" },
    "warningList": { "value": "[]", "type": "String" }
  },
  "correlationKeys": null,
  "all": false
}
```

<!-- DIVERGENCE: Confluence says the case type field is named "caseType", but wa-case-event-handler:src/main/java/.../handlers/InitiationCaseEventHandler.java:218 shows "caseTypeId". Source wins. -->

**Supported message names** (from `DmnAndMessageNames.java` in `wa-case-event-handler`):

| Message name | Purpose | DMN table prefix |
|--------------|---------|------------------|
| `createTaskMessage` | Triggers the Standalone Task Workflow BPMN to create a new task | `wa-task-initiation` |
| `cancelTasks` | Cancels existing BPMN processes for a case | `wa-task-cancellation` |
| `warnProcess` | Applies warning flags to running task process instances | `wa-task-cancellation` (same DMN) |

**Process variable keys for `createTaskMessage`**

The following variables are set by `wa-case-event-handler` `InitiationCaseEventHandler` when sending task creation messages:

| Variable | Type | Purpose |
|----------|------|---------|
| `taskId` | String | Camunda user task definition key (from DMN output) |
| `name` | String | Human-readable task name |
| `dueDate` | String | Task due date (ISO datetime, format `yyyy-MM-dd'T'HH:mm:ss`) |
| `jurisdiction` | String | Jurisdiction identifier |
| `caseTypeId` | String | CCD case type identifier |
| `caseId` | String | CCD case reference |
| `idempotencyKey` | String | Deduplication key for the idempotency worker |
| `delayUntil` | String | If in the future, task creation is delayed via BPMN timer (ISO datetime) |
| `taskState` | String | Always `"unconfigured"` at initiation |
| `workingDaysAllowed` | Integer | Working days allowed from DMN output |
| `hasWarnings` | Boolean | Initially `false` |
| `warningList` | String | JSON array of warnings (initially `"[]"`) |
| `taskCategory` | String | Task category from DMN (optional, only if present in DMN output) |
| `__processCategory__<cat>` | Boolean | One variable per process category for filtering (e.g. `__processCategory__caseProgression`) |

<!-- DIVERGENCE: Confluence says the field is named "taskType", but wa-case-event-handler:src/main/java/.../handlers/InitiationCaseEventHandler.java:223 shows "taskId". Source wins. -->

**Additional variables for Review Specific Access Request tasks**

The workflow API also supports creating Review Specific Access Request tasks with these `taskType` values:
- `reviewSpecificAccessRequestJudiciary`
- `reviewSpecificAccessRequestLegalOps`
- `reviewSpecificAccessRequestAdmin`

All three appear in the template's configuration, permissions and completion tables (`wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn:159,373`, `wa-task-configuration-template:src/main/resources/wa-task-permissions-wa-wacasetype.dmn:206`, `wa-task-configuration-template:src/main/resources/wa-task-completion-wa-wacasetype.dmn:215,223`).

They require an additional process variable `roleAssignmentId` (String) holding the role assignment being reviewed. It is a first-class Camunda variable (`wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/domain/camunda/CamundaVariableDefinition.java:56`), and the configuration DMN copies it into `additionalProperties_roleAssignmentId` with a FEEL expression that reads `taskAttributes.roleAssignmentId` first and `taskAttributes.additionalProperties.roleAssignmentId` second (`wa-task-configuration-template:src/main/resources/wa-task-configuration-wa-wacasetype.dmn:373-380`) — the two-branch form is what makes the same rule work on both initiation and reconfiguration.

Due date and delay for these task types come from the service's own DMN, not from the platform. Where a service configures no due-date attributes at all, `DUE_DATE` falls back to `DEFAULT_ZONED_DATE_TIME` — `LocalDateTime.now().plusDays(2).withHour(16).withMinute(0).withSecond(0)` (`wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/calendar/DateCalculator.java:68`, `wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/calendar/DateType.java:11`). That is two **calendar** days, and because the constant is a static interface field it is evaluated once when the class initialises — the fallback is two days after the pod started, not two days after the task was created.

---

### Testing Endpoint (non-production)

| Property | Value |
|----------|-------|
| **Method** | `GET` |
<!-- REVIEW: Actual path template is `/workflow/idempotency/{idempotency_key}/{jurisdiction}` (see WorkflowApiTestingController.java:44), not `{key}`. -->
| **Path** | `/workflow/idempotency/{key}/{jurisdiction}` |
| **Auth** | S2S token |
| **Availability** | All environments except `prod` |
| **Purpose** | Check idempotency DB state for a given key |

---

## Error Responses

All endpoints return `application/problem+json` responses on error (via `FeignApplicationProblemControllerAdvice`). The full set of HTTP status codes:

| Code | Description |
|------|-------------|
| `200` | Success (DMN evaluation) |
| `204` | No content — message correlated successfully |
| `400` | Bad request — invalid message body |
| `401` | Unauthorised — S2S token invalid or missing |
| `403` | Forbidden — service not in the authorised whitelist |
| `404` | Not found — DMN key does not exist or no matching process |
| `415` | Unsupported media type — request must be `application/json` |
| `500` | Internal server error — Camunda returned an error |
| `502` | Bad gateway — downstream (Camunda) returned an invalid response |
| `503` | Service unavailable — critical dependency down (may be transient) |

**Known pitfall: null correlationKeys entries**

Including `null` values inside the `correlationKeys` map causes Camunda to return a `500` error with an unhelpful message. Always **omit** keys entirely rather than setting them to `null`:

```json
// WRONG - causes 500
{
  "messageName": "warnProcess",
  "correlationKeys": {
    "caseId": { "value": "123", "type": "String" },
    "taskCategory": null
  }
}

// CORRECT - omit the key
{
  "messageName": "warnProcess",
  "correlationKeys": {
    "caseId": { "value": "123", "type": "String" }
  }
}
```

---

## External Task Workers

The service subscribes to two Camunda external task topics on `ApplicationReadyEvent` (`ExternalTaskWorker.java:53,67`). Workers are disabled in functional test profile (`@Profile("!functional")`).

| Topic | Handler | Purpose |
|-------|---------|---------|
| `idempotencyCheck` | `IdempotencyTaskWorkerHandler` | Deduplicates task creation by checking `idempotent_keys` table |
| `wa-warning-topic` | `WarningTaskWorkerHandler` | Merges warnings into process variables and propagates to delayed instances |

**Worker configuration**

| Setting | Value |
|---------|-------|
| Lock duration | 30 seconds |
| Async response timeout | 1 second |
| Backoff (initial / multiplier / cap) | 2s / 2x / 8s |
| Max retries on error | 3 (incident raised on 4th failure) |

**Idempotency check logic** (`IdempotencyTaskWorkerHandler`):

1. Reads `idempotencyKey` and `jurisdiction` from external task variables.
2. If either is blank, sets `isDuplicate=false` and completes (supports non-WA services sharing the BPMN).
3. Looks up `(idempotencyKey, jurisdiction)` in `idempotent_keys` table.
4. Not found: inserts row, sets `isDuplicate=false`.
5. Found with same `processId`: sets `isDuplicate=false`.
6. Found with different `processId`: sets `isDuplicate=true`.

**Database schema** (`wa_workflow_api` PostgreSQL, Flyway V1.0.2):

| Column | Type | Notes |
|--------|------|-------|
| `idempotency_key` | PK | Part of composite primary key |
| `tenant_id` | PK | Jurisdiction; part of composite primary key |
| `process_id` | | Camunda process instance ID |
| `created_at` | | Insertion timestamp |
| `last_updated_at` | | Last update timestamp |

---

## Authentication

| Direction | Mechanism | Details |
|-----------|-----------|---------|
| Inbound | S2S (`ServiceAuthFilter`) | Validates caller's S2S token; no user JWT validation |
| Outbound (Camunda) | S2S (`AuthTokenGenerator`) | Generated per-request; sent as `ServiceAuthorization` header |
| External task workers | S2S (`ServiceAuthProviderInterceptor`) | Injected into both `ExternalTaskClient` instances |

**Authorised S2S callers** (configured via `idam.s2s-authorised.services`):

`wa_workflow_api`, `wa_case_event_handler`, `camunda-bpm`, `xui_webapp`, `wa_task_management_api`

---

## Feign Client Configuration

The `CamundaClient` Feign interface targets `${camunda.url}` (default `http://camunda-bpm/engine-rest`). Serialisation uses a custom `ObjectMapper` with `LOWER_CAMEL_CASE` property naming strategy and Java time modules (`CamundaFeignConfiguration.java:28-30`).

| Feign method | Camunda REST path | Usage |
|--------------|-------------------|-------|
| `evaluateDmn` | `POST /decision-definition/key/{key}/tenant-id/{tenantId}/evaluate` | DMN table evaluation |
| `sendMessage` | `POST /message` | BPMN message correlation |

Feign HTTP errors are mapped to `application/problem+json` responses via `FeignApplicationProblemControllerAdvice`.

---

## Pact Contracts

| Provider name | Covers |
|---------------|--------|
| `wa_workflow_api_evaluate_dmn` | DMN evaluation endpoint |
| `wa_workflow_api_send_message` | Message correlation endpoint |

---

## BPMN and DMN Deployment Model

The workflow API itself does not deploy BPMN/DMN artefacts. These are deployed independently via Jenkins pipelines from their own repositories:

| Artefact type | Repository | Deployment |
|---------------|-----------|------------|
| BPMN (Standalone Task Workflow) | `hmcts/wa-standalone-task-bpmn` | Own Jenkins pipeline (`withCamundaOnlyPipeline`), master synced to the `demo`, `perftest` and `ithc` branches |
| DMN (platform template) | `hmcts/wa-task-configuration-template` | Same pipeline shape, master synced to `demo` and `perftest` |
| DMN (per service team) | e.g. `hmcts/ia-task-configuration` | Service team's own pipeline; Continuous Deployment to AAT then Production |

Both platform repos use `withCamundaOnlyPipeline(type, product, component, s2sServiceName, tenantId)` with `s2sServiceName = "wa_camunda_pipeline_upload"`, and call `syncBranchesWithMaster` to push master onto the per-environment branches (`wa-standalone-task-bpmn:Jenkinsfile_CNP`, `wa-task-configuration-template:Jenkinsfile_CNP`). The tenant argument differs: `wa-standalone-task-bpmn` passes `tenantId = null`, `wa-task-configuration-template` passes `tenantId = "wa"`. DMN evaluation is tenant-scoped (`/workflow/decision-definition/key/{key}/tenant-id/{tenant-id}/evaluate`), message correlation is not.

**Deployment considerations**:

- Deployment is unconditional and whole-repo. `camunda-deployment.sh` takes an S2S token, loops over every `*.bpmn` and `*.dmn` under `src/main/resources`, and POSTs each file to `${CAMUNDA_URL}/deployment/create` as multipart form data (`wa-standalone-task-bpmn:camunda-deployment.sh`, `wa-task-configuration-template:camunda-deployment.sh`). There is no per-table gate, no environment condition and no rollback step, and files that did not change are re-uploaded with the rest.
- Camunda registers a new version of each deployed definition; process instances already running continue on the version they started with, so a BPMN change only affects processes started after it lands.
- The contract between a BPMN and calling code is the message name (e.g. `createTaskMessage`) and the set of expected process variables. Breaking changes to message names or required variables must be coordinated across the case-event-handler and the BPMN.

---

## Examples

### CamundaClient Feign interface

The Feign client used internally by `wa-workflow-api` to call the Camunda REST engine. All public WA Workflow API calls are proxied through this interface:

```java
// Source: apps/wa/wa-workflow-api/src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/service/CamundaClient.java
@FeignClient(name = "camunda", url = "${camunda.url}", configuration = CamundaFeignConfiguration.class)
public interface CamundaClient {

    // Correlate a BPMN message (createTaskMessage / cancelTasks / warnProcess)
    @PostMapping(value = "/message",
                 consumes = MediaType.APPLICATION_JSON_VALUE,
                 produces = MediaType.APPLICATION_JSON_VALUE)
    void sendMessage(@RequestHeader("ServiceAuthorization") String serviceAuthorisation,
                     SendMessageRequest sendMessageRequest);

    // Evaluate a DMN decision table by key and tenant
    @PostMapping(value = "/decision-definition/key/{key}/tenant-id/{tenant-id}/evaluate",
                 consumes = MediaType.APPLICATION_JSON_VALUE,
                 produces = MediaType.APPLICATION_JSON_VALUE)
    List<Map<String, DmnValue<?>>> evaluateDmn(
        @RequestHeader("ServiceAuthorization") String serviceAuthorisation,
        @PathVariable("key") String key,
        @PathVariable("tenant-id") String tenantId,
        EvaluateDmnRequest evaluateDmnRequest
    );
}
```

### SendMessageRequest structure

```java
// Source: apps/wa/wa-workflow-api/src/main/java/uk/gov/hmcts/reform/waworkflowapi/clients/model/SendMessageRequest.java
public class SendMessageRequest {
    private final String messageName;                      // "createTaskMessage", "cancelTasks", or "warnProcess"
    private final Map<String, DmnValue<?>> processVariables; // task variables for new process or update
    private final Map<String, DmnValue<?>> correlationKeys;  // null = start new process; non-null = correlate to existing
    private final boolean all;                             // true = correlate to ALL matching instances
}
```

## See also

- [BPMN Workflows](../explanation/bpmn-workflows.md) — the Camunda process that receives `createTaskMessage`, `cancelTasks`, and `warnProcess` messages from this API
- [DMN Task Configuration](../explanation/dmn-task-configuration.md) — explanation of the DMN tables this API evaluates; naming convention and tenant ID
- [Case Event Handler](../explanation/case-event-handler.md) — the primary caller of both endpoints, including how DMN results are mapped to BPMN messages
- [Architecture](../explanation/architecture.md) — service topology and S2S authorisation model
