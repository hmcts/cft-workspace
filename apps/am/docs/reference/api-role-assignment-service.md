---
title: Api Role Assignment Service
topic: architecture
diataxis: reference
product: am
audience: both
sources:
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/controller/endpoints/CreateAssignmentController.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/controller/endpoints/GetAssignmentController.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/controller/endpoints/DeleteAssignmentController.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/controller/endpoints/QueryAssignmentController.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/model/QueryRequest.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/model/MultipleQueryRequest.java
  - am-role-assignment-service:src/main/resources/application.yaml
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/versions/V1.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/versions/V2.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/model/enums/FeatureFlagEnum.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/service/common/ValidationModelService.java
  - am-role-assignment-service:src/main/resources/roleconfig/role_common.json
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/am/am-role-assignment-service/src/main/resources/db/migration/V1_1__init_tables.sql
  - apps/am/am-role-assignment-service/src/main/resources/META-INF/kmodule.xml
  - apps/am/am-role-assignment-service/src/main/resources/validationrules/core/reject-unapproved-role-assignments.drl
  - apps/am/am-role-assignment-service/src/main/resources/roleconfig/role_common.json
confluence:
  - id: "1491643419"
    title: "HLD - Role Assignment Service - v1.3"
    last_modified: "2021-04-26T00:00:00Z"
    space: "AM"
  - id: "1385792545"
    title: "LLD - Role Assignment Service"
    last_modified: "2021-02-28T00:00:00Z"
    space: "AM"
  - id: "1386808483"
    title: "POST /am/role-assignments"
    last_modified: "2021-01-28T00:00:00Z"
    space: "AM"
  - id: "1504216881"
    title: "POST /am/role-assignments/query/delete"
    last_modified: "2022-01-01T00:00:00Z"
    space: "AM"
  - id: "1440494617"
    title: "Validation Rules by Drools Engine"
    last_modified: "2020-11-02T00:00:00Z"
    space: "AM"
  - id: "1593576197"
    title: "AM applications feature flags"
    last_modified: "2024-01-01T00:00:00Z"
    space: "AM"
  - id: "1859851360"
    title: "Creating a Role Assignment in RAS via the API"
    last_modified: "2025-04-28T00:00:00Z"
    space: "RRFM"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- Role Assignment Service (RAS) exposes CRUD endpoints at `/am/role-assignments` for creating, querying, and deleting role assignments (port 4096).
- All endpoints require `Authorization` (OIDC JWT), `ServiceAuthorization` (S2S token), and optionally `x-correlation-id` headers.
- The query endpoint supports two versions (v1 single query, v2 multi-query) differentiated by `Content-Type` header, not URL path.
- Pagination on query endpoints is controlled via request headers (`pageNumber`, `size`, `sort`, `direction`), not query parameters.
- Create requests are validated by a three-stage in-process Drools rules engine (service-trust, pattern validation, rejection fallback); rejected assignments return HTTP 422.
- `replaceExisting=true` on a create request atomically deletes and replaces all assignments matching the same `process` + `reference`.

## Endpoints

### Create

| Method | Path | Description | Success | Error |
|--------|------|-------------|---------|-------|
| POST | `/am/role-assignments` | Create one or more role assignments | 201 | 422 (Drools rejection) |

The request body is an `AssignmentRequest` containing a `roleRequest` header and a `requestedRoles` collection. The operation is transactional (`REQUIRES_NEW`). When `replaceExisting=true`, existing assignments with the same `process` + `reference` are deleted and replaced atomically.

When `replaceExisting=true`, the service compares new records against existing records and skips replacement if they are identical (duplicate detection).

(`CreateAssignmentController.java:44`)

### Read

| Method | Path | Description | Success | Notes |
|--------|------|-------------|---------|-------|
| GET | `/am/role-assignments/actors/{actorId}` | All live assignments for an actor | 200 | Accepts `If-None-Match` header (ETag); returns 304 if unchanged |
| GET | `/am/role-assignments/roles` | Role catalogue (all configured role names/patterns) | 200 | Returns `RoleConfigRole` list from in-memory JSON config |

