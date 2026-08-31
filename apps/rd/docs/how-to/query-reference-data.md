---
title: Query Reference Data
topic: overview
diataxis: how-to
product: rd
audience: both
sources:
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/internal/OrganisationInternalController.java
  - rd-professional-api:src/main/resources/application.yaml
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/controller/JrdElinkController.java
  - rd-judicial-api:src/main/resources/application.yaml
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/controllers/LrdApiController.java
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/controllers/LrdCourtVenueController.java
  - rd-location-ref-api:src/main/resources/application.yaml
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/domain/CourtVenue.java
  - rd-location-ref-api:src/main/resources/db/migration/V1_34__alter_court_venue_add_service_code_composite_pk.sql
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/repository/CourtVenueRepository.java
  - rd-caseworker-ref-api:src/main/resources/application.yaml
  - rd-commondata-api:src/main/resources/application.yaml
  - rd-commondata-api:src/main/java/uk/gov/hmcts/reform/cdapi/controllers/CaseFlagApiController.java
  - rd-commondata-api:src/main/java/uk/gov/hmcts/reform/cdapi/controllers/CrdApiController.java
  - rd-caseworker-ref-api:src/main/java/uk/gov/hmcts/reform/cwrdapi/controllers/StaffRefDataController.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/versions/V2.java
  - rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/repository/ProfileRepository.java
  - cnp-flux-config:apps/rd/rd-professional-api/prod.yaml
  - cnp-flux-config:apps/rd/rd-judicial-api/prod.yaml
  - cnp-flux-config:apps/rd/rd-location-ref-api/prod.yaml
  - cnp-flux-config:apps/rd/rd-caseworker-ref-api/prod.yaml
  - cnp-flux-config:apps/rd/rd-commondata-api/prod.yaml
  - cnp-flux-config:apps/rd/rd-user-profile-api/prod.yaml
status: needs-fix
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "1875617144"
    title: "Getting Organisation Details - rd-professional-api vs Prepopulate"
    last_modified: "unknown"
    space: "RRFM"
  - id: "1525457846"
    title: "GET: refdata/location/court-venues/venue-search?search-string=< search-string >&court-type-id=<court-type-id>"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1487520358"
    title: "Reference Data Artefacts - Data Model, Schema and Swagger links"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1904127333"
    title: "Location Reference Data API Usage Report"
    last_modified: "2026-05-13"
    space: "DTSRD"
  - id: "1915163667"
    title: "Location Reference Data - Changes to Venue data model"
    last_modified: "2026-08-01"
    space: "RTRD"
confluence_checked_at: "2026-08-20T00:00:00Z"
sources_sha:
  "rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/internal/OrganisationInternalController.java": "2021f547d82578c6748fd13cdbb8d815576ba3a3"
  "rd-professional-api:src/main/resources/application.yaml": "8501e4e7406318653bae352c04d5e03c1944a2cf"
  "rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/controller/JrdElinkController.java": "c3ba638268aac0e7dc990f941f1a958cdfaf09fb"
  "rd-judicial-api:src/main/resources/application.yaml": "91db0edf4a57e5899d31861797cf690cc11b61af"
  "rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/controllers/LrdApiController.java": "d2cbd131694a4e7335b94fc9f5b9d1c625b6aa66"
  "rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/controllers/LrdCourtVenueController.java": "d2cbd131694a4e7335b94fc9f5b9d1c625b6aa66"
  "rd-location-ref-api:src/main/resources/application.yaml": "0348cf42d7f36f5959fa7b671eebd32282f7fcfa"
  "rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/domain/CourtVenue.java": "d2cbd131694a4e7335b94fc9f5b9d1c625b6aa66"
  "rd-location-ref-api:src/main/resources/db/migration/V1_34__alter_court_venue_add_service_code_composite_pk.sql": "d2cbd131694a4e7335b94fc9f5b9d1c625b6aa66"
  "rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/repository/CourtVenueRepository.java": "d2cbd131694a4e7335b94fc9f5b9d1c625b6aa66"
  "rd-caseworker-ref-api:src/main/resources/application.yaml": "7f0f71f1b67983565653410fb473aefea4d925f9"
  "rd-commondata-api:src/main/resources/application.yaml": "94c35993b5eda2a490b168dcd5414eaa5f4e748b"
  "rd-commondata-api:src/main/java/uk/gov/hmcts/reform/cdapi/controllers/CaseFlagApiController.java": "713a8d70241032382965f812dcb7bb71e6b3a816"
  "rd-commondata-api:src/main/java/uk/gov/hmcts/reform/cdapi/controllers/CrdApiController.java": "a1f480e957736aee6b3134630037b5613d091de8"
  "rd-caseworker-ref-api:src/main/java/uk/gov/hmcts/reform/cwrdapi/controllers/StaffRefDataController.java": "797ed17a96dc04579f100997ce7ad8ee5e6af8a6"
  "rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/versions/V2.java": "6decfd56865ff02585736a9b0341dc9fdeb753d4"
  "rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/repository/ProfileRepository.java": "8274b9f6ad00f83172a55e3de7bc98974682ce37"
  "cnp-flux-config:apps/rd/rd-professional-api/prod.yaml": "c67cf966e5955e7ef1b81975ae02778894c26148"
  "cnp-flux-config:apps/rd/rd-judicial-api/prod.yaml": "d42ed980a7c78386cf64189c9ed4adb7e920bfbb"
  "cnp-flux-config:apps/rd/rd-location-ref-api/prod.yaml": "2f4fb694e1ffd5eb7aa6cf667450c51f9cc459fb"
  "cnp-flux-config:apps/rd/rd-caseworker-ref-api/prod.yaml": "d42ed980a7c78386cf64189c9ed4adb7e920bfbb"
  "cnp-flux-config:apps/rd/rd-commondata-api/prod.yaml": "d42ed980a7c78386cf64189c9ed4adb7e920bfbb"
  "cnp-flux-config:apps/rd/rd-user-profile-api/prod.yaml": "d42ed980a7c78386cf64189c9ed4adb7e920bfbb"
