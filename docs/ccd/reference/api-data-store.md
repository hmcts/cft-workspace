---
topic: architecture
audience: both
sources:
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/StartEventController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseDataValidatorController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseAssignedUserRolesController.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/std/CaseSearchEndpoint.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/std/GlobalSearchEndpoint.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/ui/QueryEndpoint.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/CallbackService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/supplementarydata/AuthorisedSupplementaryDataUpdateOperation.java
  - ccd-data-store-api:src/main/resources/application.properties
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence:
  - id: "843514186"
    title: "CCD ElasticSearch and new search API Design LLD"
    last_modified: "unknown"
    space: "RCCD"
  - id: "738820710"
    title: "Call CCD Data Store API in AAT"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1945639463"
    title: "Elasticsearch and CCD"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1864154052"
    title: "PCS Frontend Customer Journey interactions with CCD and pcs-api"
    last_modified: "unknown"
    space: "RRFM"
  - id: "1285226659"
    title: "CCD Data Store APIs"
    last_modified: "unknown"
    space: "RCCD"
  - id: "1864157378"
    title: "16 June 2025 - CCD API demo for ARIADM"
    last_modified: "unknown"
    space: "DRDM"
confluence_checked_at: "2026-04-29T00:00:00Z"
---

# API: Data Store

## TL;DR