The actor endpoint implements HTTP caching: the response includes `Cache-Control: no-cache, private` and a weak ETag header. On subsequent requests, the client sends the ETag as `If-None-Match`; if the actor's role assignments have not changed, the service returns HTTP 304 with no body.

(`GetAssignmentController.java:42`, `GetAssignmentController.java:83`)

### Delete

| Method | Path | Description | Success | Notes |
|--------|------|-------------|---------|-------|
| DELETE | `/am/role-assignments?process={p}&reference={r}` | Delete by process + reference | 204 | Query params required |
| DELETE | `/am/role-assignments/{assignmentId}` | Delete by UUID | 204 | |
| POST | `/am/role-assignments/query/delete` | Bulk delete by multi-query | 200 | Returns `Total-Records` response header |

Note: the bulk-delete endpoint (`POST .../query/delete`) returns HTTP 200 (not 204) unlike the other delete operations (`DeleteAssignmentController.java:155`).

<!-- CONFLUENCE-ONLY: Confluence warns that the query/delete endpoint should never be used to delete professional case roles - these are maintained through Assign Case Access APIs which keep supplementary case data in sync. -->

**Bulk delete safety guidance**: The query/delete endpoint deletes ALL role assignments matching the search criteria. In production, where many role types coexist on a case, an overly broad query can unintentionally remove citizen roles, professional roles, or conflict-of-interest exclusions. Recommended minimum filters for safe usage:

| Filter | Recommended value | Reason |
|--------|-------------------|--------|
| `roleType` | `["CASE"]` | Avoid deleting organisational roles |
| `grantType` | `["SPECIFIC"]` | Avoid deleting exclusions (EXCLUDED) |
| `roleCategory` | `["ADMIN", "CTSC", "LEGAL_OPERATIONS", "JUDICIAL", "OTHER_GOV_DEPT"]` | Exclude CITIZEN/PROFESSIONAL |
| `attributes.jurisdiction` | Service jurisdiction | Scope to relevant service |
| `attributes.caseId` | Target case IDs | Essential for precision |
| `roleName` | Explicit list | Avoid deleting unexpected role types |

### Query

| Method | Path | Content-Type | Description | Success |
|--------|------|--------------|-------------|---------|
| POST | `/am/role-assignments/query` | `application/vnd.uk.gov.hmcts.role-assignment-service.post-assignment-query-request+json;charset=UTF-8;version=1.0` | Single query (v1) | 200 |
| POST | `/am/role-assignments/query` | `application/vnd.uk.gov.hmcts.role-assignment-service.post-assignment-query-request+json;charset=UTF-8;version=2.0` | Multiple query (v2) | 200 |

Both versions map to the same URL; the API version is selected by the `Content-Type` / `Accept` headers. V2 wraps multiple `QueryRequest` objects combined with OR logic.

(`QueryAssignmentController.java:51`, `QueryAssignmentController.java:90`)

## Authentication

All `/am/**` endpoints require two headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `Authorization` | `Bearer <OIDC JWT>` | User identity |
| `ServiceAuthorization` | `Bearer <S2S token>` | Calling service identity |
| `x-correlation-id` | String (optional) | Correlation ID for request tracing; auto-generated if not provided |

The `ServiceAuthFilter` runs at `Order(1)`, before `BearerTokenAuthenticationFilter` at `Order(2)` (`SecurityConfiguration.java:41-46`).

### Identity model for validation

The Drools validation engine considers four distinct identities when evaluating a create or delete request:

| Identity | Source | Description |
|----------|--------|-------------|
| Assigner ID | `roleRequest.assignerId` in request body | The user authorising the role assignment (may differ from authenticated user in async workflows) |
| Microservice ID | `ServiceAuthorization` token (`clientId`) | The calling service |
| Authenticated User ID | `Authorization` token | The user account submitting the HTTP request |
| Assignee ID | `requestedRoles[].actorId` | The target user receiving the role assignment |

<!-- CONFLUENCE-ONLY: Confluence states that for UI-originating calls, assignerId should equal authenticated user ID, but is not defaulted — must be explicitly provided. not verified in source -->

### Authorised S2S callers

The following services are permitted to call RAS (from `application.yaml:127`):