---

## TL;DR

- Reference Data is split across independent APIs: PRD (organisations/users), JRD (judicial profiles), LRD (court locations), CRD (caseworker profiles), and Common Data (flags/categories).
- Every call requires both an S2S token (`ServiceAuthorization` header) and an IDAM bearer token (`Authorization` header) — some PRD endpoints are S2S-only.
- Your service must be on the target API's `s2s-authorised.services` allowlist; adding a new caller requires a config change and redeployment. Production allowlists are managed via Flux config environment overrides (e.g. `LRD_S2S_AUTHORISED_SERVICES`).
- Pagination style varies: PRD uses 1-based `page`/`size` params or keyset (`searchAfter` UUID); JRD uses `page_size`/`page_number` headers; LRD returns all matching results (no pagination on most endpoints).
- LRD venue-search validates `search-string` via regex `^[A-Za-z0-9_@.,'&() -]{3,}$` — minimum 3 characters, alphanumeric plus limited special characters.
- All response JSON uses snake_case keys.

## Prerequisites

1. Your service has an S2S microservice name registered with `service-auth-provider` (i.e. you can generate S2S tokens).
2. Your service's microservice name is on the target RD API's `s2s-authorised.services` list. Contact the RD team if not.
3. You have an IDAM client configured to obtain user tokens (or system-user tokens for backend-to-backend calls).

## Choose the right API

| Data needed | API | Base path | Port |
|---|---|---|---|
| Solicitor organisations, PUI users, PBAs | PRD (`rd-professional-api`) | `/refdata/internal/v1/organisations` or `/refdata/external/v1/organisations` | 8090 |
| Judicial office holders, appointments, authorisations | JRD (`rd-judicial-api`) | `/refdata/judicial/users` | 8093 |
| Court venues, building locations, service codes, regions | LRD (`rd-location-ref-api`) | `/refdata/location/` | 8099 |
| Caseworker profiles, skills, locations | CRD (`rd-caseworker-ref-api`) | `/refdata/case-worker/` | 8095 |
| Case flags, categories, list-of-values | Common Data (`rd-commondata-api`) | `/refdata/commondata/` | 4550 |

## Set up authentication

### 1. Obtain an S2S token

Call `service-auth-provider-api` to lease a one-time token for your microservice name:

```http
POST /lease
Host: <S2S_URL>
Content-Type: application/json

{
  "microservice": "your_service_name",
  "oneTimePassword": "<TOTP from your S2S secret>"
}
```

The response body is the raw JWT string.

### 2. Obtain an IDAM bearer token

