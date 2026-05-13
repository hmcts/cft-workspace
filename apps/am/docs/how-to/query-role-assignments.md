---
title: Query Role Assignments
topic: role-lifecycle
diataxis: how-to
product: am
audience: both
sources:
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/controller/endpoints/QueryAssignmentController.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/model/QueryRequest.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/model/MultipleQueryRequest.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/service/queryroles/QueryRoleAssignmentOrchestrator.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/data/RoleAssignmentEntitySpecifications.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/domain/service/common/PersistenceService.java
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/util/ValidationUtil.java
  - am-role-assignment-service:src/main/resources/application.yaml
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "1386808542"
    title: "POST  /am/role-assignments/query"
    last_modified: "unknown"
    space: "AM"
  - id: "1496583644"
    title: "POST /am/role-assignments/query(V2)"
    last_modified: "unknown"
    space: "AM"
  - id: "1504216881"
    title: "POST /am/role-assignments/query/delete"
    last_modified: "unknown"
    space: "AM"
  - id: "1549244580"
    title: "Introduction - Role Assignment Services (RAS) 2.0 & 2.1"
    last_modified: "unknown"
    space: "AM"
confluence_checked_at: "2026-05-13T12:00:00Z"
---

## TL;DR

- `POST /am/role-assignments/query` retrieves role assignments matching filter criteria; v1 accepts a single query, v2 accepts multiple queries ORed together.
- Filter by `actorId`, `roleName`, `roleType`, `grantType`, `classification`, `roleCategory`, `attributes`, `validAt`, `authorisations`, `hasAttributes`, and `readOnly`.
- Pagination is controlled via **request headers** (`pageNumber`, `size`, `sort`, `direction`), not query parameters.
- Default page size is 20; default sort is `roleName` ascending with a secondary sort by `id` for deterministic ordering.
- Each `QueryRequest` must contain at least one non-empty filter field; an entirely empty query returns a 400 Bad Request.
- Requires both `Authorization` (OIDC JWT) and `ServiceAuthorization` (S2S) headers; your S2S client must be in the RAS authorised services list.

## Prerequisites

- A valid OIDC access token for the `Authorization` header.
- A valid S2S token from an authorised service. The default list in `application.yaml:127` includes: `ccd_gw`, `am_role_assignment_service`, `am_org_role_mapping_service`, `am_role_assignment_refresh_batch`, `xui_webapp`, `aac_manage_case_assignment`, `ccd_data`, `wa_workflow_api`, `wa_task_management_api`, `wa_task_monitor`, `wa_case_event_handler`, `iac`, `hmc_cft_hearing_service`, `ccd_case_disposer`, `sscs`, `fis_hmc_api`, `fpl_case_service`, `disposer-idam-user`, `civil_service`, `prl_cos_api`.
- The RAS base URL for your environment (e.g. `http://am-role-assignment-service-aat.service.core-compute-aat.internal`).

## Steps

### 1. Build the query request body

A v1 query request is a single `QueryRequest` object. Each field accepts a list of values (OR within a field); all fields are AND-ed together. At least one field must be non-empty or the API returns 400 (`ValidationUtil.java:200-204`).

```json
{
  "actorId": ["7c8de3d1-a1b2-4c3d-8e9f-123456789abc"],
  "roleType": ["CASE"],
  "validAt": "2024-06-01T10:00:00"
}
```

Available filter fields on `QueryRequest`:

| Field | Type | Description |
|-------|------|-------------|
| `actorId` | `List<String>` | User IDs (IDAM UUIDs) |
| `roleType` | `List<String>` | `CASE` or `ORGANISATION` |
| `roleName` | `List<String>` | e.g. `hearing-judge`, `case-allocator`, `tribunal-caseworker` |
| `classification` | `List<String>` | `PUBLIC`, `PRIVATE`, `RESTRICTED` (in increasing security level) |
| `grantType` | `List<String>` | `BASIC`, `SPECIFIC`, `STANDARD`, `CHALLENGED`, `EXCLUDED` |
| `roleCategory` | `List<String>` | `JUDICIAL`, `LEGAL_OPERATIONS`, `ADMIN`, `PROFESSIONAL`, `CITIZEN`, `SYSTEM`, `OTHER_GOV_DEPT`, `CTSC` |
| `validAt` | `LocalDateTime` | Point-in-time filter: returns assignments where `(beginTime IS NULL OR beginTime <= validAt) AND (endTime IS NULL OR endTime >= validAt)` |
| `attributes` | `Map<String, List<String>>` | Match against JSONB attributes (see attribute keys below). Supports `null` values to match records where the attribute key is absent. |
| `authorisations` | `List<String>` | Returns assignments where ANY queried authorisation matches (uses PostgreSQL `array_position`) |
| `hasAttributes` | `List<String>` | Returns assignments that have at least one of these attribute keys present (non-null) |
| `readOnly` | `Boolean` | Filter by read-only flag (`true` or `false`) |

