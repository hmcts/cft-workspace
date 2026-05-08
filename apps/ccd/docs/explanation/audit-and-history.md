---
topic: audit
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/CaseAuditEventEntity.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/CaseAuditEventRepository.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getevents/LocalAuditEventLoader.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getevents/AuditEventLoader.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/internal/controller/UICaseController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/CreateCaseEventService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/SignificantItemEntity.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/callbacks/SignificantItemType.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/message/CaseEventMessageService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/message/MessageQueueCandidateEntity.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/aggregated/AbstractDefaultGetCaseViewOperation.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/model/definition/FieldTypeDefinition.java
  - ccd-data-store-api:src/main/resources/db/migration/V0001__Base_version.sql
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceAPI.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/client/ServicePersistenceClient.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/service/DecentralisedAuditEventLoader.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "980418584"
    title: 'Make your own "History" Tab'
    space: RCCD
  - id: "240288169"
    title: Audit Strategy
    space: RTA
  - id: "1252000857"
    title: Log and Audit
    space: RCCD
  - id: "1246038130"
    title: "[How To] Change the state of a case in ccd_data_store"
    space: RD
  - id: "1460562062"
    title: CCD Asynchronous Messaging LLD (WIP)
    space: RCCD
---

# Audit and History

## TL;DR

- Every submitted event writes an immutable row to the `case_event` table containing a full snapshot of case data at that moment.
- CCD is the designated master for **business audit** of case-related data across Reform — service teams should consume case history from CCD rather than building their own.
- The history list endpoint `GET /cases/{caseId}/events` returns events newest-first but omits `data` and `dataClassification` for performance; fetch a single event to get the snapshot.
- Each row records `userId`, `eventId`, `stateId`, `caseTypeVersion`, classifications, and optionally a `SignificantItem` (a flagged document linked to the event).
- XUI renders history through a `CaseHistoryViewer` top-level field type that the data store hydrates with the event list when the case view is built.
- For events with `Publish = Y`, a row is also written to `message_queue_candidates` inside the same transaction; if either insert fails, both roll back and Azure Service Bus is not notified.
- For decentralised case types, history is fetched from the remote service via `GET /ccd-persistence/cases/{case-ref}/history`.

## What is stored