Use the standard OAuth2 client-credentials or authorization-code flow against `${OPEN_ID_API_BASE_URI}` to get a user or system-user access token.

### 3. Attach both tokens to every request

```http
GET /refdata/location/court-venues?epimms_id=123456
Authorization: Bearer <idam-access-token>
ServiceAuthorization: Bearer <s2s-token>
```

S2S validation runs first. If your microservice is not in the target API's allowlist, you receive HTTP 403 before the IDAM token is even inspected.

## Query PRD (organisations and users)

### List organisations (internal, paginated)

```http
GET /refdata/internal/v1/organisations?status=ACTIVE&page=1&size=20
Authorization: Bearer <token with prd-admin role>
ServiceAuthorization: Bearer <s2s-token>
```

- `page` is 1-based (converted to 0-based internally — `SuperController.java:285-299`).
- Default page size: 10 (`${DEFAULTPAGESIZE:10}` in `application.yaml`).
- Response header `total_records` contains the total count.
- Response body includes `organisationIdentifier` (7-char alphanumeric, e.g. `A1B2C3D`), not UUID.

### Retrieve users by organisation

```http
GET /refdata/internal/v1/organisations/{orgId}/users?returnRoles=true
Authorization: Bearer <token with prd-admin or prd-aac-system role>
ServiceAuthorization: Bearer <s2s-token>
```

Callers with `prd-aac-system` role always receive only ACTIVE users (`ProfessionalUserInternalController.java:109-113`).

### Keyset pagination (refresh users)

For bulk sync, use the S2S-only refresh endpoint (no IDAM bearer required):

```http
GET /refdata/internal/v1/organisations/users?since=2024-01-01T00:00:00&pageSize=100&searchAfter=<last-user-uuid>
ServiceAuthorization: Bearer <s2s-token>
```

Page through by setting `searchAfter` to the last `userIdentifier` from the previous response.

## Query JRD (judicial profiles)

### Search by name (minimum 3 characters)

```http
POST /refdata/judicial/users/search
Authorization: Bearer <any valid IDAM token>
ServiceAuthorization: Bearer <s2s-token>
Content-Type: application/json
Accept: application/vnd.jrd.api+json;Version=2.0

{
  "searchString": "Smith",
  "serviceCode": "BBA3",
  "location": "231596"
}
```

No specific role required — any authenticated user can search.

### Refresh profiles (paginated, role-restricted)

```http
POST /refdata/judicial/users
Authorization: Bearer <token with jrd-system-user or jrd-admin role>
ServiceAuthorization: Bearer <s2s-token>
Content-Type: application/json
Accept: application/vnd.jrd.api+json;Version=2.0
page_size: 200
page_number: 0
sort_direction: ASC
sort_column: objectId

{
  "ccdServiceName": "Divorce"
}
```

- Exactly one of `ccdServiceName`, `object_ids`, `sidam_ids`, or `personal_code` must be supplied.
- Default page size: 200 (`${REFRESH_PAGE_SIZE:200}`).
- Response header `total_records` contains the total count.
- Response uses `@JsonNaming(SnakeCaseStrategy)` — all keys are snake_case.

## Query LRD (locations)

### Court venues by EPIMMS ID

```http
GET /refdata/location/court-venues?epimms_id=123456,789012
Authorization: Bearer <token>
ServiceAuthorization: Bearer <s2s-token>
```

Multiple EPIMMS IDs can be comma-separated. Since venues are now keyed per service, one building can return several rows — narrow with `&service_code=<code>` if you want a single service's venue.

### Court venues by service code

Two endpoints take a service code, and they differ in status filtering:

```http
GET /refdata/location/court-venues?service_code=ABA5          # only court_status='Open'
GET /refdata/location/court-venues/services?service_code=BBA3  # all statuses
```

`/court-venues/services` returns venues grouped by court type with the service metadata; `/court-venues?service_code=` returns the flat venue list.

### Venue search (partial string, min 3 chars)

```http
GET /refdata/location/court-venues/venue-search?search-string=Birm&service_code=ABA5&is_hearing_location=Y
Authorization: Bearer <token>
ServiceAuthorization: Bearer <s2s-token>
```

Searches across `site_name`, `court_name`, `postcode`, and `court_address` from the `court_venue` table.

**All available filter parameters:**

