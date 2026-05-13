---
title: Api Judicial
topic: jrd
diataxis: reference
product: rd
audience: both
sources:
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/controller/JrdElinkController.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/controller/request/RefreshRoleRequest.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/controller/request/UserSearchRequest.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/response/UserProfileRefreshResponse.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/response/AppointmentRefreshResponse.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/response/AuthorisationRefreshResponse.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/response/JudicialRoleTypeRefresh.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/service/impl/ElinkUserServiceImpl.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/repository/ProfileRepository.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/validator/ElinksRefreshUserValidator.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/util/RequestUtils.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/versions/V2.java
  - rd-judicial-api:src/main/resources/application.yaml
status: needs-fix
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/rd/rd-judicial-api/src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/feign/ElinksFeignClient.java
  - apps/rd/rd-judicial-api/src/main/resources/application.yaml
confluence:
  - id: "1675770345"
    title: "Specific Scenarios for JRD Type Ahead API"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1518669214"
    title: "Specific Scenarios for JRD Refresh Role API (for IAC Judges)"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1838620475"
    title: "Judicial Reference Data - eLinks Load"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1114964477"
    title: "Judicial Reference Data - HLSA"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1552149357"
    title: "Judicial Reference Data - Master Reference Data Requirements"
    last_modified: "unknown"
    space: "RTRD"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- JRD (Judicial Reference Data) API exposes judicial office holder profiles, appointments, authorisations, and roles at `rd-judicial-api` (port 8093).
- Two public endpoints: `POST /refdata/judicial/users/search` (type-ahead search) and `POST /refdata/judicial/users` (bulk profile refresh).
- Search requires only a valid IDAM token; refresh requires `jrd-system-user` or `jrd-admin` role.
- All responses use content type `application/vnd.jrd.api+json;Version=2.0`; response fields are snake_case (via `SnakeCaseStrategy`).
- Allowed S2S callers: `rd_judicial_api`, `am_org_role_mapping_service`, `iac`, `xui_webapp`.
- Profiles are keyed by `personal_code` (varchar 32); SIDAM ID and Azure AD `object_id` are secondary identifiers. eLinks does not guarantee uniqueness of `object_id`.

## Public endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/refdata/judicial/users/search` | Valid IDAM token (no role restriction) | Type-ahead search for judicial profiles |
| POST | `/refdata/judicial/users` | `jrd-system-user` or `jrd-admin` | Bulk refresh of judicial profiles with appointments/authorisations |

## POST /refdata/judicial/users/search

Searches active judicial profiles by name (minimum 3 characters), optionally filtered by service code and location.

### Request body

```json
{
  "searchString": "Smith",
  "serviceCode": "BFA1",
  "location": "366559"
}
```

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| `searchString` | string | Yes | Regex: `^[(a-zA-Z0-9 )\p{L}\p{N}''-]{3,}` | Min 3 chars. Allows letters, digits, spaces, Unicode letters/numbers, apostrophe, hyphen. No other special characters. Input is trimmed and lowercased before query. |
| `serviceCode` | string | No | Regex: `[a-zA-Z0-9]+` | Trimmed and lowercased. Filters via `judicial_service_code_mapping` and `judicial_location_mapping`. |
| `location` | string | No | Regex: `[a-zA-Z0-9]+` | Trimmed and lowercased. Filters by location ID. |

### Response body

Returns `List<UserSearchResponseWrapper>`:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Title (e.g. "Mr Justice") |
| `known_as` | string | Known-as name |
| `surname` | string | Surname |
| `full_name` | string | Full name |
| `email_id` | string | Ejudiciary email address |
| `sidam_id` | string | SIDAM user ID |
| `initials` | string | Initials |
| `post_nominals` | string | Post-nominals (e.g. "KC") |
| `personal_code` | string | Primary key identifier |

### Search query behaviour