#### Well-known attribute keys

The `attributes` map can contain any key, but these are the standard keys used by the platform:

<!-- CONFLUENCE-ONLY: attribute key descriptions from Confluence, not enforced in source code validation -->

| Attribute Key | Description |
|---------------|-------------|
| `jurisdiction` | CCD jurisdiction ID (e.g. `IA`, `CIVIL`, `PRIVATELAW`). One assignment record belongs to one jurisdiction. |
| `caseType` | CCD case type (e.g. `Asylum`, `CARE_SUPERVISION_EPO`) |
| `caseId` | 16-digit CCD case reference |
| `region` | LRD region ID |
| `primaryLocation` | LRD location ID (e.g. `765324`) |
| `contractType` | Judicial roles only: `SALARIED` or `FEEPAY` |

#### Null attribute matching

You can include `null` in an attribute value list to match records where that attribute key does not exist. For example, `"jurisdiction": [null, "IA"]` returns assignments where jurisdiction is either absent or equals `"IA"` (`RoleAssignmentEntitySpecifications.java:64-69`).

### 2. Choose the API version

<!-- CONFLUENCE-ONLY: Confluence states v1 will be deprecated in near future; v2 is the recommended version -->

**v1 (single query)** -- send a plain `QueryRequest`:

```
POST /am/role-assignments/query
Content-Type: application/json
```

The v1 response uses content type: `application/vnd.uk.gov.hmcts.role-assignment-service.post-assignment-query-request+json;charset=UTF-8;version=1.0`

**v2 (multiple queries)** -- wrap multiple `QueryRequest` objects in a `queryRequests` array. Results are the union (OR) of all queries. Requires the version-specific content type:

```
POST /am/role-assignments/query
Content-Type: application/vnd.uk.gov.hmcts.role-assignment-service.post-assignment-query-request+json;charset=UTF-8;version=2.0
```

```json
{
  "queryRequests": [
    {
      "actorId": ["7c8de3d1-a1b2-4c3d-8e9f-123456789abc"],
      "roleType": ["ORGANISATION"]
    },
    {
      "attributes": {"caseId": ["1234567890123456"]},
      "roleType": ["CASE"]
    }
  ]
}
```

The v2 endpoint validates that `queryRequests` is non-empty; if it is, the controller throws a `BadRequestException` immediately (`QueryAssignmentController.java:125-127`).

### 3. Set request headers

Pagination is controlled entirely through **request headers** -- this is unusual for a REST API but is how RAS is implemented (`QueryAssignmentController.java:79-82`).

| Header | Default | Description |
|--------|---------|-------------|
| `pageNumber` | `0` | Zero-based page index |
| `size` | `20` | Number of results per page (`application.yaml:175`) |
| `sort` | `roleName` | Field to sort by (`application.yaml:177`). A secondary sort by `id` is always appended for deterministic ordering. |
| `direction` | `ASC` | Sort direction (`ASC` or `DESC`) |
| `x-correlation-id` | (auto-generated) | Optional correlation ID for request tracing. If not provided, one is generated and propagated to downstream service calls. |

<!-- DIVERGENCE: Confluence says max page size is 1000 for V2 and returns 400 if exceeded, but PersistenceService.java:340 shows no max size enforcement — it accepts any positive integer. The 1000-record cap may have been removed or may be enforced at infrastructure level. Source wins. -->

<!-- CONFLUENCE-ONLY: Confluence V2 page states "Max size cannot be more than 1000 records. If provided size breaches the specified limit then API will return 400 Bad request." This is not currently enforced in source code. -->

### 4. Send the request

Complete v1 example -- find all CASE roles for a specific actor that are valid now:

```bash
curl -X POST \
  "${RAS_URL}/am/role-assignments/query" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "ServiceAuthorization: Bearer ${S2S_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "pageNumber: 0" \
  -H "size: 50" \
  -d '{
    "actorId": ["7c8de3d1-a1b2-4c3d-8e9f-123456789abc"],
    "roleType": ["CASE"],
    "validAt": "2024-06-01T10:00:00"
  }'
```

Complete v2 example -- find all organisational roles for specific actors OR all case roles for a case:

```bash
curl -X POST \
  "${RAS_URL}/am/role-assignments/query" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "ServiceAuthorization: Bearer ${S2S_TOKEN}" \
  -H "Content-Type: application/vnd.uk.gov.hmcts.role-assignment-service.post-assignment-query-request+json;charset=UTF-8;version=2.0" \
  -H "pageNumber: 0" \
  -H "size: 50" \
  -d '{
    "queryRequests": [
      {
        "actorId": ["eac110d5-0d07-402a-be1c-61e974a8851f"],
        "roleType": ["ORGANISATION"],
        "grantType": ["STANDARD"],
        "validAt": "2024-06-01T10:00:00",
        "attributes": {
          "jurisdiction": ["IA"],
          "primaryLocation": ["765324"]
        }
      },
      {
        "attributes": {"caseId": ["1234567890123456"]},
        "roleType": ["CASE"]
      }
    ]
  }'
```