| Service | Typical use |
|---------|-------------|
| `ccd_gw` | CCD gateway |
| `am_role_assignment_service` | Self (internal calls, integration tests) |
| `am_org_role_mapping_service` | Provisions organisational roles |
| `am_role_assignment_refresh_batch` | Refreshes org role assignments |
| `xui_webapp` | Expert UI frontend backend |
| `aac_manage_case_assignment` | Notice of Change / case assignment |
| `ccd_data` | CCD data store (case-role CRUD) |
| `wa_workflow_api` | Work allocation workflow |
| `wa_task_management_api` | Work allocation task management |
| `wa_task_monitor` | Work allocation task monitor |
| `wa_case_event_handler` | Work allocation case event handler |
| `iac` | Immigration & Asylum Chamber |
| `hmc_cft_hearing_service` | Hearings management |
| `ccd_case_disposer` | Case disposer (TTL cleanup) |
| `sscs` | Social Security & Child Support |
| `fis_hmc_api` | Family Integration Suite HMC |
| `fpl_case_service` | Family Public Law |
| `disposer-idam-user` | IDAM user disposal |
| `civil_service` | Civil service |
| `prl_cos_api` | Private Law Case Orchestration |

Services in this list but without matching Drools rules will still have their assignment requests rejected as unapproved. The S2S `clientId` is extracted and passed to Drools for rule evaluation (`ParseRequestService.java:53`).

## Request and response shapes

### AssignmentRequest (create body)

```json
{
  "roleRequest": {
    "assignerId": "<IDAM user ID>",
    "process": "<workflow identifier>",
    "reference": "<external reference e.g. case ID>",
    "replaceExisting": false
  },
  "requestedRoles": [
    {
      "actorIdType": "IDAM",
      "actorId": "<target user ID>",
      "roleType": "CASE",
      "roleName": "hearing-judge",
      "roleCategory": "JUDICIAL",
      "classification": "PRIVATE",
      "grantType": "SPECIFIC",
      "beginTime": "2024-01-01T00:00:00Z",
      "endTime": null,
      "attributes": {
        "jurisdiction": "IA",
        "caseType": "Asylum",
        "caseId": "1234567890123456"
      },
      "authorisations": [],
      "notes": [
        {
          "userId": "<IDAM user ID>",
          "time": "2024-01-01T00:00:00Z",
          "comment": "Free-text justification"
        }
      ],
      "readOnly": false
    }
  ]
}
```

**Timestamp format**: Must include UTC offset. Accepted formats:
- `"2024-01-01T00:00:00Z"` (UTC)
- `"2024-01-01T00:00:00+00:00"` (explicit UTC offset)
- `"2024-01-01T00:00:00+01:00"` (BST offset)

**roleRequest fields**:

| Field | Mandatory | Description |
|-------|-----------|-------------|
| `assignerId` | Yes | IDAM ID of the user authorising the request |
| `process` | Conditional | Business process identifier. Mandatory when `replaceExisting=true` |
| `reference` | Conditional | External reference for grouping. Mandatory when `replaceExisting=true` |
| `replaceExisting` | Yes | Whether to atomically replace existing assignments with same process+reference |

### Create response (201)

The response wraps the input with additional server-generated fields:

```json
{
  "roleAssignmentResponse": {
    "roleRequest": {
      "id": "<generated UUID>",
      "authenticatedUserId": "<from token>",
      "correlationId": "<generated or from x-correlation-id header>",
      "assignerId": "...",
      "requestType": "CREATE",
      "process": "...",
      "reference": "...",
      "replaceExisting": false,
      "status": "APPROVED",
      "created": "2024-01-01T12:00:00Z",
      "log": "Request has been approved"
    },
    "requestedRoles": [
      {
        "id": "<generated UUID>",
        "status": "LIVE",
        "created": "2024-01-01T12:00:00Z",
        "process": "...",
        "reference": "...",
        "log": "Create requested with replace: false\nCreate approved : ...\nApproved : validate_role_assignment_against_patterns",
        "...": "all fields from request echoed back"
      }
    ]
  }
}
```

The `log` field contains a newline-separated trail of Drools rule names that fired during validation.

### QueryRequest (v1 body)

