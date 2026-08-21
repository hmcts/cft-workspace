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
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/EventTokenService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/CreateCaseEventService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/DefaultCaseDetailsRepository.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/CaseDetailsEntity.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/exceptions/CaseConcurrencyException.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/stdapi/CallbackInvoker.java
  - service-auth-provider-java-client:src/main/java/uk/gov/hmcts/reform/authorisation/ServiceAuthorisationApi.java
  - service-auth-provider-java-client:src/main/java/uk/gov/hmcts/reform/authorisation/generators/ServiceAuthTokenGenerator.java
  - service-auth-provider-java-client:src/main/java/uk/gov/hmcts/reform/authorisation/generators/TotpGenerator.java
  - cnp-flux-config:apps/ccd/ccd-case-disposer/prod.yaml
  - cnp-flux-config:apps/money-claims/cmc-s2s/demo.yaml
  - ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/service/v2/CaseCollectorService.java
  - ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/data/CaseLinkRepository.java
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
title: 'API: Data Store'
diataxis: reference
product: ccd
sources_sha:
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/StartEventController.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseController.java": "908a83a97b9e15e4d93e9990c4ee6f7f4cbdfb72"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseDataValidatorController.java": "6bd724e7501334211b25c150e57a1180f2df758d"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/v2/external/controller/CaseAssignedUserRolesController.java": "29cd1dc9f926e44b9fdec60be7bf1b21de7e5e8f"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/std/CaseSearchEndpoint.java": "b13d8bcef6553345ada5c3f153bd61e39421b574"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/std/GlobalSearchEndpoint.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/ui/QueryEndpoint.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/CallbackService.java": "0c5bd4c1bc52130ee793289b9d59881e999a4a6b"
  ? "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/supplementarydata/AuthorisedSupplementaryDataUpdateOperation.java"
  : "80adc76067063ba3c3600fb3e0674b41bfe5426f"
  "ccd-data-store-api:src/main/resources/application.properties": "5daf60c31eeb61da276722c2639fa50d279a26a8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/callbacks/EventTokenService.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/CreateCaseEventService.java": "e3fca30b92506584a590ae203811d60202129d2d"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/DefaultCaseDetailsRepository.java": "3f31c2b5662bbfbe8d341fb02ce3688124b5cdd6"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/data/casedetails/CaseDetailsEntity.java": "bdc0ee9a44c328af6debe18553bee0b427f253f8"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/endpoint/exceptions/CaseConcurrencyException.java": "b40a37b41eef311b5612999246c6cf88fa759026"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/stdapi/CallbackInvoker.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "service-auth-provider-java-client:src/main/java/uk/gov/hmcts/reform/authorisation/ServiceAuthorisationApi.java": "931705928066bd80f800c760c9b252877b522db0"
  "service-auth-provider-java-client:src/main/java/uk/gov/hmcts/reform/authorisation/generators/ServiceAuthTokenGenerator.java": "a71a28926ddede4c0d0136bd47506b2f73fdc57e"
  "service-auth-provider-java-client:src/main/java/uk/gov/hmcts/reform/authorisation/generators/TotpGenerator.java": "a71a28926ddede4c0d0136bd47506b2f73fdc57e"
  "cnp-flux-config:apps/ccd/ccd-case-disposer/prod.yaml": "21e817f95455da6f6b4b85904c4770ca75714008"
  "cnp-flux-config:apps/money-claims/cmc-s2s/demo.yaml": "354f256227ac3d25f687b696bc83a137b52a1cfa"
  "ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/service/v2/CaseCollectorService.java": "0fe304c9f7bd495b893bb01fb6a93e28c6776056"
  "ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/data/CaseLinkRepository.java": "0fe304c9f7bd495b893bb01fb6a93e28c6776056"
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

To mint an S2S token by hand (for AAT testing, say), reproduce what `ServiceAuthTokenGenerator` does: derive a time-based one-time password from the microservice's Base32 secret over HMAC-SHA1, then `POST /lease` with a JSON body of `microservice` and `oneTimePassword` and read the token out of the `text/plain` response (`service-auth-provider-java-client:src/main/java/uk/gov/hmcts/reform/authorisation/generators/ServiceAuthTokenGenerator.java:26-33`, `TotpGenerator.java:22-28`, `ServiceAuthorisationApi.java:26-29`).

Each microservice's shared secret is injected into the S2S provider as `MICROSERVICEKEYS_<SERVICE_NAME>`, uppercased with underscores for hyphens (`cnp-flux-config:apps/money-claims/cmc-s2s/demo.yaml:12-28`). The provider itself is reachable in-cluster at `http://rpe-service-auth-provider-<env>.service.core-compute-<env>.internal` (`cnp-flux-config:apps/ccd/ccd-case-disposer/prod.yaml:19`), which is what the data store's `idam.s2s-auth.url` points at (`application.properties:104`).