The underlying JPQL query (`ProfileRepository.java:19-45`) joins profile to appointment to authorisation to location-mapping. It only returns profiles where:
- `active_flag = true`
- Appointment `end_date` is null or in the future
- Authorisation `end_date` is null or in the future

When `serviceCode` is provided, the service first looks up ticket codes from `judicial_service_code_mapping` for that service code, then passes them to the repository query. A configurable list of "search service codes" (`search.serviceCode` in application.yaml, default: `bfa1,bba3,aaa6,aaa7,aba5,aba3`) is also passed to the repository to control which service codes participate in location-based filtering.

### Search scenarios (expected behaviour)

<!-- CONFLUENCE-ONLY: not verified in source -->

| Condition | Result |
|-----------|--------|
| Both service code and location provided (Courts) | 200 with matches for given location + service code |
| Both service code and location provided (Tribunal) | 200 with empty list |
| Authorisation AND appointment both expired | 200 with empty list |
| Appointment valid but authorisation expired | 200 with empty list |
| Profile exists but no appointments or authorisations | 200 with matches (profile returned) |
| `object_id` is null for the user | 200 with empty list |
| Search string < 3 characters | 400 Bad Request |
| Special characters other than apostrophe/hyphen | 400 Bad Request |
| Unauthorised user | 403 |
| Authentication failure | 401 |

### Error responses

| HTTP Status | Condition |
|-------------|-----------|
| 400 | `searchString` missing, empty, < 3 chars, or contains disallowed characters |
| 400 | `serviceCode` or `location` contains special characters |
| 401 | User authentication failed |
| 403 | Unauthorized S2S caller |
| 500 | Internal server error |

## POST /refdata/judicial/users

Bulk refresh endpoint returning full profiles with nested appointments, authorisations, and roles. Used primarily by AM (`am_org_role_mapping_service`) for role-mapping.

### Request body

```json
{
  "ccdServiceName": "IA",
  "object_ids": null,
  "sidam_ids": null,
  "personal_code": null
}
```

<!-- DIVERGENCE: Confluence and the draft previously used snake_case "ccd_service_name" for the JSON key, but source (RefreshRoleRequest.java:18) shows @JsonProperty("ccdServiceName") — camelCase. Source wins. -->

Exactly one of the four parameters must be populated (`ElinksRefreshUserValidator`):

| Field | JSON key | Type | Notes |
|-------|----------|------|-------|
| `ccdServiceNames` | `ccdServiceName` | string | CCD service name (single value only); triggers LRD lookup and ticket-code routing. Cannot be comma-separated or "ALL". |
| `objectIds` | `object_ids` | string[] | Azure AD object IDs |
| `sidamIds` | `sidam_ids` | string[] | SIDAM user IDs |
| `personalCodes` | `personal_code` | string[] | JRD personal codes (primary key) |

### Refresh validation rules

The `ElinksRefreshUserValidator` enforces:
- Exactly one parameter must be non-empty (error: "At a time only one param should be allowed of ccdServiceName, Sidam_ids, Object_Ids or Personal_Codes")
- `ccdServiceName` cannot contain commas or be "ALL" (error: "Comma Separated List and ALL Keyword is not allowed")
- At least one parameter must be provided (error: "Atleast one param should be passed,empty/null is not allowed")
- Empty strings and nulls within list parameters are filtered out before evaluation

### Request headers (pagination)

| Header | Type | Default | Notes |
|--------|------|---------|-------|
| `page_size` | integer | 200 | Max profiles per page (`${REFRESH_PAGE_SIZE}`) |
| `page_number` | integer | 0 | Zero-based page index; must be >= 0 |
| `sort_direction` | string | ASC | `ASC` or `DESC` (validated via Spring `Sort.Direction`) |
| `sort_column` | string | `objectId` | Must be a valid field name on the `UserProfile` entity class (validated via reflection). Examples: `personalCode`, `sidamId`, `emailId`, `fullName`, `surName`, `objectId` |

### Response body