```json
{
  "actorId": ["actor-uuid-1"],
  "roleType": ["CASE"],
  "roleName": ["hearing-judge"],
  "classification": ["PUBLIC", "PRIVATE"],
  "grantType": ["SPECIFIC"],
  "validAt": "2024-06-01T12:00:00",
  "roleCategory": ["JUDICIAL"],
  "attributes": {
    "jurisdiction": ["IA"],
    "caseId": ["1234567890123456"]
  },
  "authorisations": ["IAC"],
  "hasAttributes": ["caseId"],
  "readOnly": false
}
```

### MultipleQueryRequest (v2 body)

```json
{
  "queryRequests": [
    { "actorId": ["actor-1"], "roleType": ["ORGANISATION"] },
    { "roleName": ["case-allocator"], "attributes": { "jurisdiction": ["IA"] } }
  ]
}
```

Multiple queries are combined with OR (union), not AND.

## Query pagination

Pagination is controlled by **request headers** (not query parameters):

| Header | Type | Default | Description |
|--------|------|---------|-------------|
| `pageNumber` | integer | 0 | Zero-based page index |
| `size` | integer | 20 | Page size |
| `sort` | string | -- | Sort field |
| `direction` | string | -- | Sort direction (ASC/DESC) |

The response always includes a `Total-Records` header with the total matching count regardless of page size (`QueryRoleAssignmentOrchestrator.java:79-82`).

Add `?includeLabels=true` as a query parameter to populate `roleLabel` on each assignment in the response.

## Query filter behaviour

| Filter field | DB mechanism | NULL/empty behaviour |
|---|---|---|
| `actorId` | `IN` clause | No filter applied (returns all) |
| `attributes` | PostgreSQL `contains_jsonb` function on JSONB column | NULL values match via `jsonb_extract_path_text IS NULL` |
| `validAt` | `beginTime <= validAt AND (endTime >= validAt OR endTime IS NULL)` | -- |
| `authorisations` | PostgreSQL `array_position` (ANY match) | -- |
| `hasAttributes` | OR across listed keys (present check) | -- |
| `roleType`, `roleName`, `classification`, `grantType`, `roleCategory` | `IN` clause | No filter when null/empty |
| `readOnly` | Boolean match | -- |

The `attributes` filter supports null in value lists: `"jurisdiction": [null, "IA"]` translates to `(jurisdiction IS NULL OR jurisdiction = 'IA')`.

(`RoleAssignmentEntitySpecifications.java:42-172`)

## Enumerated values

### RoleType

| Value | Description |
|-------|-------------|
| `CASE` | Scoped to a specific case |
| `ORGANISATION` | Organisation-wide role |

### GrantType

| Value | Description |
|-------|-------------|
| `BASIC` | Limited access for search results and case lists (not useful for doing work) |
| `SPECIFIC` | Full access granted by a specific access process (individual relationship to case) |
| `STANDARD` | Full access granted by an organisational role (no individual case relationship) |
| `CHALLENGED` | Full access granted by a challenged access process (requires justification) |
| `EXCLUDED` | Removes access rather than granting it (used for conflicts of interest) |

### Classification

Ordered: `RESTRICTED` > `PRIVATE` > `PUBLIC`. A user with RESTRICTED classification can access all three levels.

### RoleCategory

`JUDICIAL`, `LEGAL_OPERATIONS`, `ADMIN`, `PROFESSIONAL`, `CITIZEN`, `SYSTEM`, `OTHER_GOV_DEPT`, `CTSC`

(`RoleCategory.java:3`)

### Status (with sequence numbers)

| Status | Seq | Description |
|--------|-----|-------------|
| `CREATE_REQUESTED` | 9 | Initial state on submission |
| `CREATE_APPROVED` | 14 | Stage 1 Drools approval (service-trust rule) |
| `APPROVED` | 16 | Stage 2 Drools approval (pattern validation) |
| `REJECTED` | 17 | Drools rejection |
| `LIVE` | 18 | Active assignment (persisted) |
| `DELETE_REQUESTED` | 20 | Delete initiated |
| `DELETE_APPROVED` | 21 | Delete validated |
| `DELETED` | 23 | Soft-deleted |
| `EXPIRED` | 41 | Past `endTime` |

(`Status.java:3-27`)