## Endpoints

### Event lifecycle (v2 external)

| Method | Path | Controller method | Purpose |
|--------|------|-------------------|---------|
| `GET` | `/cases/{caseId}/event-triggers/{eventId}` | `StartEventController.getStartEventTrigger` | Start event for existing case; fires `about_to_start`; returns event token |
| `GET` | `/case-types/{caseTypeId}/event-triggers/{triggerId}` | `StartEventController.getStartCaseEvent` | Start event for new case creation |
| `POST` | `/cases/{caseId}/events` | `CaseController.createEvent` | Submit event on existing case |
| `POST` | `/case-types/{caseTypeId}/cases` | `CaseController.createCase` | Create new case (returns 16-digit CCD reference) |

The token returned by the start-event call must be included as `CaseDataContent.token` in the submit body. It is an HS256-signed JWT whose claims pin the event to a single user, case, case type, jurisdiction and state, plus a hash of the case data and the case's entity version and revision (`EventTokenService.java:65-78`). `CreateCaseEventService` validates it at `CreateCaseEventService.java:211-217`. A token whose event, case, jurisdiction, case type or subject does not match the request is rejected as `Cannot find matching start trigger` — HTTP 404, not 409 (`EventTokenService.java:137-148`); an absent token gives HTTP 400 (`EventTokenService.java:130-132`).

**Typical integration pattern** (from service frontends):

1. `GET /case-types/{caseTypeId}/event-triggers/{eventId}` -- obtain token
2. `POST /case-types/{caseTypeId}/cases` -- submit with token + data (for creation)

Or for an existing case:

1. `GET /cases/{caseId}/event-triggers/{eventId}` -- obtain token
2. `POST /cases/{caseId}/events` -- submit with token + data

Do not run events on the same case in parallel. Validation copies the token's `entity_version` claim back onto the case before the write (`EventTokenService.java:150-152`), and `case_data` carries a JPA `@Version` column (`CaseDetailsEntity.java:139-140`), so the second of two events started from the same case version fails its `merge`/`flush` and comes back as HTTP 409 with `Unfortunately we were unable to save your work to the case...` (`DefaultCaseDetailsRepository.java:78-83`, `CaseConcurrencyException.java:6`). The conflict is on the case, not the user — two different users each holding their own valid token collide the same way.

<!-- DIVERGENCE: Confluence 1285226659 frames the concurrency hazard as parallel requests by the same IDAM user. Source: the optimistic lock is the case row's @Version column (ccd-data-store-api CaseDetailsEntity.java:139-140, DefaultCaseDetailsRepository.java:78-83), so any two concurrent events on one case conflict regardless of who submits them. Source wins. -->

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
- **Callback retry.** Every callback type — `about_to_start`, `mid_event`, `about_to_submit`, `submitted`, `get_case` — retries up to 3 times (T, T+1 s, T+4 s) (`CallbackService.java:75,87`). Set the callback's `RetriesTimeout` column to exactly `[0]` to disable retry; any other value is ignored (`CallbackInvoker.java:207-209`).
- **Authorisation wrappers.** Both start- and submit-event operations are injected with an `@Qualifier("authorised")` decorator that enforces RBAC before delegating to the default implementation.
- **Decentralised case types.** If a case type matches a prefix in `ccd.decentralised.case-type-service-urls`, reads and writes are routed to the external `/ccd-persistence/*` endpoints instead of the local DB. `about_to_submit` and `submitted` callbacks are skipped for decentralised events (`CallbackInvoker.java:98-99, 123-125`).
- **No rate limiting.** `ccd-data-store-api` ships no throttling filter or quota configuration; a misbehaving caller is bounded only by pod count and connection pool size, so volume and failure rates have to be watched externally.
- **Deletion is TTL-driven, not on demand.** `ccd-case-disposer` selects cases by `resolved_ttl < CURRENT_DATE` for its configured case types (`ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/data/CaseLinkRepository.java:25`, `CaseCollectorService.java:79-98`) — there is no way to hand it a list of case references. A group of linked cases is skipped entirely unless every case in the group has expired (`CaseCollectorService.java:56-77`), so one long-lived case keeps its whole link graph alive.

<!-- DIVERGENCE: Confluence 1285226659 states that rolling back case data in production is done with the CCD disposal tool. Source: ccd-case-disposer only collects cases whose resolved_ttl has already passed (ccd-case-disposer CaseLinkRepository.java:25, CaseCollectorService.java:79-98); it takes case types, not case references, and cannot target arbitrary cases. Source wins. -->

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