Returns `List<UserProfileRefreshResponse>` with a `total_records` response header indicating the total count across all pages.

#### UserProfileRefreshResponse

| Field | Type | Description |
|-------|------|-------------|
| `sidam_id` | string | SIDAM user ID |
| `object_id` | string | Azure AD object ID |
| `known_as` | string | Known-as name |
| `surname` | string | Surname |
| `full_name` | string | Full name |
| `post_nominals` | string | Post-nominals |
| `email_id` | string | Ejudiciary email address |
| `personal_code` | string | Primary key |
| `title` | string | Title |
| `initials` | string | Initials |
| `retirement_date` | string | Format `yyyy-MM-dd` |
| `active_flag` | string | "true" or "false" (serialised as string) |
| `deleted_flag` | string | "true" or "false" (serialised as string) |
| `appointments` | array | See AppointmentRefreshResponse |
| `authorisations` | array | See AuthorisationRefreshResponse |
| `roles` | array | See JudicialRoleTypeRefresh |

<!-- DIVERGENCE: Draft stated active_flag and deleted_flag are boolean, but source (UserProfileRefreshResponse.java:44-46) declares them as String fields. The service converts Boolean domain values via String.valueOf(). Source wins. -->

#### AppointmentRefreshResponse

| Field | Type | Description |
|-------|------|-------------|
| `base_location_id` | string | eLinks base location ID |
| `epimms_id` | string | EPIMMS location ID |
| `cft_region_id` | string | CFT/HMCTS region ID (field name `cftRegionID`) |
| `cft_region` | string | Region description (from `RegionType.regionDescEn`) |
| `is_principal_appointment` | string | "true"/"false" (serialised as string) |
| `appointment` | string | Appointment mapping name |
| `appointment_type` | string | Appointment type |
| `service_codes` | string[] | Fetched from `judicial_location_mapping` by `base_location_id` |
| `start_date` | string | Format `yyyy-MM-dd` |
| `end_date` | string | Format `yyyy-MM-dd`, nullable |
| `appointment_id` | string | Unique appointment identifier |
| `role_name_id` | string | Role name ID |
| `type` | string | Type |
| `contract_type_id` | string | Contract type ID |

#### AuthorisationRefreshResponse

| Field | Type | Description |
|-------|------|-------------|
| `jurisdiction` | string | Jurisdiction name |
| `ticket_description` | string | Maps from `lower_level` in domain model |
| `ticket_code` | string | Ticket code |
| `service_codes` | string[] | Derived from `judicial_service_code_mapping` by ticket code |
| `start_date` | string | Format `yyyy-MM-dd` |
| `end_date` | string | Format `yyyy-MM-dd`, nullable |
| `appointment_id` | string | Linked appointment ID (nullable since V1_6 migration) |
| `authorisation_id` | string | Authorisation identifier |
| `jurisdiction_id` | string | Jurisdiction ID |

#### JudicialRoleTypeRefresh (roles)

| Field | Type | Description |
|-------|------|-------------|
| `jurisdiction_role_name` | string | Role title (JSON key overrides snake_case convention) |
| `jurisdiction_role_id` | string | Jurisdiction role name ID |
| `start_date` | string | Format `yyyy-MM-dd` |
| `end_date` | string | Format `yyyy-MM-dd`, nullable |

## Routing behaviour for ccdServiceName

When `ccdServiceName` is provided, the refresh endpoint follows this logic (`ElinkUserServiceImpl.java:153-205`):

1. Calls LRD at `/refdata/location/orgServices` to resolve the service name to service codes.
2. Looks up ticket codes from `judicial_service_code_mapping` via `ServiceCodeMappingRepository.fetchTicketCodeFromServiceCode`.
3. Special case: if the set of service codes contains `BBA2` (Special Tribunal CIC), routes to `fetchUserProfileByTicketCodes` instead of `fetchUserProfileByServiceNames` (`ElinkUserServiceImpl.java:220-222`).
4. Otherwise queries `ProfileRepository` joining through `judicial_location_mapping`.