## Common attributes (JSONB)

The `attributes` field on a role assignment is a flexible JSONB map. Common keys:

| Key | Description | Used for access control |
|-----|-------------|------------------------|
| `jurisdiction` | Case jurisdiction (e.g. `IA`, `SSCS`, `CIVIL`) | Yes |
| `caseId` | 16-digit CCD case reference | Yes |
| `caseType` | CCD case type ID | Yes |
| `region` | Regional location code (from LRD) | Yes |
| `baseLocation` | Base location code (ePIMMS property ID) | Yes |
| `primaryLocation` | Primary court/office location (same for all assignments of a given user) | No |
| `contractType` | Judicial contract type: `SALARIED` or `FEEPAY` | No |
| `substantive` | `"Y"` or `"N"` -- set by Drools pattern validation | No |
| `caseAccessGroupId` | Associates a role assignment to multiple cases from CCD (group role assignment) | No |

<!-- CONFLUENCE-ONLY: HLD mentions organisationId (professional reference data org ID) and actorName (text representation of actor name) as future attributes, but neither is present in current role config JSON files. not verified in source -->

## Drools validation pipeline

The validation engine is a three-stage pipeline executed within a stateless KIE session:

### Facts injected into working memory

The `ValidationModelService` populates the Drools session with:

1. The `Request` object (includes `clientId` from S2S token, `authenticatedUserId`, `assignerId`)
2. All `RoleAssignment` objects from `requestedRoles` (status set to `CREATE_REQUESTED`)
3. `FeatureFlag` objects loaded from the database (controls jurisdiction-specific rules)
4. `RoleConfig` (role pattern definitions from JSON config files)
5. `ExistingRoleAssignment` objects for the assignee, assigner, and authenticated user
6. `RetrieveDataService` global (fetches CCD case data on demand)

(`ValidationModelService.java:135-172`)

### Stage 1: Service-trust rules

Rules keyed on `clientId` approve requests from trusted services. Example:

```
rule "staff_organisational_role_mapping_service_create"
when
  $rq: Request(clientId == "am_org_role_mapping_service")
  $ra: RoleAssignment(status == Status.CREATE_REQUESTED,
                      roleType == RoleType.ORGANISATION,
                      roleCategory == RoleCategory.STAFF)
then
  $ra.setStatus(Status.CREATE_APPROVED);
end
```

For CCD case roles, the `ccd_create_case_roles` rule requires `clientId` in `("ccd_data", "aac_manage_case_assignment")`, `roleType == CASE`, `roleCategory in (PROFESSIONAL, CITIZEN)`, and non-null `jurisdiction`, `caseType`, `caseId` attributes.

### Stage 2: Pattern validation

The `validate_role_assignment_against_patterns` rule matches each `CREATE_APPROVED` assignment against the role configuration JSON patterns. It checks:
- `roleName` matches exactly
- `roleCategory` matches exactly
- `roleType`, `grantType`, `classification` match pattern constraints (if specified)
- `beginTime`, `endTime` match time constraints (if specified)
- Required attributes are present with acceptable values

On match, status advances to `APPROVED`.

### Stage 3: Rejection fallback (salience -1000)

Any assignment still in `CREATE_REQUESTED` or `CREATE_APPROVED` after all other rules have fired is explicitly rejected:

```
rule "reject_unapproved_create_role_assignments"
salience -1000
when
  $ra: RoleAssignment(status in (Status.CREATE_REQUESTED, Status.CREATE_APPROVED))
then
  $ra.setStatus(Status.REJECTED);
end
```

### Case data loading

When a requested role has `attributes["caseId"] != null`, the `load_case_data_for_role_assignments_with_case_ids` rule fetches case data from CCD data store via `RetrieveDataService`. The case data is then available for jurisdiction-specific validation rules.

## Feature flags (DB flags)

RAS uses database-stored feature flags to gate jurisdiction-specific Drools rules. These flags are loaded as `FeatureFlag` facts in the Drools session and can be toggled per environment.

