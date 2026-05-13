---
title: Locations
topic: lrd
diataxis: explanation
product: rd
audience: both
sources:
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/domain/CourtVenue.java
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/domain/BuildingLocation.java
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/domain/Service.java
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/domain/Region.java
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/domain/Cluster.java
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/domain/ServiceToCcdCaseTypeAssoc.java
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/domain/CourtType.java
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/domain/CourtTypeServiceAssoc.java
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/controllers/LrdApiController.java
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/controllers/LrdCourtVenueController.java
  - rd-location-ref-api:src/main/java/uk/gov/hmcts/reform/lrdapi/repository/CourtVenueRepository.java
  - rd-location-ref-api:src/main/resources/db/migration/V1_1__init_tables.sql
  - rd-location-ref-api:src/main/resources/db/migration/V1_9__create_tables.sql
  - rd-location-ref-api:src/main/resources/db/migration/V1_31__alter_tables_add_column_court_venue.sql
  - rd-location-ref-api:src/main/resources/application.yaml
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/rd/rd-location-ref-api/src/main/resources/db/migration/V1_9__create_tables.sql
  - apps/rd/rd-location-ref-api/src/main/java/uk/gov/hmcts/reform/lrdapi/controllers/LrdCourtVenueController.java
  - apps/rd/rd-location-ref-data-load/src/main/resources/application-lrd-building-location-router.yaml
  - apps/rd/rd-location-ref-api/src/main/resources/application.yaml
confluence:
  - id: "1973487027"
    title: "Location Reference Data - Court Venue Changes V2"
    last_modified: "2026-05-07"
    space: "RTRD"
  - id: "1915163667"
    title: "Location Reference Data - Changes to Venue data model"
    last_modified: "2025-11-17"
    space: "RTRD"
  - id: "1460537506"
    title: "LRD Endpoints - Roles and Pre-Requisites for Access"
    last_modified: "2024-01-01"
    space: "RTRD"
  - id: "1904127333"
    title: "Location Reference Data API Usage Report"
    last_modified: "2026-05-01"
    space: "DTSRD"
  - id: "1552132135"
    title: "Location Reference Data - Master Reference Data requirements"
    last_modified: "2025-01-01"
    space: "RTRD"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- `rd-location-ref-api` (LRD) is a read-only Spring Boot REST API providing court building locations, court venues, service codes, and region/area hierarchies under the `/refdata/location` path prefix.
- Data is batch-loaded by the separate `rd-location-ref-data-load` Kubernetes CronJob from Azure Blob Storage CSVs sourced from the Master Reference Data (MRD) team; LRD itself exposes no write endpoints.
- `epimms_id` is the cross-service location identifier linking building locations to court venues and used by `rd-caseworker-ref-api` for caseworker location assignments.
- Service codes bridge LRD to CCD case types via `ServiceToCcdCaseTypeAssoc` (and court types via `CourtTypeServiceAssoc`), enabling payment services and HMC to resolve locations from a case type.
- Runs on port 8099, schema `locrefdata`, accessible to S2S-whitelisted services (18 in production) with no per-endpoint role restrictions.
- A V2 court venue API with normalised data model is in design (May 2026) but not yet implemented in source.

## Data model

LRD's domain model is organised around four core entities and two join concepts:

```
Region (1) ──┬──< BuildingLocation (many)
             │         │
             │         └──< CourtVenue (many, joined on epimms_id)
             │
             └──< CourtVenue (via region_id FK)

Cluster (1) ──< BuildingLocation | CourtVenue

Service ──< ServiceToCcdCaseTypeAssoc ──> CCD case types
```

### Building locations

`BuildingLocation` represents a physical HMCTS building. Key fields:

| Field | Type | Notes |
|-------|------|-------|
| `buildingLocationId` | PK (Long) | Surrogate key |
| `epimmsId` | varchar(16), unique, not null | The business key shared with `CourtVenue` |
| `buildingLocationName` | varchar(256) | Human-readable name |
| `buildingLocationStatus` | varchar | Open/Closed status |
| `region` | FK to `region` | Geographic region |
| `cluster` | FK to `cluster` | Geographic cluster |
| `area` | varchar(16) | Free-text zone indicator (not an FK) |
| `postcode` | varchar | Building postcode |
| `courtFinderUrl` | varchar | Link to Court Finder page |

A building can host multiple court venues. The one-to-many relationship is joined on `epimms_id` (`BuildingLocation.java:84-86`), not a traditional FK column, because both entities use `epimms_id` as their natural business key.

### Court venues

`CourtVenue` is a logical venue within a building. One building (identified by `epimms_id`) may contain multiple venues distinguished by `site_name` and `court_type_id`. The three-column unique constraint `(epimms_id, site_name, court_type_id)` enforces this (`CourtVenue.java:32`).

<!-- DIVERGENCE: Confluence (page 1552132135, query log item 5) says "The unique key is now changed, Court Type ID is now removed and service_code is added instead", but rd-location-ref-api:CourtVenue.java:32 still shows @UniqueConstraint(columnNames = {"epimms_id","site_name","court_type_id"}). Source wins. -->

Important boolean-like flags are stored as `varchar` with values `"Y"` or `"N"`:

| Flag field | Purpose |
|------------|---------|
| `isHearingLocation` | Venue can host hearings (consumed by HMC) |
| `isCaseManagementLocation` | Venue handles case management (consumed by XUI/CCD) |
| `isTemporaryLocation` | Temporary/pop-up venue |
| `isNightingaleCourt` | COVID-era Nightingale court |

Additional fields on CourtVenue include:

| Field | Type | Notes |
|-------|------|-------|
| `externalShortName` | varchar(80) | Short display name for external consumers (added V1_31) |
| `welshExternalShortName` | varchar(80) | Welsh variant of external short name (added V1_31) |
| `venueOuCode` | varchar(16) | Organisational Unit code for the venue |
| `courtLocationCode` | varchar(8) | Legacy court location code |
| `mrdBuildingLocationId` | varchar(16) | FK to MRD building (upstream identifier) |
| `mrdVenueId` | varchar(16) | MRD strategic venue identifier |
| `serviceUrl` | varchar(1024) | URL to the venue's service page |
| `factUrl` | varchar(1024) | URL to the Find a Court or Tribunal page |
| `parentLocation` | varchar(16) | Self-reference to a parent court venue |
| `openForPublic` | Boolean | Whether the venue is open to the public |
| `uprn` | varchar(16) | Unique Property Reference Number |
| `welshSiteName` | varchar(256) | Welsh variant of site name |
| `welshCourtAddress` | varchar(512) | Welsh variant of court address |
| `welshCourtName` | varchar(256) | Welsh variant of court name |
| `welshVenueName` | varchar(256) | Welsh variant of venue name |

The `locationType` field holds string values such as `CTSC`, `NBC`, `Court`, `CCBC` with no enum enforcement.

The `courtStatus` field controls visibility: most repository queries hardcode a `cv.courtStatus='Open'` filter (`CourtVenueRepository.java:18-20`). However, queries by `epimms_id` alone (`findByEpimmsIdIn` at line 12) return venues regardless of status. Soft deletes are achieved by setting `courtStatus` to `Close`; hard deletes require a Change Request to remove the record from the database.

### Court types

`CourtType` is a classification entity with fields `courtTypeId` (PK, varchar 16), `courtType` (description, not null), and `welshCourtType` (Welsh translation). Court types group venues by jurisdiction level (e.g., type 10 covers seven services, type 18 covers five). The entity links to services via `CourtTypeServiceAssoc`.

`CourtTypeServiceAssoc` maps a `courtType` to a `Service` via `service_code` and `court_type_id` FKs, enabling the court-venues-by-service-code endpoint to resolve which venues serve a given service. This is distinct from `ServiceToCcdCaseTypeAssoc` which maps services directly to CCD case type strings.

