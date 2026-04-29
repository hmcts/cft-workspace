---
topic: audit
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/CaseAuditEventEntity.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/CaseAuditEventRepository.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getevents/LocalAuditEventLoader.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/getevents/AuditEventLoader.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/CreateCaseEventService.java
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# Audit and History

## TL;DR

- Every submitted event writes an immutable row to the `case_event` table containing a full snapshot of case data at that moment.
- The history endpoint is `GET /cases/{caseId}/events` — it returns events newest-first but omits the `data` snapshot for performance.
- To retrieve the full case-data snapshot for a single event, fetch it individually; the list query excludes `data` and `dataClassification`.
- Each audit row records `userId`, `eventId`, `stateId`, `caseTypeVersion`, and optionally a `SignificantItem` (document or URL flagged as notable by the event).
- `caseTypeVersion` is the integer definition-store version at event time — useful for reasoning about schema changes across history.
- For decentralised case types, history is fetched from the remote service via `GET /ccd-persistence/cases/{case-ref}/history`.

## What is stored

Every call to `CreateCaseEventService.createCaseEvent()` persists a new `CaseAuditEventEntity` row inside the same `@Transactional` boundary as the case save (`CaseAuditEventRepository.java:40`). The row is immutable after insert.

Columns on the `case_event` table (`CaseAuditEventEntity.java:83-129`):

| Column | Description |
|---|---|
| `userId` | IDAM user ID of the submitter |
| `eventId` | Event definition ID (e.g. `CREATE`, `SUBMIT_APPEAL`) |
| `eventName` | Human-readable display name |
| `summary` / `description` | Free-text entered by the caseworker |
| `caseDataId` | FK to `case_data` |
| `createdDate` | Timestamp of event submission |
| `stateId` / `stateName` | Case state after the event |
| `caseTypeId` / `caseTypeVersion` | Case-type ID and integer definition version |
| `securityClassification` | Classification at event time |
| `data` | Full JSONB snapshot of all case fields |
| `dataClassification` | Field-level classifications at event time |
| `proxiedBy` / `proxiedByLastName` / `proxiedByFirstName` | Set when a solicitor acted on behalf of another user (`CaseAuditEventEntity.java:119-126`) |

The `data` column makes each row a standalone version record — there is no delta encoding.

## Endpoints

### List events

```
GET /cases/{caseId}/events
```

Returns `CaseEventsResource` (array of `AuditEvent`). Events are ordered newest-first by the named query `CaseAuditEventEntity_FIND_BY_CASE` (`CaseAuditEventEntity.java:30-33`). The `data` and `dataClassification` columns are **excluded** from this query for performance.

Access is gated by `@Qualifier("authorised") GetEventsOperation` (`CaseController.java:87`).

### Single event

Fetching a specific event by its sequence identifier returns the full snapshot including `data`. The list endpoint is therefore suitable for "what happened and when" but the single-event fetch is needed for "what did the case look like after event X".

## How XUI uses it

The Case History tab in XUI calls `GET /cases/{caseId}/events` to render the event timeline. Each row shows the event name, date, user, state, and the caseworker-supplied summary. XUI does not display the raw `data` snapshot inline; it renders a field-diff view by fetching individual event snapshots when the user drills in.

## Significant items

An event can flag one document or URL as a `SignificantItem`. This is stored via a `@OneToOne` linked `SignificantItemEntity` on the audit row (`CaseAuditEventEntity.java:128-129`). XUI surfaces significant items as prominent links in the history view.

## Decentralised case types

For case types routed to an external persistence service, `DecentralisedAuditEventLoader` delegates to:

- `GET /ccd-persistence/cases/{case-ref}/history` — full event list
- `GET /ccd-persistence/cases/{case-ref}/history/{event-id}` — single event

`ServicePersistenceClient` validates the returned case reference and case type before returning the `AuditEvent` (`ServicePersistenceClient:112-123`). The external service is responsible for storing and returning the same fields as the local `case_event` table.

## Gotchas

- The list endpoint never returns `data`; only the single-event fetch does. Callers that need a point-in-time snapshot must use the individual fetch.
- `caseTypeVersion` is an integer, not a semantic version string. It increments each time the definition is imported into definition-store.
- Proxied-by fields are populated only when acting-as flows are used; they are null in normal submissions.

## See also

- [`explanation/event-lifecycle.md`](event-lifecycle.md) — how events are validated and persisted before the audit row is written
- [`explanation/decentralised-ccd.md`](decentralised-ccd.md) — remote persistence and why history fetches differ for decentralised case types