### Location and region mapping

<!-- CONFLUENCE-ONLY: not verified in source -->

The refresh API populates CFT region and ePIMS IDs using two mapping tables:
- **`jrd_lrd_region_mapping`** — translates Judicial Office region to CFT region
- **`judicial_location_mapping`** — translates base location to ePIMS ID

For Tribunal base locations (e.g. 1030 "Immigration and Asylum First Tier"), ePIMS ID is null. For Court base locations (e.g. 1061 "Westminster Magistrates Court"), the ePIMS ID is populated from the mapping table.

If the JO Region ID is '0', the CFT region is null.

## Deduplication

The refresh response groups profiles by `email_id` (`ElinkUserServiceImpl.java:284-313`). If two `UserProfile` records share the same email address, their appointments, authorisations, and roles are merged (via `flatMap`) into a single response entry. Only the first profile's scalar fields (name, sidamId, objectId, etc.) are preserved.

## eLinks data source

<!-- CONFLUENCE-ONLY: not verified in source -->

JRD data originates from the eLinks judiciary middleware API (`${ELINKS_URL}`). Key characteristics:

- **Primary key**: `personal_code` (unique per JOH in eLinks)
- **Data freshness**: eLinks is populated by a nightly batch from the judicial HR system
- **Uniqueness**: eLinks does NOT guarantee uniqueness of `object_id` or email address across records (duplicate JOH records are possible)
<!-- REVIEW: The leaver grace period is NOT implemented in source code. ElinksApiJobScheduler.java and ElinksFeignClient.java show JRD still calls /leavers and /deleted endpoints separately and sets active_flag=false immediately. The 90-day grace period is a Confluence design target (page 1838620475), not current behaviour. See also judicial-users.md which explicitly states "This design is NOT yet implemented in source code." -->
- **Leaver grace period**: When a JOH leaves, they remain active in JRD for a configurable grace period (currently 90 days) to allow completion of in-flight work. During this period, appointment/authorisation/role end dates are extended.
- **Event publishing**: After each eLinks load, modified JOH SIDAM IDs are published to Azure Service Bus topic `rd-judicial-topic` (batch size configurable via `${JRD_DATA_PER_MESSAGE:50}`)
- **Deletion policy**: Deleted JOH profiles are retained for `${Del_Joh_Profiles_Years:7}` years before hard deletion

## Notable constraints

- Only profiles with a non-empty, non-null `object_id` appear in search responses (search returns empty for null object_id profiles).
- Per-appointment `service_codes` are fetched individually from `judicial_location_mapping` via `LocationMapppingRepository.fetchServiceCodefromLocationId` (no batch fetch), which may impact performance for large result sets.
- `ticket_description` in the authorisation response maps from `Authorisation.lowerLevel` in the domain model; the naming diverges between internal and API representations.
- Date format is globally `yyyy-MM-dd` (`application.yaml:49` via `spring.jackson.date-format`).
- The database schema is `dbjudicialdata` within database `dbjuddata`.
- `active_flag` and `deleted_flag` are serialised as strings ("true"/"false"), not JSON booleans.

## Configuration

Key application properties (`application.yaml`):

| Property | Default | Description |
|----------|---------|-------------|
| `refresh.pageSize` | 200 | Default page size for refresh endpoint |
| `refresh.sortColumn` | `objectId` | Default sort column for refresh |
| `search.serviceCode` | `bfa1,bba3,aaa6,aaa7,aba5,aba3` | Service codes used in search location filtering |
| `idam.s2s-authorised.services` | `rd_judicial_api,am_org_role_mapping_service,iac,xui_webapp` | Allowed S2S callers |
| `elinks.people.perPage` | 50 | eLinks pagination page size |
| `elinks.scheduler.cronExpression` | `* 55 15 * * *` | eLinks data load schedule (daily at 15:55) |
| `elinks.delJohProfilesYears` | 7 | Years before hard-deleting JOH profiles |
| `jrd.publisher.jrd-message-batch-size` | 50 | Messages per batch to ASB topic |
| `locationRefDataUrl` | `http://rd-location-ref-api-aat...` | LRD endpoint for service code resolution |