### Regions and clusters

`Region` has a PK `regionId` (varchar 16), a `description`, `welshDescription`, and an `apiEnabled` boolean. The `apiEnabled` flag (`Region.java:47-57`) silently excludes regions from API responses when set to `false` — this means a region may exist as an FK target on venues/buildings but be invisible via the regions endpoint.

`Cluster` is a secondary geographic grouping (e.g., "North West") below Region, with PK `cluster_id`, `clusterName`, and `welshClusterName`.

### Service codes and CCD case type mapping

The `Service` entity represents an organisational service line. Fields include `serviceCode` (unique, e.g. `ABA5`), `serviceDescription`, `serviceShortDescription`, plus FK references up an org hierarchy: `orgUnitId`, `businessAreaId`, `subBusinessAreaId`, `jurisdictionId`.

`ServiceToCcdCaseTypeAssoc` maps a service code to CCD case types with a composite unique constraint `(service_code, ccd_case_type)`. This mapping is how consuming services (particularly payments) resolve which LRD service code applies to a given CCD case type.

## API endpoints

All endpoints live under `/refdata/location` and require S2S + IDAM authentication. No `@Secured` role annotations are applied — any authenticated service can call any endpoint.

### Building locations

| Endpoint | Params | Notes |
|----------|--------|-------|
| `GET /refdata/location/building-locations` | `epimms_id` (csv), `building_location_name`, `region_id`, `cluster_id` | Only one param allowed at a time (`LrdApiController.java:162-184`) |
| `GET /refdata/location/building-locations/search?search=<str>` | `search` (min 3 chars) | Partial string search across building names (`LrdApiController.java:272-286`) |

### Court venues

| Endpoint | Params | Notes |
|----------|--------|-------|
| `GET /refdata/location/court-venues` | `epimms_id`, `court_type_id`, `region_id`, `cluster_id`, `court_venue_name`, `is_hearing_location`, `is_case_management_location`, `location_type`, `is_temporary_location` | `epimms_id` + `court_type_id` can coexist; all other params are mutually exclusive (`LrdCourtVenueController.java:120-162`) |
| `GET /refdata/location/court-venues/services?service_code=<code>` | `service_code` | Returns venues filtered by service code with court type metadata (`LrdCourtVenueController.java:206-218`) |
| `GET /refdata/location/court-venues/venue-search?search-string=<str>` | `search-string` (min 3 chars), optional: `court-type-id`, `is_hearing_location`, `is_case_management_location`, `location_type`, `is_temporary_location` | Partial match on `siteName`, `courtName`, `postcode`, `courtAddress` (`LrdCourtVenueController.java:253-304`) |

### Org services

| Endpoint | Params | Notes |
|----------|--------|-------|
| `GET /refdata/location/orgServices` | `serviceCode`, `ccdCaseType`, `ccdServiceNames` (comma-separated) | Mutually exclusive params; returns 400 if more than one supplied (`LrdApiController.java:106-120`) |

### Regions

| Endpoint | Params | Notes |
|----------|--------|-------|
| `GET /refdata/location/regions` | `regionId` or `region` (description) | Mutually exclusive; only returns regions where `apiEnabled=true` (`LrdApiController.java:222-234`) |

## How consumers use LRD

### S2S authorised services

LRD restricts access to a whitelist of S2S-authenticated services. The default list (from `application.yaml:95`) is `rd_location_ref_api, payment_app, rd_caseworker_ref_api, rd_judicial_api`. In production (via Flux config), the full list is:

`rd_location_ref_api`, `payment_app`, `rd_caseworker_ref_api`, `rd_judicial_api`, `ccd_data`, `xui_webapp`, `prl_cos_api`, `sscs`, `sscs_bulkscan`, `adoption_web`, `civil_service`, `civil_general_applications`, `sptribs_case_api`, `fis_hmc_api`, `et_cos`, `iac`, `probate_backend`