| Parameter | Required | Description |
|---|---|---|
| `search-string` | Yes | Min 3 chars. Validated against regex: `^[A-Za-z0-9_@.,'&() -]{3,}$`. Leading/trailing spaces trimmed. |
| `service_code` | No | Comma-separated list of service codes (e.g. `ABA5,AAA6`). Preferred over `court-type-id`. |
| `court-type-id` | No | Comma-separated list of court type IDs (e.g. `10,17`). **Deprecated** in favour of `service_code`; still widely used by ExUI. |
| `is_hearing_location` | No | `"Y"` or `"N"` |
| `is_case_management_location` | No | `"Y"` or `"N"` |
| `location_type` | No | `CTSC`, `NBC`, `Court`, `CCBC`, etc. |
| `is_temporary_location` | No | `"Y"` or `"N"` |

Only active courts (`court_status = 'Open'`) are returned.


**Note:** Expert UI calls this endpoint on every keystroke after the first 3 characters. In production (April 2026), this endpoint receives approximately 5,000+ calls per week from `xui_webapp` alone.

### Building locations

```http
GET /refdata/location/building-locations?epimms_id=123456
Authorization: Bearer <token>
ServiceAuthorization: Bearer <s2s-token>
```

Only one query parameter allowed at a time: `epimms_id` (CSV), `building_location_name`, `region_id`, or `cluster_id`.

### Service codes / org services

```http
GET /refdata/location/orgServices?serviceCode=ABA5
Authorization: Bearer <token>
ServiceAuthorization: Bearer <s2s-token>
```

Mutually exclusive params: `serviceCode`, `ccdCaseType`, or `ccdServiceNames` (comma-separated).

### Regions

```http
GET /refdata/location/regions?regionId=1
Authorization: Bearer <token>
ServiceAuthorization: Bearer <s2s-token>
```

Regions with `api_enabled=false` are excluded from results.

## Query CRD (caseworker profiles)

### Search caseworkers by name

```http
GET /refdata/case-worker/profile/search-by-name?search=Smith
Authorization: Bearer <token with cwd-admin or staff-admin role>
ServiceAuthorization: Bearer <s2s-token>
```

### Search caseworkers (advanced)

```http
GET /refdata/case-worker/profile/search?serviceCode=BBA3&location=123456
Authorization: Bearer <token with cwd-admin or staff-admin role>
ServiceAuthorization: Bearer <s2s-token>
```

### Fetch caseworker profiles by IDAM ID

```http
POST /refdata/case-worker/users/fetchUsersById
Authorization: Bearer <token>
ServiceAuthorization: Bearer <s2s-token>
Content-Type: application/json

{
  "userIds": ["uuid-1", "uuid-2"]
}
```

### List skills

```http
GET /refdata/case-worker/skill
Authorization: Bearer <token>
ServiceAuthorization: Bearer <s2s-token>
```

Returns the full skill taxonomy (skill categories and their associated skill codes).

## Query Common Data (flags and list-of-values)

### Retrieve case flags by service ID

```http
GET /refdata/commondata/caseflags/service-id=AAA6
Authorization: Bearer <token>
ServiceAuthorization: Bearer <s2s-token>
```

Returns all flag types (both party-level and case-level) configured for the specified service.

### Retrieve list-of-values by category

```http
GET /refdata/commondata/lov/categories/{categoryId}
Authorization: Bearer <token>
ServiceAuthorization: Bearer <s2s-token>
```

Where `{categoryId}` is the lookup category key (e.g. `HearingChannel`, `HearingSubChannel`, `CaseSubType`). Returns all active values for that category.

## Common patterns and gotchas