## OpenAPI spec

The published OpenAPI spec is available via the service's Swagger UI at `/swagger-ui/index.html` (port 8093). Internal eLinks pipeline endpoints (`/refdata/internal/elink/**`) are annotated `@Hidden` and excluded from the spec. These internal paths are also listed in `security.anonymousPaths` (no auth required for the eLinks ingest pipeline).

## Examples

### eLinks Feign client — upstream data source (`ElinksFeignClient.java`)

JRD populates its database from these four eLinks endpoints. The `Authorization: Token <key>` header is injected by `ElinksFeignInterceptorConfiguration` from Key Vault.

```java
// Source: apps/rd/rd-judicial-api/src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/feign/ElinksFeignClient.java
@FeignClient(name = "ElinksFeignClient", url = "${elinksUrl}",
        configuration = ElinksFeignInterceptorConfiguration.class)
public interface ElinksFeignClient {

    @GetMapping("/reference_data/location")
    Response getLocationDetails();

    @GetMapping("/people")
    Response getPeopleDetails(
            @RequestParam("updated_since") String updatedSince,
            @RequestParam("per_page") String perPage,
            @RequestParam("page") String page,
            @RequestParam("include_previous_appointments") boolean includePreviousAppointments);

    @GetMapping("/leavers")
    Response getLeaversDetails(
            @RequestParam("left_since") String updatedSince,
            @RequestParam("per_page") String perPage,
            @RequestParam("page") String page);

    @GetMapping("/deleted")
    Response getDeletedDetails(
            @RequestParam("deleted_since") String updatedSince,
            @RequestParam("per_page") String perPage,
            @RequestParam("page") String page);
}
```

### Key configuration (`application.yaml`)

```yaml
// Source: apps/rd/rd-judicial-api/src/main/resources/application.yaml
elinksUrl: ${ELINKS_URL:https://judiciary-middleware-futureehr.herokuapp.com/api/v5}
elinks:
  people:
    perPage: ${PER_PAGE:50}
    lastUpdated: ${LAST_UPDATED:2015-01-01}
  scheduler:
    cronExpression: ${CRON_EXPRESSION:* 55 15 * * *}
    enabled: ${SCHEDULER_ENABLED:false}
  delJohProfilesYears: ${Del_Joh_Profiles_Years:7}
  cleanElinksResponsesDays: ${Clean_Elinks_Responses_Days:30}
refresh:
  pageSize: ${REFRESH_PAGE_SIZE:200}
  sortColumn: ${REFRESH_SORT_COLUMN:objectId}
search:
  serviceCode: ${JRD_SEARCH_SERVICE_CODE:bfa1,bba3,aaa6,aaa7,aba5,aba3}
idam:
  s2s-authorised:
    services: ${JRD_S2S_AUTHORISED_SERVICES:rd_judicial_api,am_org_role_mapping_service,iac,xui_webapp}
locationRefDataUrl: ${LOCATION_REF_DATA_URL:http://rd-location-ref-api-aat.service.core-compute-aat.internal}
```

## See also

- [Judicial Users](../explanation/judicial-users.md) — explains the eLinks data pipeline, JOH lifecycle, pagination risk, and ASB publishing in depth
- [API Location](api-location.md) — LRD endpoint reference; JRD calls `/refdata/location/orgServices` when `ccdServiceName` is supplied in the refresh request
- [Register as S2S Caller](../how-to/register-as-s2s-caller.md) — how to get a new service added to JRD's `JRD_S2S_AUTHORISED_SERVICES` allowlist
- [Glossary](glossary.md) — definitions of eLinks, JOH, personal_code, SIDAM ID, ticket_code, and epimms_id