<!-- CONFLUENCE-ONLY: not verified in source -->
Additional services in AAT/non-prod only: `pcs_api`, `civil_rtl_export`.

### ExUI (xui_webapp)

ExUI is the heaviest consumer of LRD. In production it calls:
- `GET /refdata/location/orgServices` (~28,000 calls/week) to resolve service codes for case types being viewed
- `GET /refdata/location/court-venues/services` (~80,000 calls/week across service codes AAA6, AAA7, ABA3, ABA5, BFA1, BHA1) for location picker dropdowns
- `GET /refdata/location/court-venues/venue-search` (~5,300 calls/week) for typeahead venue search
- `GET /refdata/location/court-venues?epimms_id=<id>` (~22,000 calls/week) for venue detail display

### Hearings Management (HMC / fis_hmc_api)

HMC queries LRD to resolve hearing locations. `fis_hmc_api` calls:
- `GET /refdata/location/court-venues?epimms_id=<id>` (~21,400 calls/week) to get venue names, addresses, and location codes for hearing schedules
- `GET /refdata/location/court-venues/services?service_code=ABA5` for family private law hearing venues

### Civil Service

`civil_service` is one of the highest-volume consumers of the court-venues endpoint (~265,000 calls/month in peak periods), typically filtered by `court_type_id` and `location_type`.

### IAC (Immigration and Asylum)

`iac` calls `GET /refdata/location/court-venues/services?service_code=BFA1` (~31,000 calls/week) to resolve tribunal hearing venues.

### Caseworker Reference Data (CRD)

`rd-caseworker-ref-api` stores caseworker location assignments using `epimms_id` values that originate from LRD. CRD calls:
- `GET /refdata/location/orgServices?ccdServiceNames=<csv>` (~55,000 calls/week) to resolve service-to-location mappings for caseworker profiles

### Payment services

`payment_app` uses `GET /refdata/location/orgServices?ccdCaseType=<type>` (~14,000 calls/week across case types like Asylum, CIVIL, NFD, GrantOfRepresentation, Benefit) and `?serviceCode=<code>` (for AAA6, AAA7, ABA1, ABA5, ABA6, BFA1) to determine which service code applies to a case for fee and payment routing.

### Other consumers

- `sscs`: ~7,100 calls/week to court-venues by `epimms_id`
- `prl_cos_api`: ~3,700 calls/week to court-venues/services with service code ABA5
- `adoption_web`: ~577 calls/week to court-venues/services with service code ABA4
- `sptribs_case_api`: ~33 calls/week to court-venues filtered by region and hearing location; ~127 calls/month to regions

## Data loading

LRD is read-only at the API layer. All data arrives via the `rd-location-ref-data-load` Kubernetes CronJob, which:

1. Reads GPG-encrypted CSVs from Azure Blob Storage container `lrd-ref-data`
2. Transforms and validates records using Apache Camel routes
3. Writes directly to the `locrefdata` schema in PostgreSQL
4. Archives processed files to a separate container

### MRD source files

The upstream data source is the Master Reference Data (MRD) team, who provide versioned files on a monthly cadence (or more frequently for major changes). The files are:

| File | Target table | Load method |
|------|-------------|-------------|
| `BuildingLocation.csv` | `building_location` | Automated ingestion |
| `CourtVenue.csv` | `court_venue` | Automated ingestion |
| `CourtType.csv` | `court_type` | Static SQL insert scripts |
| `LRDRegion.csv` | `region` | Static SQL insert scripts |
| `Cluster.csv` | `cluster` | Static SQL insert scripts |
| `CourtTypeServiceAssoc.csv` | `court_type_service_assoc` | Static SQL insert scripts |