- **Mutually exclusive params**: LRD endpoints enforce single-parameter queries — passing more than one filter returns HTTP 400.
- **Boolean fields as strings**: LRD stores `is_hearing_location`, `is_case_management_location`, and `is_temporary_location` as `"Y"`/`"N"` strings, not booleans.
- **JRD media type is a response type, not a request requirement**: `application/vnd.jrd.api+json;Version=2.0` (`rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/versions/V2.java:12`) is declared as `produces` on the JRD mappings and never as `consumes` (`rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/controller/JrdElinkController.java:83`, `:127`). A `POST` with `Content-Type: application/json` is accepted; the reply comes back with the vendor type, so a client that only parses `application/json` responses has to be told to accept it.
- **PRD organisation identifiers**: Always 7-char alphanumeric (e.g. `A1B2C3D`), not UUIDs. The internal UUID PK is never exposed externally.
- **PRD external v2 requires high-level roles**: The `/refdata/external/v2/organisations` endpoint requires IDAM roles like `pui-organisation-manager`; normal case-working users cannot call it. To retrieve org details for the current user from a backend service, use the internal endpoint `/refdata/internal/v1/organisations/orgDetails/{userId}` with a `prd-admin` system-user token.
- **JRD profiles without objectId excluded**: `where (per.objectId != '' and per.objectId is not null)` is on all five refresh query variants — by object ID, by SIDAM ID, by personal code, by service code or ticket code, and by ticket code alone (`rd-judicial-api:src/main/java/uk/gov/hmcts/reform/judicialapi/elinks/repository/ProfileRepository.java:56`, `:69`, `:81`, `:95`, `:110`). No combination of request parameters will surface a profile whose object ID is blank, so a judge ingested from eLinks without one is present in the JRD database and absent from every refresh response.
- **CRD requires `cwd-admin` or `staff-admin` role**: Most CRD query endpoints restrict access to users with these IDAM roles. The caseworker sync endpoint (`/users/sync`) is S2S-only for inter-service use.
- **Common Data's baked-in allowlist is a single entry**: `${CRD_S2S_AUTHORISED_SERVICES:rd_commondata_api}` (`rd-commondata-api:src/main/resources/application.yaml:104`). Every other caller exists only in the deployed environment's override, and Common Data reuses the `CRD_` variable name that Caseworker Reference Data also uses — the two services set it to different values in their own HelmRelease files.
- **S2S allowlist is environment-specific**: the value in `application.yaml` is only the fallback default (PRD 8 entries at `rd-professional-api:src/main/resources/application.yaml:114`, JRD 4 at `rd-judicial-api:src/main/resources/application.yaml:117`, CRD 5 at `rd-caseworker-ref-api:src/main/resources/application.yaml:113`). Because each environment's list is maintained in its own file, a caller that works in AAT can still get 403 in production.
- **Venue-search regex validation**: The `search-string` parameter is validated against `^[A-Za-z0-9_@.,'&() -]{3,}$`. Strings with disallowed special characters (e.g. `#`, `%`, `*`) return 400 even if >= 3 chars.
- **LaunchDarkly feature flags**: All RD APIs use LaunchDarkly. The LRD API's flag is `lrd_location_api`. New endpoints may be toggled off in production until consuming services are ready.

## S2S allowlists (production)

Each service's production allowlist is the `*_S2S_AUTHORISED_SERVICES` value in its FluxCD HelmRelease overrides, which replaces the `application.yaml` default outright rather than adding to it:

| API | Environment Variable | Production Services | Source |
|---|---|---|---|
| PRD | `PRD_S2S_AUTHORISED_SERVICES` | `rd_professional_api`, `rd_user_profile_api`, `xui_webapp`, `finrem_payment_service`, `finrem_case_orchestration`, `finrem_citizen_ui`, `fpl_case_service`, `iac`, `aac_manage_case_assignment`, `divorce_frontend`, `civil_service`, `probate_backend`, `nfdiv_case_api`, `am_org_role_mapping_service`, `prl_cos_api`, `payment_app`, `et_cos`, `civil_general_applications` | `cnp-flux-config:apps/rd/rd-professional-api/prod.yaml:14` |
| JRD | `JRD_S2S_AUTHORISED_SERVICES` | `rd_judicial_api`, `am_org_role_mapping_service`, `iac`, `xui_webapp`, `ccd_data`, `sscs`, `sscs_bulkscan`, `fis_hmc_api`, `prl_cos_api`, `civil_service`, `sptribs_case_api`, `fpl_case_service`, `civil_general_applications`, `et_cos`, `idam-user-profile-bridge`, `finrem_case_orchestration`, `finrem_citizen_ui` | `cnp-flux-config:apps/rd/rd-judicial-api/prod.yaml:14` |
| LRD | `LRD_S2S_AUTHORISED_SERVICES` | `rd_location_ref_api`, `payment_app`, `rd_caseworker_ref_api`, `rd_judicial_api`, `ccd_data`, `xui_webapp`, `sscs`, `sscs_bulkscan`, `adoption_web`, `civil_service`, `prl_cos_api`, `fis_hmc_api`, `sptribs_case_api`, `iac`, `civil_general_applications`, `et_cos`, `probate_backend`, `finrem_case_orchestration`, `finrem_citizen_ui`, `pcs_api` | `cnp-flux-config:apps/rd/rd-location-ref-api/prod.yaml:11` |
| CRD | `CRD_S2S_AUTHORISED_SERVICES` | `rd_caseworker_ref_api`, `am_org_role_mapping_service`, `iac`, `xui_webapp`, `ccd_data`, `sscs`, `sscs_bulkscan`, `prl_cos_api`, `fpl_case_service`, `idam-user-profile-bridge`, `et_cos`, `rd_profile_sync`, `probate_backend`, `finrem_case_orchestration`, `finrem_citizen_ui` | `cnp-flux-config:apps/rd/rd-caseworker-ref-api/prod.yaml:35` |
| Common Data | `CRD_S2S_AUTHORISED_SERVICES` | `ccd_data`, `xui_webapp`, `sscs`, `sscs_bulkscan`, `cui_ra`, `prl_cos_api`, `civil_service`, `iac`, `sptribs_case_api`, `et_cos`, `probate_backend`, `finrem_case_orchestration`, `finrem_citizen_ui` | `cnp-flux-config:apps/rd/rd-commondata-api/prod.yaml:13` |
| User Profile | `PRD_S2S_AUTHORISED_SERVICES` | `rd_professional_api`, `rd_user_profile_api`, `rd_profile_sync`, `rd_caseworker_ref_api`, `idam-user-profile-bridge`, `et_cos`, `finrem_case_orchestration`, `finrem_citizen_ui` | `cnp-flux-config:apps/rd/rd-user-profile-api/prod.yaml:19` |