- The CCD Data Store API (`ccd-data-store-api`) is the single service for creating, updating, retrieving, and searching case data.
- Every mutation flows through a two-step protocol: **start event** (gets a token + fires `about_to_start`) then **submit event** (validates token, fires `about_to_submit`, persists, fires `submitted`).
- The modern external surface lives under `/cases/` and `/case-types/` (v2); legacy caseworker/citizen paths under `/caseworkers/` and `/citizens/` are still active.
- Search is either Elasticsearch (`POST /searchCases`) or, for cross-jurisdiction queries, `POST /globalSearch`. Search is near-real-time (~2 seconds lag after a case is created/updated).
- All endpoints require two auth headers: `Authorization: Bearer <IDAM token>` and `ServiceAuthorization: <S2S token>`. The S2S-authorised services list is configured via `DATA_STORE_S2S_AUTHORISED_SERVICES`.
- Full OpenAPI spec is served at `/v2/api-docs` on a running instance and published to the [HMCTS API catalogue](https://hmcts.github.io/cnp-api-docs/swagger.html?url=https://hmcts.github.io/cnp-api-docs/specs/ccd-data-store-api.v2_external.json).

## Authentication

Every request to the Data Store API requires two headers:

| Header | Value | Source |
|--------|-------|--------|
| `Authorization` | `Bearer <IDAM user token>` | OAuth2 token from IDAM (grant type `password` or `authorization_code`) |
| `ServiceAuthorization` | `<S2S JWT>` | Obtained by exchanging microservice name + TOTP with `rpe-service-auth-provider` at `/lease` |

The S2S token identifies the calling microservice. Only services listed in `DATA_STORE_S2S_AUTHORISED_SERVICES` are permitted. The default list includes: `ccd_gw`, `ccd_data`, `aac_manage_case_assignment`, `ccd_case_document_am_api`, `am_role_assignment_service`, and several service-team backends.

<!-- CONFLUENCE-ONLY: not verified in source -->
To generate an S2S token manually (e.g. for AAT testing), use the microservice secret from Azure Key Vault setting `MICROSERVICEKEYS_<SERVICE_NAME>` in the `rpe-service-auth-provider` App Service, generate a 6-digit TOTP, then POST to `rpe-service-auth-provider-<env>.service.core-compute-<env>.internal/lease`.

## Endpoints

### Event lifecycle (v2 external)

| Method | Path | Controller method | Purpose |
|--------|------|-------------------|---------|
| `GET` | `/cases/{caseId}/event-triggers/{eventId}` | `StartEventController.getStartEventTrigger` | Start event for existing case; fires `about_to_start`; returns event token |
| `GET` | `/case-types/{caseTypeId}/event-triggers/{triggerId}` | `StartEventController.getStartCaseEvent` | Start event for new case creation |
| `POST` | `/cases/{caseId}/events` | `CaseController.createEvent` | Submit event on existing case |
| `POST` | `/case-types/{caseTypeId}/cases` | `CaseController.createCase` | Create new case (returns 16-digit CCD reference) |

The token returned by the start-event call must be included as `CaseDataContent.token` in the submit body. `CreateCaseEventService` validates it at `CreateCaseEventService.java:210-216`; a stale or mismatched token is rejected with HTTP 409.

**Typical integration pattern** (from service frontends):

1. `GET /case-types/{caseTypeId}/event-triggers/{eventId}` -- obtain token
2. `POST /case-types/{caseTypeId}/cases` -- submit with token + data (for creation)

Or for an existing case:

1. `GET /cases/{caseId}/event-triggers/{eventId}` -- obtain token
2. `POST /cases/{caseId}/events` -- submit with token + data

<!-- CONFLUENCE-ONLY: not verified in source -->
Avoid parallel requests with the same IDAM user -- the event token mechanism uses optimistic locking and concurrent submissions by the same user will conflict.

### Case retrieval (v2 external)

| Method | Path | Controller method | Purpose |
|--------|------|-------------------|---------|
| `GET` | `/cases/{caseId}` | `CaseController.getCase` | Retrieve case by 16-digit reference |
| `GET` | `/cases/{caseId}/events` | `CaseController.getCaseEvents` | Audit event list (excludes `data` snapshot for performance) |
| `GET` | `getLinkedCases/{caseReference}` | `CaseController.getLinkedCase` | Retrieve linked cases with pagination (`startRecordNumber`, `maxReturnRecordCount`) |

Note: the event list endpoint omits `data`/`dataClassification` columns; only a single-event fetch returns the full data snapshot (`CaseAuditEventEntity.java:52-64`).

### Validation (v2 external, experimental)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/case-types/{caseTypeId}/validate` | Validate case data fields against the definition; invokes mid-event callbacks. Requires `experimental: true` header. |

This endpoint validates a page of fields and fires any configured `midEvent` callback, allowing page-by-page validation during multi-page wizard flows.

### Case-user roles (v2 external)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/case-users` | Add case-user-role assignments (S2S-gated) |
| `DELETE` | `/case-users` | Remove case-user-role assignments (S2S-gated) |
| `GET` | `/case-users` | Get case-user-role assignments (deprecated -- use POST search below) |
| `POST` | `/case-users/search` | Search case-user-role assignments (avoids URI-too-long issues) |

Only services in `ccd.s2s-authorised.services.case_user_roles` (default: `aac_manage_case_assignment`) can call these. Case roles must be formatted as `[ROLE_NAME]` (square brackets required). Controlled by feature flag `ccd.conditional-apis.case-assigned-users-and-roles.enabled`.

### Supplementary data (v2 external)

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/cases/{caseId}/supplementary-data` | Atomic `$set` or `$inc` operations on the `supplementary_data` JSONB column |

Request body keys use operation prefixes: `$set` overwrites a path, `$inc` atomically increments a numeric path. This endpoint is S2S-gated -- only service accounts should call it (`AuthorisedSupplementaryDataUpdateOperation.java:18-32`). Supplementary data is **not** returned in regular case GET responses but **is** available via the search API (see below).

### Document metadata (v2 external)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/cases/{caseId}/documents/{documentId}` | Retrieve document metadata; proxies to CDAM |

### Search

| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/searchCases?ctid=<caseTypeId>` | Elasticsearch; body is native ES JSON or custom format. Use `ctid=*` to search all accessible case types. |
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

## Search API details

### Request formats

The `/searchCases` endpoint accepts two request formats:

**Native ES format** -- a standard Elasticsearch Search API JSON body:

```json
{
  "query": { "match_all": {} },
  "size": 50
}
```

**Custom format** -- wraps the native query and adds CCD-specific properties:

```json
{
  "native_es_query": {
    "query": { "match_all": {} }
  },
  "supplementary_data": ["orgs_assigned_users", "*"]
}
```

| Property | Type | Purpose |
|----------|------|---------|
| `native_es_query` | Object | A native Elasticsearch query |
| `supplementary_data` | Array of strings | Request supplementary data fields in the response (use `["*"]` for all) |

### Blacklisted queries

The following ES query types are blocked (HTTP 400): `query_string`, `runtime_mappings`. Configured via `search.blacklist` in application properties.

### Cross-case-type search

Pass multiple case types as a comma-separated list: `/searchCases?ctid=CaseTypeA,CaseTypeB`. The response includes a `case_types_results` array indicating count per case type:

```json
{
  "total": 11,
  "cases": [{}, {}],
  "case_types_results": [
    { "total": 5, "case_type_id": "CaseTypeA" },
    { "total": 6, "case_type_id": "CaseTypeB" }
  ]
}
```

For cross-case-type search, results contain only metadata by default (no case field data). To get case data, specify alias fields in `_source`: `"_source": ["alias.customer", "alias.postcode"]`. Alias fields are configured in the **SearchAlias** definition tab and must be prefixed with `alias.` in queries.

### Important behaviours

- **Default result size is 10.** Always specify `"size"` in the query if you need more results.
- **Near-real-time.** Cases become searchable ~2 seconds after creation/update (Logstash polling interval is 1 second in production).
- **`ctid` parameter is case-sensitive** and must match the exact case type ID from the imported definition. Mismatch returns 404.
- **`data_classification` query parameter** (default: `true`) controls whether the response includes security classification metadata.
- **Supplementary data defaults to `*`** -- if not explicitly requested in the custom format, all supplementary data is returned.
- **Retrieving subsets.** Use `"_source"` to request only specific fields: `"_source": ["jurisdiction", "data.deceasedSurname"]`. All case metadata is always returned regardless of `_source`.

### Search query examples

**Exact match on a FixedList field:**

```json
{
  "query": {
    "bool": {
      "filter": { "term": { "data.FixedListField": "value3" } }
    }
  }
}
```

**Wildcard search on text:**

```json
{
  "query": {
    "wildcard": { "data.TextField.keyword": "Lance*" }
  }
}
```

**Date range:**

```json
{
  "query": {
    "bool": {
      "filter": {
        "range": { "data.DateField": { "gte": "now/d", "lte": "now/d" } }
      }
    }
  }
}
```

**Cases by organisation (OrganisationPolicy):**

```json
{
  "query": {
    "bool": {
      "filter": [
        { "multi_match": { "query": "<orgId>", "type": "phrase", "fields": ["data.*.Organisation.OrganisationID"] } }
      ]
    }
  }
}
```

## Key behaviours

- **`submitted` callback fires after DB commit.** Failure is caught and logged; it does not roll back the case save (`DefaultCreateEventOperation.java:100-104`).
- **Callback retry.** `about_to_start` and `about_to_submit` retry up to 3 times (T+1s, T+4s). Set `retriesTimeout: [0]` on an event to disable retry (`CallbackService.java:75`).
- **Authorisation wrappers.** Both start- and submit-event operations are injected with an `@Qualifier("authorised")` decorator that enforces RBAC before delegating to the default implementation.
- **Decentralised case types.** If a case type matches a prefix in `ccd.decentralised.case-type-service-urls`, reads and writes are routed to the external `/ccd-persistence/*` endpoints instead of the local DB. `about_to_submit` and `submitted` callbacks are skipped for decentralised events (`CallbackInvoker.java:98-99, 123-125`).
<!-- CONFLUENCE-ONLY: not verified in source -->
- **No strict rate limits.** There is no documented rate-limiting on the API, but monitor for volume and failures. Production rollback of case data requires the CCD disposal tool.

## Environment URLs

| Environment | Data Store URL |
|-------------|---------------|
| AAT | `ccd-data-store-api-aat.service.core-compute-aat.internal` |
| Preview | `ccd-data-store-api-<service>-pr-<number>.preview.platform.hmcts.net` |
| Production | `ccd-data-store-api-prod.service.core-compute-prod.internal` |

The API is not publicly exposed; access requires either the platform VPN or routing through the AAC gateway proxy (XUI routes via `aac-manage-case-assignment` at `/ccd/**`).

## See also

- [Architecture](../explanation/architecture.md) -- how the data store fits into the wider CCD platform
- [Event model](../explanation/event-model.md) -- the two-step start/submit event lifecycle explained
- [Search architecture](../explanation/search-architecture.md) -- Elasticsearch indexing and Logstash details
- [Glossary](glossary.md) -- CCD term definitions