<!-- CONFLUENCE-ONLY: not verified in source -->
MRD timestamps use the format `dd-mm-yyyy hh:mm:ss` (UTC). Fields `mrdCreatedTime`, `mrdUpdatedTime`, and `mrdDeletedTime` track the upstream record lifecycle.

### Soft and hard deletes

Locations are never physically deleted by the batch loader. Instead:
- **Soft delete**: `buildingLocationStatus` set to `Close` (buildings) or `courtStatus` set to `Close` (venues). The record persists in the database but is filtered out by most API queries.
- **Hard delete**: Requires a formal Change Request to manually remove the record from the database.

<!-- CONFLUENCE-ONLY: not verified in source -->

### MRD field requirements vs source

Confluence documents several BuildingLocation fields that MRD provides but which are **not present** in the current `BuildingLocation.java` entity: `Welsh_Building_Location_Name`, `Welsh_Address`, `UPRN`, `Latitude` (decimal 10,8), `Longitude` (decimal 11,8), and `MRD_Building_Location_ID`. These may exist in the database (loaded by the batch job) but are not exposed via the API entity.

<!-- DIVERGENCE: Confluence (page 1552132135) lists Welsh_Building_Location_Name, Welsh_Address, UPRN, Latitude, Longitude, MRD_Building_Location_ID as "Existing" fields on BuildingLocation, but rd-location-ref-api:BuildingLocation.java has none of these. The JPA entity only maps: buildingLocationId, epimmsId, buildingLocationName, buildingLocationStatus, area, region, cluster, courtFinderUrl, postcode, address. Source wins for API-exposed fields; the batch loader may write additional columns not mapped to the entity. -->

## Schema and migrations

Flyway manages the `locrefdata` schema with migrations V1_1 through V1_31 (no V1_24 exists). Key migration milestones:

- `V1_1__init_tables.sql` — org hierarchy: `ORG_UNIT`, `ORG_BUSINESS_AREA`, `ORG_SUB_BUSINESS_AREA`, `JURISDICTION`, `SERVICE`, `SERVICE_TO_CCD_CASE_TYPE_ASSOC`
- `V1_9__create_tables.sql` — physical model: `region`, `building_location`, `cluster`, `court_venue`
- `V1_13` — surrogate key refactoring (replaced natural keys with generated PKs)
- `V1_16/17/18` — multiple rounds of column additions to `court_venue`
- `V1_20` — added `api_enabled` to `region`
- `V1_29/30` — Spring Batch schema for the data-load job (shares the same DB)

The schema name `locrefdata` is configured at three levels: Hibernate `default_schema`, Flyway `schemas`, and the JDBC URL `?currentSchema=locrefdata`.

## Feature flags

LRD integrates LaunchDarkly via a `FeatureConditionEvaluation` aspect. Feature flags can gate endpoint availability at runtime without redeployment.

## In development: V2 Court Venue API

As of May 2026, a V2 court venue API is in active design (Confluence pages 1973487027, 1915163667). The V2 work has two phases:

### Phase 1: Service-level granularity (HLD approved Nov 2025)

Driven by Civil Possessions Service, this phase changes the venue model from court-type-level to service-level:
- The unique key is planned to change from `(epimms_id, site_name, court_type_id)` to `(epimms_id, service_code)`
- `court_type_id` will be retained but deprecated
- The `GET /refdata/location/court-venues?court_type=<id>` parameter will be deprecated in favour of `service_code` / `service_id`
- Impact assessment completed: IAC, ET, FPL, Probate, NFD report no impact; SSCS and PrL report minor migration needed

**Current source state**: The unique constraint is still `(epimms_id, site_name, court_type_id)` and no `service_code` column exists on `court_venue`. This change is not yet implemented.

<!-- DIVERGENCE: Confluence (page 1915163667) says unique key will change to (epimms_id, service_id) and court_type_id is deprecated, but rd-location-ref-api:CourtVenue.java:32 still shows @UniqueConstraint(columnNames = {"epimms_id","site_name","court_type_id"}) with no service_code column. Source wins. -->