User Profile has the narrowest list and neither `xui_webapp` nor `ccd_data` is on it, so a front end that needs professional user details has to go through PRD rather than calling User Profile directly.

<!-- DIVERGENCE: Confluence "Reference Data Artefacts - Data Model, Schema and Swagger links" (id 1487520358) lists `pcs_api` on the LRD allowlist for AAT/Demo/ITHC/PerfTest only. It is on the production allowlist (cnp-flux-config:apps/rd/rd-location-ref-api/prod.yaml:11). Source wins. -->

## Verify

1. Confirm S2S access by calling the health endpoint (no auth required):
   ```bash
   curl https://rd-professional-api-aat.service.core-compute-aat.internal/health
   ```
2. Test an authenticated query:
   ```bash
   curl -H "Authorization: Bearer $IDAM_TOKEN" \
        -H "ServiceAuthorization: Bearer $S2S_TOKEN" \
        https://rd-location-ref-api-aat.service.core-compute-aat.internal/refdata/location/regions
   ```
   A 200 response with JSON region data confirms both tokens are valid and your service is on the allowlist. A 403 indicates your microservice is not in `s2s-authorised.services`.

## Migrate off `court_type_id`

**Shipped July 2026.** The `court_venue` table's unique key moved from `epimms_id + court_type_id` to `epimms_id + service_code`, and `court_type_id` / `court-type-id` are now marked deprecated in the OpenAPI metadata on both `/court-venues` and `/court-venues/venue-search`. They still work, but new integrations should filter by `service_code`:

```http
GET /refdata/location/court-venues?service_code=ABA5
GET /refdata/location/court-venues?epimms_id=123456&service_code=ABA5
GET /refdata/location/court-venues/venue-search?search-string=Birm&service_code=ABA5
```

Audit your codebase for `court_type` / `court-type-id` usage. Note that a venue may now appear once per service at the same `epimms_id`, so an `epimms_id`-only query can return more rows than it used to.

The wider V2 normalisation (separate name/address/contact entities, `/v2/` endpoints) is still design-only — see [API Location → V2](../reference/api-location.md#still-in-design--normalised-v2-model).

## See also

- [Register as S2S Caller](register-as-s2s-caller.md) — prerequisite: how to get your service added to the target API's S2S allowlist before you can make calls
- [API Professional](../reference/api-professional.md) — full PRD endpoint reference with request/response shapes, pagination conventions, and PBA status lifecycle
- [API Judicial](../reference/api-judicial.md) — full JRD endpoint reference including search query behaviour, refresh validation rules, and deduplication
- [API Location](../reference/api-location.md) — full LRD endpoint reference including parameter mutually-exclusivity rules, response shapes, the service-level venue change, and the V2 design
