---
topic: architecture
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/StartEventController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/std/CaseSearchEndpoint.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/std/GlobalSearchEndpoint.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/ui/QueryEndpoint.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/CallbackService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/supplementarydata/AuthorisedSupplementaryDataUpdateOperation.java
  - ccd-data-store-api:src/main/resources/application.properties
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# API: Data Store

## TL;DR

- The CCD Data Store API (`ccd-data-store-api`) is the single service for creating, updating, retrieving, and searching case data.
- Every mutation flows through a two-step protocol: **start event** (gets a token + fires `about_to_start`) then **submit event** (validates token, fires `about_to_submit`, persists, fires `submitted`).
- The modern external surface lives under `/cases/` and `/case-types/` (v2); legacy caseworker/citizen paths under `/caseworkers/` and `/citizens/` are still active.
- Search is either Elasticsearch (`POST /searchCases`) or, for cross-jurisdiction queries, `POST /globalSearch`.
- Full OpenAPI spec is served at `/v2/api-docs` on a running instance and published to the HMCTS API catalogue.

## Endpoints

### Event lifecycle (v2 external)

| Method | Path | Controller method | Purpose |
|--------|------|-------------------|---------|
| `GET` | `/cases/{caseId}/event-triggers/{eventId}` | `StartEventController.getStartEventTrigger` | Start event for existing case; fires `about_to_start`; returns event token |
| `GET` | `/case-types/{caseTypeId}/event-triggers/{triggerId}` | `StartEventController.getStartCaseEvent` | Start event for new case creation |
| `POST` | `/cases/{caseId}/events` | `CaseController.createEvent` | Submit event on existing case |
| `POST` | `/case-types/{caseTypeId}/cases` | `CaseController.createCase` | Create new case |

The token returned by the start-event call must be included as `CaseDataContent.token` in the submit body. `CreateCaseEventService` validates it at `CreateCaseEventService.java:210-216`; a stale or mismatched token is rejected with HTTP 409.

### Case retrieval (v2 external)

| Method | Path | Controller method | Purpose |
|--------|------|-------------------|---------|
| `GET` | `/cases/{caseId}` | `CaseController.getCase` | Retrieve case by 16-digit reference |
| `GET` | `/cases/{caseId}/events` | `CaseController.getCaseEvents` | Audit event list (excludes `data` snapshot for performance) |

Note: the event list endpoint omits `data`/`dataClassification` columns; only a single-event fetch returns the full data snapshot (`CaseAuditEventEntity.java:52-64`).

### Supplementary data (v2 external)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/cases/{caseId}/supplementary-data` | Atomic `$set` or `$inc` operations on the `supplementary_data` JSONB column |

Request body keys use operation prefixes: `$set` overwrites a path, `$inc` atomically increments a numeric path. This endpoint is S2S-gated — only service accounts should call it (`AuthorisedSupplementaryDataUpdateOperation.java:18-32`). Supplementary data is **not** returned in regular case GET responses.

### Document metadata (v2 external)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/cases/{caseId}/documents/{documentId}` | Retrieve document metadata; proxies to CDAM |

### Search

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/searchCases?ctid=<caseTypeId>` | Elasticsearch; body is native ES JSON. Use `ctid=*` to search all accessible case types (`CaseSearchEndpoint.java:101-106`). |
| `POST` | `/globalSearch` | Cross-jurisdiction ES search using structured `GlobalSearchRequestPayload`. |
| `GET` | `/caseworkers/{uid}/jurisdictions/{jid}/case-types/{ctid}/cases` | Legacy DB-backed workbasket search (`QueryEndpoint.java:156`). |
| `GET` | `/caseworkers/{uid}/jurisdictions/{jid}/case-types/{ctid}/work-basket-inputs` | Returns workbasket field config regardless of ES enabled state. |
| `POST` | `/internal/searchCases?ctid=&use_case=` | Internal UI endpoint; `use_case=WORKBASKET` or `SEARCH` controls returned field set (`UICaseSearchController.java:149-155`). |

Elasticsearch must be enabled via `ELASTIC_SEARCH_ENABLED=true`; the legacy DB search via `QueryEndpoint` is always available.

## Submit-event request shape

```json
{
  "data": { "<fieldId>": "<value>" },
  "event": {
    "id": "<eventId>",
    "summary": "Optional summary",
    "description": "Optional description"
  },
  "event_token": "<token from start-event>",
  "ignore_warning": false
}
```

## Submit-event response shape (callback)

Callback services receive a `CallbackRequest` and must return a `CallbackResponse`:

```json
{
  "data": { "<fieldId>": "<updated value>" },
  "errors": [],
  "warnings": [],
  "state": "<optionalNewState>"
}
```

Non-empty `errors` causes HTTP 422. Non-empty `warnings` with `ignore_warning: false` also causes 422 (`CallbackService.java:191-205`).

## Key behaviours

- **`submitted` callback fires after DB commit.** Failure is caught and logged; it does not roll back the case save (`DefaultCreateEventOperation.java:100-104`).
- **Callback retry.** `about_to_start` and `about_to_submit` retry up to 3 times (T+1s, T+4s). Set `retriesTimeout: [0]` on an event to disable retry (`CallbackService.java:75`).
- **Authorisation wrappers.** Both start- and submit-event operations are injected with an `@Qualifier("authorised")` decorator that enforces RBAC before delegating to the default implementation.
- **Decentralised case types.** If a case type matches a prefix in `ccd.decentralised.case-type-service-urls`, reads and writes are routed to the external `/ccd-persistence/*` endpoints instead of the local DB. `about_to_submit` and `submitted` callbacks are skipped for decentralised events (`CallbackInvoker.java:98-99, 123-125`).

## See also

- [Architecture](../explanation/architecture.md) — how the data store fits into the wider CCD platform
- [Event model](../explanation/event-model.md) — the two-step start/submit event lifecycle explained
- [Glossary](glossary.md) — CCD term definitions