### Phase 2: Normalised data model (design May 2026)

The V2 data model proposes:
- `Court Venue Name` entity (name variants by type: Site, Court, Venue, External Short; by language: EN, CY)
- `Address` entity (multiple addresses per venue, with UPRN and Welsh variants)
- `Contact Details` entity (phone, email, breathing-space email with method/type classification)
- Self-referencing FKs: `parent_id`, `district_registry_venue_id`, `appeal_centre_venue_id`
- New boolean flags: `is_district_registry`, `is_appeal_centre`
- New V2 endpoints: `GET /refdata/location/v2/court-venues` and `GET /refdata/location/v2/court-venues/venue-search`

V1 endpoints will remain unchanged during the transition period. V2 responses return a richer nested JSON structure with `names[]`, `addresses[]`, `contacts[]` arrays.

**Current source state**: None of these V2 entities or endpoints exist in source code. No `/v2/` path is present in the controllers.

<!-- CONFLUENCE-ONLY: not verified in source -->

## Examples

### Flyway table definitions (`V1_9__create_tables.sql`)

The V1_9 migration introduces the core physical tables — `region`, `building_location`, and `cluster`.

```sql
// Source: apps/rd/rd-location-ref-api/src/main/resources/db/migration/V1_9__create_tables.sql
create table region (
    region_id   varchar(16),
    description varchar(256),
    welsh_description varchar(256),
    CONSTRAINT region_id_pk PRIMARY KEY (region_id)
);

create table building_location(
    building_location_id varchar(16),
    epimms_id            varchar(16) NOT NULL,
    building_location_name varchar(256) NOT NULL,
    building_location_status_id varchar(16),
    area          varchar(16),
    region_id     varchar(16),
    cluster_id    varchar(16),
    court_finder_url varchar(512),
    postcode      varchar(8) NOT NULL,
    address       varchar(512) NOT NULL,
    constraint building_location_pk primary key (building_location_id),
    constraint epimms_id_uq unique (epimms_id)
);

create table cluster (
    cluster_id   varchar(16) NOT NULL,
    cluster_name varchar(256),
    welsh_cluster_name varchar(256),
    CONSTRAINT cluster_id_pk PRIMARY KEY (cluster_id)
);
```

### Court venues controller (`LrdCourtVenueController.java`)

```java
// Source: apps/rd/rd-location-ref-api/src/main/java/uk/gov/hmcts/reform/lrdapi/controllers/LrdCourtVenueController.java
@RequestMapping(path = "/refdata/location/court-venues")
@RestController
public class LrdCourtVenueController {

    @GetMapping(produces = APPLICATION_JSON_VALUE)
    public ResponseEntity<List<LrdCourtVenueResponse>> retrieveCourtVenues(
        @RequestParam(value = "epimms_id",                  required = false) String epimmsIds,
        @RequestParam(value = "court_type_id",              required = false) Integer courtTypeId,
        @RequestParam(value = "region_id",                  required = false) Integer regionId,
        @RequestParam(value = "cluster_id",                 required = false) Integer clusterId,
        @RequestParam(value = "court_venue_name",           required = false) String courtVenueName,
        @RequestParam(value = "is_hearing_location",        required = false) String isHearingLocation,
        @RequestParam(value = "is_case_management_location",required = false) String isCaseManagementLocation,
        @RequestParam(value = "location_type",              required = false) String locationType,
        @RequestParam(value = "is_temporary_location",      required = false) String isTemporaryLocation) {
        // epimms_id and court_type_id can coexist; all other primary params are mutually exclusive
        // ...
        return ResponseEntity.status(HttpStatus.OK).body(lrdCourtVenueResponses);
    }
}
```

### Batch loader route — `BuildingLocation.csv` (`application-lrd-building-location-router.yaml`)

The upsert SQL conflicts on `epimms_id` and updates all mutable columns on match. The CSV columns map exactly to the `csv-headers-expected` list.