| Flag | Description | Prod status |
|------|-------------|-------------|
| `iac_1_1` | IAC staff/judicial roles (WA R2) | Live |
| `iac_jrd_1_0` | IAC judicial reference data integration | Live |
| `ccd_bypass_1_0` | CCD test jurisdiction bypass | **Not live** (by design) |
| `wa_bypass_1_0` | WA test jurisdiction bypass | **Not live** (by design) |
| `iac_specific_1_0` | IAC specific access case roles | Live |
| `iac_challenged_1_0` | IAC challenged access case roles | Live |
| `sscs_wa_1_0` | SSCS Work Allocation | Live |
| `sscs_challenged_1_0` | SSCS challenged access | Live |
| `sscs_case_allocator_1_0` | SSCS case allocator | Live |
| `all_wa_services_case_allocator_1_0` | Cross-service case allocator | Live |
| `disposer_1_0` | Case disposer role cleanup | Live |
| `ga_prm_1_0` | General Application PRM | Not live |
| `probate_wa_1_0` | Probate Work Allocation | Not live |
| `disposer_1_1` | IDAM user disposal | Not live |

(`FeatureFlagEnum.java:3-17`)

The `ccd_bypass_1_0` and `wa_bypass_1_0` flags enable test jurisdictions in lower environments; they are permanently disabled in production.

## Role configuration files

Role definitions are loaded from JSON files at startup. Each file defines roles with validation patterns:

| File | Jurisdiction/purpose |
|------|---------------------|
| `role_common.json` | Cross-jurisdiction roles (102 role definitions) |
| `role_iac.json` | Immigration & Asylum |
| `role_sscs.json` | SSCS |
| `role_civil.json` | Civil |
| `role_employment.json` | Employment Tribunal |
| `role_privatelaw.json` | Private Law |
| `role_ccd.json` | CCD generic case roles |
| `role_prm.json` | Professional Role Mapping (uses `caseAccessGroupId`) |
| `role_hrs.json` | Hearing Recording Service |
| `role_possessions.json` | Possessions |
| `role_stcic.json` | Special Tribunal (CIC) |

Each role definition includes:
- `name`: role name (matches `roleName` field)
- `label`: human-readable display label
- `description`: longer description
- `category`: role category enum value
- `patterns[]`: list of valid assignment structures (mandatory fields, acceptable values)

## Bypass mechanism for lower environments

The `BYPASS_ORG_DROOL_RULE` environment variable (default `false`) allows non-ORM services to create organisational role assignments without matching Drools rules. This supports integration testing in preview/AAT/demo but is always `false` in production.

(`application.yaml:181`)

## Performance characteristics

<!-- CONFLUENCE-ONLY: LLD states RAS should handle up to 30 calls/sec for GET /actors/{actorId} from CCD data store (target: 40 calls/sec with 33% headroom). RAS has been performance-tested for up to 2000 max role assignments per single user; beyond that, performance may degrade. not verified in source -->

## Error codes

| HTTP Status | Meaning |
|-------------|---------|
| 201 | Assignment(s) created successfully |
| 200 | Query or bulk-delete succeeded |
| 204 | Single/reference delete succeeded |
| 304 | ETag match (no changes since last retrieval) |
| 400 | Malformed request body |
| 401 | Missing or invalid `Authorization` header |
| 403 | Missing or invalid `ServiceAuthorization` header / caller not in S2S list |
| 404 | Assignment ID not found (for DELETE by UUID) |
| 422 | Drools validation rejected the assignment request |

**Error response shape**:

```json
{
  "errorCode": "422",
  "status": "UNPROCESSABLE_ENTITY",
  "errorMessage": "Unprocessable entity as request has been rejected",
  "timeStamp": "2024-01-01 14:02:47.071"
}
```

## Custom media types

The service uses versioned vendor media types for content negotiation:

| Constant | Value |
|----------|-------|
| `V1.MediaType.CREATE_ASSIGNMENTS` | `application/vnd.uk.gov.hmcts.role-assignment-service.create-assignments+json;charset=UTF-8;version=1.0` |
| `V1.MediaType.DELETE_ASSIGNMENTS` | `application/vnd.uk.gov.hmcts.role-assignment-service.delete-assignments+json;charset=UTF-8;version=1.0` |
| `V1.MediaType.POST_DELETE_ASSIGNMENTS_BY_QUERY_REQUEST` | `application/vnd.uk.gov.hmcts.role-assignment-service.post-assignments-delete-request+json;charset=UTF-8;version=1.0` |
| `V1.MediaType.GET_ASSIGNMENTS` | `application/vnd.uk.gov.hmcts.role-assignment-service.get-assignments+json;charset=UTF-8;version=1.0` |
| `V1.MediaType.GET_ROLES` | `application/vnd.uk.gov.hmcts.role-assignment-service.get-roles+json;charset=UTF-8;version=1.0` |
| `V1.MediaType.POST_ASSIGNMENTS` | `application/vnd.uk.gov.hmcts.role-assignment-service.post-assignment-query-request+json;charset=UTF-8;version=1.0` |
| `V2.MediaType.POST_ASSIGNMENTS` | `application/vnd.uk.gov.hmcts.role-assignment-service.post-assignment-query-request+json;charset=UTF-8;version=2.0` |

(`V1.java`, `V2.java`)

## Examples

### role_assignment table schema (real source)

```sql
// Source: apps/am/am-role-assignment-service/src/main/resources/db/migration/V1_1__init_tables.sql
CREATE TABLE role_assignment(
    id uuid NOT NULL,
    actor_id_type text NOT NULL,
    actor_id text NOT NULL,
    role_type text NOT NULL,
    role_name text NOT NULL,
    classification text NOT NULL,
    grant_type text NOT NULL,
    role_category text NULL,
    read_only bool NOT NULL,
    begin_time timestamp NULL,
    end_time timestamp NULL,
    "attributes" jsonb NOT NULL,
    created timestamp NOT NULL,
    authorisations _text NULL,
    CONSTRAINT role_assignment_pkey PRIMARY KEY (id)
);
```

### Role config JSON — case-allocator ORGANISATION pattern (real source)

```json
// Source: apps/am/am-role-assignment-service/src/main/resources/roleconfig/role_common.json
{
  "name": "case-allocator",
  "label": "Case Allocator",
  "description": "Case Allocator role for judicial users",
  "category": "JUDICIAL",
  "substantive": false,
  "type": "ORGANISATION",
  "patterns": [
    {
      "roleType": {
        "mandatory": true,
        "values": ["ORGANISATION"]
      },
      "grantType": {
        "mandatory": true,
        "values": ["STANDARD"]
      },
      "classification": {
        "mandatory": true,
        "values": ["PUBLIC", "PRIVATE"]
      },
      "attributes": {
        "jurisdiction": {
          "mandatory": true
        }
      }
    }
  ]
}
```

The `validate_role_assignment_against_patterns` Drools rule looks up this config using composite key `(roleName="case-allocator", category="JUDICIAL", type="ORGANISATION")` and validates the incoming assignment's fields against the pattern constraints.

### Rejection fallback rule (real source, salience -1000)

```drool
// Source: apps/am/am-role-assignment-service/src/main/resources/validationrules/core/reject-unapproved-role-assignments.drl
rule "reject_unapproved_create_role_assignments"
salience -1000
when
    $ra: RoleAssignment(status in ( Status.CREATE_REQUESTED, Status.CREATE_APPROVED))
then
    logMsg("Rule : reject_unapproved_create_role_assignments");
    $ra.setStatus(Status.REJECTED);
    $ra.log("Create not approved by any rule, hence rejected  : reject_unapproved_create_role_assignments");
    update($ra);
end;
```

## OpenAPI spec

The published OpenAPI spec for RAS is available in `platops/cnp-api-docs/`. The spec is generated by the `SwaggerPublisher` integration test which writes to `/tmp/openapi-specs.json` and is published via CI to `cnp-api-docs`.

## See also

- [Overview](../explanation/overview.md) — conceptual background on role types, grant types, and the AM platform; explains the semantics behind each enumerated value
- [Role Assignment Lifecycle](../explanation/role-assignment-lifecycle.md) — the full create/delete/expiry state machine, database schema, and ETag caching detail
- [Drools Rules](../explanation/drools-rules.md) — how the Drools validation pipeline works, including the two-stage approval and fallback rejection
- [Query Role Assignments](../how-to/query-role-assignments.md) — practical guide with worked examples for the query and delete-by-query endpoints