Every call to `CreateCaseEventService.createCaseEvent()` runs inside a `@Transactional(propagation = REQUIRES_NEW)` boundary (`CreateCaseEventService.java:194`) that persists the new `case_event` row alongside the case-data update. The audit row is created in `saveAuditEventForCaseDetails()` (`CreateCaseEventService.java:558-593`) by calling `caseAuditEventRepository.set(auditEvent)`, which `em.persist`es a new `CaseAuditEventEntity` (`CaseAuditEventRepository.java:38-42`). After the audit row is set, the same transaction calls `messageService.handleMessage(...)` which may also insert a `message_queue_candidates` row — see [Outbound messaging](#outbound-messaging).

Rows are immutable after insert; the entity has no `update` method and no migration ever changes existing rows.

### Columns on the `case_event` table

The DDL is in `V0001__Base_version.sql:101-122`; the entity at `CaseAuditEventEntity.java:76-129` maps them:

| Column | Description |
|---|---|
| `id` | Primary key, allocated from `case_event_id_seq` |
| `user_id` | IDAM user ID of the submitter |
| `user_first_name` / `user_last_name` | Submitter's name at event time |
| `event_id` | Event definition ID (e.g. `CREATE`, `SUBMIT_APPEAL`); 70-char limit |
| `event_name` | Human-readable display name; 30-char limit |
| `summary` | Free-text summary entered by the caseworker (1024 chars) |
| `description` | Free-text description (65,536 chars) |
| `case_data_id` | FK to `case_data.id` |
| `created_date` | Timestamp of event submission, `now()` default |
| `state_id` / `state_name` | Case state after the event |
| `case_type_id` / `case_type_version` | Case-type ID and integer definition version |
| `security_classification` | Classification at event time |
| `data` | Full JSONB snapshot of all case fields (NOT NULL) |
| `data_classification` | Field-level classifications at event time (JSONB) |
| `proxied_by` / `proxied_by_first_name` / `proxied_by_last_name` | Set when a solicitor acted on behalf of another user (`CaseAuditEventEntity.java:119-126`) |

The `data` column makes each row a standalone version record — there is no delta encoding. Confluence's "Log and Audit" page (id 1252000857) confirms this is intentional: "we should just log the field that has changed and not the whole case data" was discussed but **not** implemented; consumers needing a per-field diff must compute it themselves by comparing successive event snapshots.

## Endpoints

### List events (external API)

```
GET /cases/{caseId}/events
```

Returns `CaseEventsResource` (an array of `AuditEvent`). Defined at `CaseController.java:325-364`. Events are ordered newest-first by the named query `CaseAuditEventEntity_FIND_BY_CASE` (`CaseAuditEventEntity.java:30-33`). The `data` and `dataClassification` columns are **excluded** from this query (`FIND_BY_CASE_DATA_ID_HQL_EXCLUDE_DATA`, `CaseAuditEventEntity.java:52-61`).

Access is gated by `@Qualifier("authorised") GetEventsOperation`.

The legacy v1 endpoint is also available at `/caseworkers/{uid}/jurisdictions/{jid}/case-types/{ctid}/cases/{cid}/events` (`EventsEndpoint.java:33`).

### Single event view (internal API used by XUI)

```
GET /internal/cases/{caseId}/events/{eventId}
```

Defined at `UICaseController.java:95-130`. Returns a `CaseHistoryViewResource` containing the full case-data snapshot at the time of that event, plus the case-type definition needed to render it. `@LogAudit(operationType = VIEW_CASE_HISTORY, ...)` records the lookup in the audit log. The list endpoint is therefore suitable for "what happened and when"; the single-event fetch is needed for "what did the case look like after event X".

## How XUI uses it: the `CaseHistoryViewer` field type

XUI doesn't render history with a hardcoded panel — it renders a top-level `CaseField` of type `CaseHistoryViewer` (`FieldTypeDefinition.java:30`, constant `CASE_HISTORY_VIEWER = "CaseHistoryViewer"`). The data store's case-view operation detects this field type and hydrates it with the audit-event list before returning the case view (`AbstractDefaultGetCaseViewOperation.java:109-118`):

```java
if (caseFieldDefinition.getFieldTypeDefinition().getType().equals(CASE_HISTORY_VIEWER)) {
    JsonNode eventsNode = objectMapperService.convertObjectToJsonNode(events);
    caseDetails.getData().put(caseFieldDefinition.getId(), eventsNode);
    return;
}
```

Service teams configure the History tab by adding a top-level field of type `CaseHistoryViewer` to their case type, then placing that field on a tab labelled "History". This is the mechanism documented in Confluence "Make your own 'History' Tab" (id 980418584). Notable constraints from that page (not enforced in source, so verify before relying on them):

- The CaseTab cannot have ID `History` or `data` — these conflict with internal structures. <!-- CONFLUENCE-ONLY: not verified in source -->
- The field's `Label` and `HintText` are required by the schema but never displayed (the viewer renders its own labels).
- `FieldTypeParameter` and `RegularExpression` are not applicable to `CaseHistoryViewer` fields. <!-- CONFLUENCE-ONLY: not verified in source -->
- Only the **R** of CRUD is functional. Read access controls visibility; create/update/delete are no-ops. <!-- CONFLUENCE-ONLY: not verified in source -->
- Show/hide conditions can be applied to dynamically toggle the History view per role or state.

The `ccd-config-generator` SDK (`CaseFieldGenerator.java:46`) generates a `CaseHistoryViewer` field automatically when service teams use the standard `History` tab pattern.

## Significant items

An event can flag one document as a `SignificantItem`. The value comes from the about-to-submit callback's response (`CreateCaseEventService.java:583`, `aboutToSubmitCallbackResponse.getSignificantItem()`) and is persisted via a `@OneToOne` linked `SignificantItemEntity` on the audit row (`CaseAuditEventEntity.java:128-129`).

The `case_event_significant_items` table has columns `id`, `type`, `description`, `url`, and `case_event_id`. The `SignificantItemType` enum currently only has one value: `DOCUMENT` (`SignificantItemType.java`).

<!-- DIVERGENCE: an earlier draft of this page described the SignificantItem as "a document or URL"; the source enum has only DOCUMENT today, even though the column is called `url`. Source wins — there is currently no URL-only significant-item type, only documents whose location is stored in the `url` column. -->

XUI surfaces significant items as prominent links in the history view.

## Outbound messaging: events on the bus

When an event is saved, the same transaction may also enqueue an outbound message to Azure Service Bus. `CaseEventMessageService.handleMessage()` (`CaseEventMessageService.java:38-50`) checks whether the `CaseEventDefinition.publish` flag is `true` and, if so, builds a `MessageQueueCandidate` and saves it to `message_queue_candidates` (`MessageQueueCandidateEntity.java`).

Key properties:

- The default for the `Publish` flag on a `CaseEvent` definition is `Y` (publish), so most events go on the bus unless explicitly opted out.
- The insert into `message_queue_candidates` happens inside the same transaction as the `case_event` insert. **If either fails, both roll back** — events on the bus and rows in the audit table never diverge.
- The published payload includes `JurisdictionId`, `CaseTypeId`, `CaseId`, `EventInstanceId` (= `case_event.id`), `EventTimestamp` (= `case_event.created_date`), `EventId`, `PreviousStateId`, `NewStateId`, `UserId`, and an `AdditionalData` JSON object.
- `AdditionalData` includes only the fields explicitly marked `Publish=Y` in `CaseEventToFields` or `EventToComplexTypes`. A `PublishAs` alias can rename a field in the published payload.

A separate publisher process picks rows out of `message_queue_candidates` and writes them to the configured Service Bus topic, then sets the `published` timestamp on the row. <!-- CONFLUENCE-ONLY: the publisher loop and topic name `ccd-case-events-<env>` are documented in the Asynchronous Messaging LLD (id 1460562062); the publisher implementation lives outside the audit/event flow and was not re-verified here. -->

This is why the audit table and the message queue can be reasoned about as a single atomic unit, even though downstream consumers see eventual delivery.

## Decentralised case types

For case types routed to an external persistence service, `DecentralisedAuditEventLoader` (`DecentralisedAuditEventLoader.java:19-27`) delegates to the remote service via `ServicePersistenceClient`:

- `GET /ccd-persistence/cases/{case-ref}/history` — full event list (`ServicePersistenceAPI.java:63`)
- `GET /ccd-persistence/cases/{case-ref}/history/{event-id}` — single event (`ServicePersistenceAPI.java:66`)

`ServicePersistenceClient.getCaseHistory()` and `getCaseHistoryEvent()` validate the returned case reference and case type before returning the `AuditEvent` (`ServicePersistenceClient.java:112-124`). The external service is responsible for storing and returning the same fields as the local `case_event` table.

## What CCD does *not* audit

Confluence "Log and Audit" (id 1252000857) describes audit gaps that aren't visible in the `case_event` table:

| Audit object | Where it lives | Limitation |
| --- | --- | --- |
| Case viewed | Activity service (separate component) | Stored 2-3 days only; misses programmatic reads. Not fit for forensic audit. |
| Search activity | Application Insights logs | Captures the API caller but not the search query or results; retained ~2 months. |
| Case access (grant/revoke) | `case_users_audit` table in CCD data store | Captured separately from `case_event`. |
| Case role assignment changes | `case_users_audit` table | Captured separately from `case_event`. |

So "the CCD audit trail" in the strict sense (`case_event`) covers **case data and state changes only**. Access-control changes are audited in a sibling table; UI views and searches are not durably audited at all.

## Strategic context

CCD is the designated **master for business audit of case-related data** across Reform (Audit Strategy, id 240288169). Service teams should consume case history from CCD's audit endpoints rather than maintaining parallel audit stores in their own backends. The strategy specifies that audit trails must be tamper-evident and have an explicit retention period — though in practice, retention on `case_event` is governed by the case-disposer job rather than per-row TTLs.

## Gotchas

- The list endpoint never returns `data`; only the single-event fetch does. Callers that need a point-in-time snapshot must use the individual fetch.
- `caseTypeVersion` is an integer, not a semantic version string. It increments each time the definition is imported into definition-store.
- Proxied-by fields are populated only when acting-as flows are used; they are null in normal submissions.
- There is no per-field diff in the audit row — the `data` column is a full snapshot. To answer "which field changed?", compare snapshots of consecutive events.
- Manual state corrections in production (the runbook at Confluence id 1246038130) require inserting both a `case_data` update **and** a matching `case_event` row, plus updates to `case_users_audit` and `case_users` if access changed. Skipping the `case_event` insert breaks the case history visibly.
- Events with `Publish=N` skip the outbound message but still write a `case_event` row — the audit trail is complete regardless of messaging configuration.
- `CaseHistoryViewer` is a top-level field type only; you cannot embed it inside a Complex type or Collection.

## See also

- [`explanation/event-lifecycle.md`](event-lifecycle.md) — how events are validated and persisted before the audit row is written
- [`explanation/decentralised-ccd.md`](decentralised-ccd.md) — remote persistence and why history fetches differ for decentralised case types