```yaml
// Source: apps/rd/rd-location-ref-data-load/src/main/resources/application-lrd-building-location-router.yaml
lrd-building-location-start-route: direct:LRD-buildingLocation
route:
  lrd-building-location-load:
    id: lrd-building-location-load
    file-name: BuildingLocation.csv
    table-name: building_location
    insert-sql: >
      sql:INSERT INTO building_location
        (epimms_id, building_location_name, building_location_status,
         area, region_id, cluster_id, court_finder_url, postcode, address,
         welsh_building_location_name, welsh_address, uprn, latitude, longitude,
         mrd_building_location_id, mrd_created_time, mrd_updated_time, mrd_deleted_time,
         created_time, updated_time)
      VALUES (:#epimms_id, :#building_location_name, :#building_location_status, ...)
      ON CONFLICT (epimms_id) DO UPDATE SET
        building_location_name = :#building_location_name,
        building_location_status = :#building_location_status,
        // ... all other columns
        updated_time = NOW() AT TIME ZONE 'utc'?dataSource=#dataSource
    blob-path: azure-storage-blob://${azure.storage.account-name}/lrd-ref-data?credentials=#credsreg&operation=uploadBlockBlob&blobName=BuildingLocation.csv
    processor-class: buildingLocationProcessor
    csv-headers-expected: ePIMS_ID,Building_Location_Name,Building_Location_Status,Area,Region_ID,Cluster_ID,Court_Finder_URL,Postcode,Address,Welsh_Building_Location_Name,Welsh_Address,UPRN,Latitude,Longitude,MRD_Building_Location_ID,MRD_Created_Time,MRD_Updated_Time,MRD_Deleted_Time
    header-validation-enabled: true
```

### S2S allowlist (`application.yaml`)

```yaml
// Source: apps/rd/rd-location-ref-api/src/main/resources/application.yaml
idam:
  s2s-authorised:
    services: ${LRD_S2S_AUTHORISED_SERVICES:rd_location_ref_api,payment_app,rd_caseworker_ref_api,rd_judicial_api}
```

## See also

- [API Location](../reference/api-location.md) — full endpoint reference for LRD including parameter rules, response shapes, and gotchas
- [Batch Loading](batch-loading.md) — how `rd-location-ref-data-load` ingests `BuildingLocation.csv`, `CourtVenue.csv`, and `OrgServiceCCDMapping.csv` from Azure Blob Storage
- [Caseworker Profiles](caseworker-profiles.md) — CRD consumes LRD to validate `epimms_id` values in caseworker location assignments
- [Query Reference Data](../how-to/query-reference-data.md) — practical examples of calling LRD endpoints including venue-search, orgServices, and building-locations

## Glossary

| Term | Definition |
|------|------------|
| `epimms_id` | Electronic Property Information Mapping Management System identifier; the unique business key for a court building shared across HMCTS systems |
| Service code | An LRD-assigned code (e.g. `ABA5` for Private Law, `AAA6`/`AAA7` for Civil, `BFA1` for IAC) identifying an organisational service line; used by payment routing and venue filtering |
| MRD | Master Reference Data — the upstream governance team that maintains and publishes location data as versioned CSV files on a monthly cadence |
| CTSC | Courts and Tribunals Service Centre — a `locationType` value for central phone/paper-handling centres |
| NBC | National Business Centre — a `locationType` value for centralised back-office processing |
| CCBC | County Court Business Centre — a `locationType` value |
| CCMCC | County Court Money Claims Centre — a processing centre for money claims |
| Court type ID | A classification code grouping venues by jurisdiction (e.g., type 10 = seven services, type 18 = five services); planned for deprecation in favour of service codes |
| FaCT | Find a Court or Tribunal — the public-facing court finder service; LRD stores `fact_url` links to it |
| UPRN | Unique Property Reference Number — a standard UK property identifier stored on court venues |
