---
title: API-first task management (sdk/task-management)
topic: work-allocation
status: in-progress
owner: ed14537
since: 2026-09-22
last_updated: 2026-09-22
integrate_now: false
promote_to:
  product: ccd
  diataxis: explanation
tracking: https://tools.hmcts.net/confluence/spaces/TMDPC/pages/1933863479/Task+Management+PoC+Technical+Changes
audience: service-team
sources:
  - ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskManagementFeignClient.java
  - ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskOutboxService.java
  - ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskOutboxPoller.java
  - ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/TaskManagementProperties.java
  - ccd-config-generator:sdk/task-management/src/main/java/uk/gov/hmcts/ccd/sdk/taskmanagement/model/TaskPayload.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/resources/dataruntime-db/migration/V0016__task_outbox.sql
---
# API-first task management (sdk/task-management)

> **Work in progress.** Owned by the DTSSE / Decentralisation team.
> Status `in-progress`: the service-side contract is settled and has been regression tested with a
> full integration on sptribs, but the server half in `wa-task-management-api` is not merged.
> `integrate_now` is `false` until it is. Talk to the owner before building against it.

## What this is

A way for a decentralised CCD service to create, complete, cancel and reconfigure Work
Allocation tasks **directly from its own event handlers**, over HTTP, instead of the current
route of publishing a CCD case event to Service Bus and letting `wa-case-event-handler` evaluate
DMN tables in Camunda. The service decides in Java which tasks an event produces; the SDK
guarantees delivery.

Two halves, in two repos:

| Half | Where | State |
|---|---|---|
| Client: `sdk/task-management` module | `hmcts/dtsse-ccd-config-generator` | On `master` and published under `com.github.hmcts:task-management`. In-order and blocking-completion changes on branch `task_mgmt_in_order` ([PR #916](https://github.com/hmcts/dtsse-ccd-config-generator/pull/916)). |
| Server: API-first `/tasks` endpoints | `hmcts/wa-task-management-api` | Branch `decentralisation-poc` ([PR #1598](https://github.com/hmcts/wa-task-management-api/pull/1598), marked do-not-merge, builds an ACR image only). |
| Reference integration | `hmcts/sptribs-case-api` | Branch `task_mgmt_api` ([PR #2467](https://github.com/hmcts/sptribs-case-api/pull/2467)). Replaces every WA DMN with Java event handlers. |

The server half is the blocker. `wa-task-management-api` is owned by a centralised team and the
change is going through Technical Architecture Board (TAB) approval. Productionisation is
expected within the next few months once that approval lands.

The core docs already describe the module's mechanics in
[Work Allocation Integration](../../../ccd/docs/explanation/work-allocation-integration.md#sdktask-management-module-ccd-config-generator).
Read that page as "what the client does"; this page is "what is and isn't live, and how sptribs
uses it".

## Current state

**Client (`sdk/task-management`, on `master`).** An auto-configured Spring module providing:

- A Feign client for four endpoints on `${task-management.api.url}`: `POST /tasks`,
  `POST /tasks/terminate`, `PUT /tasks/reconfigure`, `GET /tasks?case_id=&task_types=`.
  S2S auth is wired automatically when `idam.s2s-auth.secret` and `idam.s2s-auth.microservice`
  are set.
- A transactional outbox: `TaskOutboxService` writes the requested action into
  `ccd.task_outbox` in the service's own decentralised-runtime database (migration
  `V0016__task_outbox.sql`, with a `task_outbox_history` audit table), and `TaskOutboxPoller`
  drains it on a fixed delay with exponential-backoff retry. The table is keyed to
  `ccd.case_data(reference)` so a task request commits or rolls back with the case event.
- `DelayUntilResolver` for deferred task creation (interval or date strategies, working-day and
  bank-holiday aware).

**Client changes not yet on `master`** (`task_mgmt_in_order`, PR #916; the build sptribs pins is
`task-mgmt-multi-create-20260617`):

- `TaskCreateRequest` carries a **list** of `TaskPayload`s, so one event can create several tasks
  in a single call.
- Every enqueue takes a `TaskOutboxTrigger` (`caseId`, `caseType`, `eventId`, `created`) and the
  outbox drains **in order per case**.
- Completion and cancellation are **blocking and synchronous**, so the task is gone before the
  event that closed it returns.

**Server (`wa-task-management-api`, `decentralisation-poc`).** Adds `ApiFirstTaskController`
with the four endpoints above, all authenticated by `ServiceAuthorization` only (no user token).
Access is allow-listed in `application.yaml`: a calling service is named in
`config.exclusiveAccessClients` and mapped to the case types it may touch under
`config.serviceCaseTypeAccess` (today `nfdiv_case_api` → `NFD`, `sptribs_case_api` →
`CriminalInjuriesCompensation`). Idempotency comes from a new `external_task_id` column on
`cft_task_db.tasks` with a unique index on `(external_task_id, case_type_id)`. A rollback script
ships alongside the migration.

**Environments.** The sptribs integration has been regression tested end to end in lower
environments against a `wa-task-management-api` image built from the branch. Nothing is in
production.

## How a service team would integrate

This is the shape sptribs uses on `task_mgmt_api`. Expect the dependency version and the
allow-list step to change; the Java surface is stable.

1. **Depend on the module** and the matching SDK plugin build:
   ```groovy
   id 'hmcts.ccd.sdk' version '<sdk-version>'
   implementation 'com.github.hmcts:task-management:<sdk-version>'
   ```
   The decentralised runtime's Flyway migrations create `ccd.task_outbox` for you.

2. **Point it at WA** and let auto-configuration do the rest:
   ```yaml
   task-management:
     api:
       url: ${TASK_MANAGEMENT_API_URL}   # http://wa-task-management-api-<env>.service.core-compute-<env>.internal
   ```

3. **Get your service allow-listed** in `wa-task-management-api`: your S2S microservice name in
   `config.exclusiveAccessClients`, and your case type(s) under `config.serviceCaseTypeAccess`.
   This is a change to the WA repo and, for now, needs the DTSSE team to broker it.

4. **Decide tasks in code.** Replace the initiation / completion / cancellation DMNs with a
   resolver that maps `(event, state, case data)` to a list of task types, and a thin service
   that builds `TaskPayload`s and calls `TaskOutboxService` from the event's submitted callback:
   ```java
   taskOutboxService.enqueueTaskCreateRequest(
       TaskOutboxTrigger.create(caseId, caseType, eventId),
       new TaskCreateRequest(payloads));            // several tasks, one call

   taskOutboxService.enqueueTaskCompleteRequest(trigger,
       new TerminateTaskOutboxPayload(caseId, caseType, taskTypeNames));
   ```
   `TaskPayload` is the API-first `/tasks` shape (snake_case JSON, nulls omitted, unknown
   fields ignored). `externalTaskId` plus `caseTypeId` is the idempotency key, so generate it
   per logical task and reuse it on retry. Permissions, role category, work type, priority and
   location are all set by the service on the payload; there is no permissions DMN.

5. **Keep the WA DMN deployment for anything still event-driven.** sptribs removed all six DMN
   files; a partial migration would keep the DMNs for the events it has not moved.

## Open questions

- TAB approval for the `wa-task-management-api` change, and whether the allow-list stays in
  `application.yaml` or moves to a self-service mechanism.
- Which SDK release will carry the `task_mgmt_in_order` changes (multi-create, per-case ordering,
  blocking completion), and whether the core WA-integration page is updated in the same release.
- Whether `nfdiv` proceeds as the second integration (it is already in the server allow-list).

## Promotion criteria

- [ ] `wa-task-management-api` API-first endpoints merged to `master` and deployed to AAT
- [ ] `task_mgmt_in_order` merged and released from `dtsse-ccd-config-generator`
- [ ] sptribs `task_mgmt_api` merged
- [ ] Core page `apps/ccd/docs/explanation/work-allocation-integration.md` updated to describe the
      API-first route as an alternative to the DMN route; this page folds into it
- [x] `sources:` lists the authoritative files