To include human-readable role labels in the response, add `?includeLabels=true` as a query parameter (`QueryRoleAssignmentOrchestrator.java:84-97`).

### 5. Parse the response

A successful response returns HTTP 200 with a body containing role assignment records:

```json
{
  "roleAssignmentResponse": [
    {
      "id": "4927e2ec-0923-4d26-830c-e7186877a7d3",
      "actorIdType": "IDAM",
      "actorId": "eac110d5-0d07-402a-be1c-61e974a8851f",
      "roleType": "ORGANISATION",
      "roleName": "tribunal-caseworker",
      "classification": "PUBLIC",
      "grantType": "STANDARD",
      "roleCategory": "LEGAL_OPERATIONS",
      "readOnly": false,
      "beginTime": "2021-01-01T00:00:00Z",
      "endTime": "2023-01-01T00:00:00Z",
      "created": "2021-01-28T18:17:06.568049Z",
      "attributes": {
        "primaryLocation": "123456",
        "jurisdiction": "IA"
      },
      "authorisations": []
    }
  ]
}
```

The response includes:
- `Total-Records` header -- total count of matching assignments regardless of page size (`QueryRoleAssignmentOrchestrator.java:79-82`).
- `roleLabel` field is only populated when `?includeLabels=true` is passed; it is resolved from the static `RoleConfig` mapping.

#### Error response shape

When the query fails validation, the response body follows this structure:

```json
{
  "errorCode": "400",
  "status": "BAD_REQUEST",
  "errorMessage": "The query request must have either actorId or caseId if the request is empty",
  "timeStamp": "2024-06-01 10:00:00.000"
}
```

### 6. Query by case ID (common pattern)

To find all role assignments for a specific case:

```json
{
  "attributes": {
    "caseId": ["1234567890123456"]
  },
  "roleType": ["CASE"]
}
```

Attribute matching uses PostgreSQL `contains_jsonb` for non-null values (`RoleAssignmentEntitySpecifications.java:71-78`), so this is an efficient indexed query against the GIN-indexed `attributes` JSONB column.

### 7. Query organisational roles by location (common pattern)

To find all organisational roles for a specific jurisdiction and location:

```json
{
  "roleType": ["ORGANISATION"],
  "roleName": ["tribunal-caseworker", "senior-tribunal-caseworker"],
  "grantType": ["STANDARD"],
  "validAt": "2024-06-01T10:00:00Z",
  "attributes": {
    "jurisdiction": ["IA"],
    "primaryLocation": ["765324"]
  }
}
```

### 8. Using hasAttributes for existence checks

To find all assignments that have a `caseId` attribute (regardless of its value):

```json
{
  "queryRequests": [
    {
      "hasAttributes": ["caseId"]
    }
  ]
}
```

This is useful when you need to distinguish case-scoped assignments from organisational ones without knowing specific case IDs. The filter uses `jsonb_extract_path_text` to check for non-null values (`RoleAssignmentEntitySpecifications.java:158-172`).

## Related: Delete by query

The `POST /am/role-assignments/query/delete` endpoint uses the same query structure (v2 format with `queryRequests` wrapper) but deletes matching records. Each record is validated against Drools rules before deletion. Key safety considerations:

<!-- CONFLUENCE-ONLY: delete-by-query safety guidance from Confluence, not verified in source -->

- Always include `grantType: ["SPECIFIC"]` to avoid deleting conflicts of interest (EXCLUDED grants).
- Never delete professional case roles via this API -- those are maintained through the Assign Case Access APIs.
- Include explicit `roleCategory` and `roleName` filters to avoid over-broad deletion in production.

## Verify

1. Check the HTTP status is `200`.
2. Inspect the `Total-Records` response header -- it should match your expected count.
3. If you expect results but get an empty array, confirm:
   - Your S2S token belongs to an authorised service.
   - The `validAt` timestamp (if provided) falls within the assignments' `beginTime`/`endTime` window.
   - Attribute values are exact matches (the query uses containment, not partial matching).
   - Each `QueryRequest` has at least one non-empty field -- a fully empty query object causes a 400.
   - Attribute map keys are spelled correctly -- incorrect keys simply produce no matches rather than an error.

## See also

- [Role Assignment Lifecycle](../explanation/role-assignment-lifecycle.md) — explains the `validAt`, `grantType`, and `attributes` fields used in queries, and the `LIVE`/`EXPIRED` status model
- [RAS API Reference](../reference/api-role-assignment-service.md) — complete endpoint reference including all enumerated values, pagination headers, and custom media types
- [Overview](../explanation/overview.md) — conceptual background on role types, grant types, and attribute semantics that drive query filters
