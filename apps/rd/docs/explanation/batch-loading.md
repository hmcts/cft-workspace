---
title: Batch Loading
topic: batch
diataxis: explanation
product: rd
audience: both
sources:
  - rd-commondata-dataload:src/main/resources/application-camel-routes-common.yaml
  - rd-commondata-dataload:src/main/resources/application-crd-flag-details-router.yaml
  - rd-commondata-dataload:src/main/resources/application-crd-flag-service-router.yaml
  - rd-commondata-dataload:src/main/resources/application.yaml
  - rd-commondata-dataload:src/main/java/uk/gov/hmcts/reform/rd/commondata/configuration/BatchConfig.java
  - rd-commondata-dataload:src/main/java/uk/gov/hmcts/reform/rd/commondata/camel/task/BaseTasklet.java
  - rd-commondata-dataload:src/main/java/uk/gov/hmcts/reform/rd/commondata/camel/util/CommonDataExecutor.java
  - rd-commondata-dataload:src/main/java/uk/gov/hmcts/reform/rd/commondata/camel/util/CommonDataDRecords.java
  - rd-commondata-dataload:src/main/java/uk/gov/hmcts/reform/rd/commondata/CommonDataLoadApplication.java
  - rd-location-ref-data-load:src/main/resources/application-camel-routes-common.yaml
  - rd-location-ref-data-load:src/main/resources/application.yaml
  - rd-location-ref-data-load:src/main/java/uk/gov/hmcts/reform/locationrefdata/configuration/BatchConfig.java
  - rd-location-ref-data-load:src/main/java/uk/gov/hmcts/reform/locationrefdata/camel/task/BaseTasklet.java
  - rd-location-ref-data-load:src/main/java/uk/gov/hmcts/reform/locationrefdata/camel/util/LrdExecutor.java
  - rd-location-ref-data-load:src/main/java/uk/gov/hmcts/reform/locationrefdata/LrdLoadApplication.java
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/rd/rd-commondata-dataload/src/main/resources/application-crd-flag-details-router.yaml
  - apps/rd/rd-commondata-dataload/src/main/resources/application-crd-list-of-values-router.yaml
  - apps/rd/rd-commondata-dataload/src/main/resources/application-camel-routes-common.yaml
  - apps/rd/rd-location-ref-data-load/src/main/resources/application-lrd-building-location-router.yaml
  - apps/rd/rd-location-ref-data-load/src/main/resources/application-camel-routes-common.yaml
confluence:
  - id: "1732350785"
    title: "Cron Job Matrix"
    last_modified: "unknown"
    space: "RSTR"
  - id: "1667694641"
    title: "Data Loads"
    last_modified: "unknown"
    space: "DTSRD"
  - id: "1667694643"
    title: "List Of Values"
    last_modified: "unknown"
    space: "DTSRD"
  - id: "1667694645"
    title: "Case Flags"
    last_modified: "unknown"
    space: "DTSRD"
  - id: "1604501202"
    title: "Location Reference Data - Mismatches found in MRD files"
    last_modified: "unknown"
    space: "RTRD"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- Two Kubernetes CronJob batch loaders (`rd-commondata-dataload`, `rd-location-ref-data-load`) ingest GPG-decrypted CSV files from Azure Blob Storage into PostgreSQL databases once per day.
- Both delegate to the shared `data-ingestion-lib` library which provides Apache Camel route infrastructure, Azure Blob consumption, and the Spring Batch job runner.
- GPG decryption is performed upstream in the Palo Alto network layer before files reach Azure Blob; the loaders consume plaintext CSVs.
- Idempotency is enforced by querying a `dataload_schedular_audit` table (not ShedLock) -- if a run already exists for today, the job is skipped.
- FlagDetails truncation uses `CASCADE`, which also deletes `flag_service` rows -- both files must always be uploaded together.
- CronJob schedules are managed in `cnp-flux-config`; jobs can be suspended via Flux PRs or triggered on-demand via Azure Portal.

## Architecture overview

Both batch loaders follow an identical architecture layered as:

```
Kubernetes CronJob
  -> Spring Boot Application (one-shot)
    -> DataIngestionLibraryRunner (idempotency check)
      -> Spring Batch Job
        -> Steps (sequential, each wrapping a Tasklet)
          -> Apache Camel Route (per CSV file type)
            -> Azure Blob read
            -> Camel Bindy CSV parsing
            -> JSR-303 validation + custom processor logic
            -> JDBC batch insert/upsert
```

The application starts, runs the batch job, flushes App Insights (7-second sleep), then exits with `System.exit()` (`CommonDataLoadApplication.java:37-39`, `LrdLoadApplication.java:43-46`). Ports are exposed for health/metrics only during the brief run window: `rd-commondata-dataload` on port **8100**, `rd-location-ref-data-load` on port **8099** (`application.yaml:2` in each repo).

## Apache Camel routes

Route configuration is fully externalised to Spring YAML profiles. Java code only wires Tasklets to route names. Each route YAML declares:

| Property | Purpose |
|----------|---------|
| `file-name` | Blob name to read (e.g. `FlagDetails.csv`) |
| `table-name` | Target PostgreSQL table |
| `insert-sql` | SQL INSERT (or INSERT ... ON CONFLICT for upserts) |
| `blob-path` | Full Azure Blob URI including credentials |
| `processor-class` | Validation/transform processor FQCN |
| `mapper-class` | Row mapper FQCN |
| `csv-binder-object` | Camel Bindy binder class |
| `csv-headers-expected` | Expected CSV header line for validation |

### commondata-dataload routes

Batch job name: `CommonDataLoad`. Step execution order defined in `BatchConfig.java:114-125`:

1. **FlagDetails** -- truncate-and-reload `flag_details` table
2. **FlagService** -- truncate-and-reload `flag_service` table
3. **OtherCategories** -- upsert into `list_of_values` (conflict key: `categorykey, key, serviceid`)
4. **ListOfValues** -- upsert into `list_of_values` (same table, same conflict key)
5. **CaseLinkingReasons** -- upsert into `list_of_values` (conditionally disabled via `caselinking-route-disable`)

Route start URIs: `direct:CommonData-FlagDetails`, `direct:CommonData-FlagService`, `direct:CommonData-ListOfValues`, `direct:CommonData-OtherCategories`, `direct:CommonData-CaseLinkingReasons`.

A `JobExecutionDecider` bean gates the CaseLinkingReasons step (`BatchConfig.java:128-131`), allowing it to be disabled at runtime.

### location-ref-data-load routes

Batch job name: `LocationRefDataLoad`. Step execution order defined in `BatchConfig.java:72-79`:

1. **OrgServiceCCDMapping** -- truncate-and-reload `service_to_ccd_case_type_assoc` table
2. **BuildingLocation** -- upsert into `building_location` (conflict key: `epimms_id`)
3. **CourtVenue** -- upsert into `court_venue` (conflict key: `epimms_id, court_type_id`)

Route start URIs: `direct:LRD`, `direct:LRD-buildingLocation`, `direct:LRD-courtVenue`.

Step ordering is significant: `CourtVenue` FK-checks `epimms_id` against `building_location`, so `BuildingLocation` must load first. Unlike commondata, there is no conditional step decider -- all three steps always run.

### Aggregation and timeouts

Both loaders share the same tuning parameters (`application-camel-routes-common.yaml:1-2`):

- Aggregation batch size: **100 records**
- Aggregation timeout: **2000ms**
- File read timeout: **180000ms** (3 minutes)

The OrgServiceCCDMapping route overrides with a JDBC batch size of 10 (`application-lrd-router.yaml:1`).

## GPG decryption

Neither batch loader performs GPG decryption itself. The decryption pipeline is:

```
Source system -> SFTP -> F5 LB -> Palo Alto network layer (GPG decrypt + scan) -> Azure Blob Storage
```

By the time files reach the Azure Blob containers (`rd-common-data`, `lrd-ref-data`), they are plaintext CSV. BouncyCastle (`bcpkix-jdk18on`) is on the classpath as a transitive dependency but is not used directly for decryption in either repo.

If GPG decryption fails upstream, the blob will contain encrypted binary. The Camel CSV reader will fail to parse it, and the error will be recorded in `dataload_exception_records`.

## Azure Blob consumption

| Loader | Source container | Archive container |
|--------|-----------------|-------------------|
| commondata-dataload | `rd-common-data` | `rd-common-data-archive` |
| location-ref-data-load | `lrd-ref-data` | `lrd-ref-data-archive` |

Blob path URIs follow the pattern:

```
azure-storage-blob://${azure.storage.account-name}/<container>?blobName=<file>&credentials=#credsreg&operation=uploadBlockBlob
```

Authentication uses a credential bean named `credsreg`, registered by `data-ingestion-lib` from environment variables `ACCOUNT_NAME` / `ACCOUNT_KEY` (sourced from Azure Key Vault at `/mnt/secrets/rd/`).

Container names are hardcoded in the route YAML files -- not configurable via environment variable.

After successful processing, each file is copied to the archive container with a date-stamped name using format `dd-MM-yyyy--HH-mm`.

## Idempotency (no ShedLock)

Neither loader uses ShedLock. Instead, idempotency is implemented via a `dataload_schedular_audit` table (note the persistent typo: "schedular" not "scheduler"). The check is performed by `DataIngestionLibraryRunner` from `data-ingestion-lib` before the Spring Batch job executes:

```sql
SELECT COUNT(*) FROM dataload_schedular_audit
WHERE DATE(scheduler_start_time) = current_date
```

If count > 0, the job is skipped entirely for that calendar day (`application-camel-routes-common.yaml:11` in commondata, `:12` in location).

**Race condition**: There is no distributed lock. If two pods start simultaneously (e.g. during a rescheduled CronJob plus a manual trigger), both may pass the idempotency check before either writes the audit record. The truncate-and-reload routes (FlagDetails, FlagService, OrgServiceCCDMapping) are most vulnerable to corruption from concurrent runs.

## CronJob scheduling

Both batch loaders are deployed as Kubernetes CronJobs (not Deployments). They run once per day per cluster. The schedule is configured in the Helm chart values (not in application code). Key runtime characteristics:

- Spring Batch auto-launch is disabled (`spring.batch.job.enabled: false` in `application.yaml`); the job is triggered programmatically on startup by the application's `run()` method.
- The application delegates to `DataIngestionLibraryRunner.run(job, params)` which performs the idempotency check, then runs the Spring Batch job if allowed (`CommonDataLoadApplication.java:43-48`, `LrdLoadApplication.java:51-55`).
- After job completion (success or failure), the process sleeps 7 seconds for App Insights telemetry flush, then calls `System.exit()`.

## Validation and error handling

Both loaders apply multi-layer validation:

1. **Header validation** -- CSV column headers are checked against the expected header list declared in the route YAML. A mismatch fails the route entirely. (Note: OrgServiceCCDMapping in `rd-location-ref-data-load` does not enable header validation.)
2. **JSR-303 bean validation** -- Standard annotations on binder classes (e.g. `@NotNull`, `@DatePattern`). Failures are written to `dataload_exception_records` via `JsrValidatorInitializer.auditJsrExceptions()`.
3. **Custom processor logic** -- FK checks (e.g. `FlagServiceProcessor` validates `FlagCode` exists in `flag_details`; `CourtVenueProcessor` checks `epimms_id`, `court_type_id`, `region_id`, `cluster_id`). Failing records are removed from the batch and audited.
4. **Zero-byte character detection** -- Scans `toString()` of each record for zero-width space and non-breaking space characters.
5. **Expiry filtering** (commondata only) -- `FlagDetailsProcessor.removeExpiredRecords()` filters out records where `MRD_Deleted_Time` is in the past.
6. **D-record deletion** (commondata only) -- `CommonDataDRecords.auditAndDeleteCategories()` removes `list_of_values` rows with `active='D'` after each route completes (`CommonDataDRecords.java:41-56`).

If all records fail validation for a given route, `RouteFailedException` is thrown and the step fails.

## Truncate vs upsert strategies

| Route | Strategy | CASCADE? | Risk of partial failure |
|-------|----------|----------|------------------------|
| FlagDetails | Truncate + insert | Yes (`CASCADE`) | Table left empty if job fails mid-load; **also deletes `flag_service` rows** due to FK cascade |
| FlagService | Truncate + insert | No | Table left empty if job fails mid-load |
| OrgServiceCCDMapping | Truncate + insert | No | Table left empty if job fails mid-load |
| OtherCategories | Upsert (ON CONFLICT) | N/A | Partial update safe |
| ListOfValues | Upsert (ON CONFLICT) | N/A | Partial update safe |
| CaseLinkingReasons | Upsert (ON CONFLICT) | N/A | Partial update safe |
| BuildingLocation | Upsert (ON CONFLICT) | N/A | Partial update safe |
| CourtVenue | Upsert (ON CONFLICT) | N/A | Partial update safe |

**Operational consequence of CASCADE**: Because `flag_details` truncation uses `CASCADE` (`application-crd-flag-details-router.yaml:11`), it also deletes all rows from `flag_service` (which has a FK to `flag_details`). This means **FlagDetails.csv and FlagService.csv must always be uploaded together**, even if only one has changed. Uploading only FlagDetails.csv will leave the `flag_service` table empty after the truncate step.

## Environment-specific storage accounts

The storage account name (`${azure.storage.account-name}`) is injected per environment. Container names (`rd-common-data`, `lrd-ref-data`) are hardcoded in route YAML.

<!-- CONFLUENCE-ONLY: not verified in source -->

| Environment | Common Data account | Location Data account | Judicial Data account |
|-------------|--------------------|-----------------------|----------------------|
| Preview (local dev) | `rdpreview` | `rdpreview` | `rdpreview` |
| Demo | `rdcommondatademo` | `rdlocationdatademo` | `rddemo` |
| AAT | `rdcommondataaat` | `rdlocationdataaat` | `rdaat` |
| ITHC | `rdcommondatadithc` | `rdlocationdatadithc` | `rdithc` |
| PerfTest | `rdcommondataperftest` | `rdlocationdataperftest` | `rdperftest` |

CronJob schedules are managed in [`cnp-flux-config/apps/rd`](https://github.com/hmcts/cnp-flux-config/tree/master/apps/rd). Jobs can be suspended or rescheduled via Flux PRs.

## On-demand CronJob triggering

CronJobs can be triggered manually without waiting for the schedule or modifying Flux configs:

1. Open Azure Portal
2. Navigate to the relevant AKS cluster
3. Go to **Workloads > Cron Jobs**
4. Select the job (e.g. `rd-commondata-dataload-job`) and click **Trigger**

This avoids the need to submit and revert Flux PRs to change cron timings for one-off loads.

## Audit statuses

After each route completes, the `dataload_schedular_audit` table records one of three statuses:

| Status | Meaning |
|--------|---------|
| `Success` | All records in the file loaded without error |
| `PartialSuccess` | Some records failed validation and were written to `dataload_exception_records`; the rest loaded |
| `Failure` | All records failed; the route threw `RouteFailedException` |

Inspect the `dataload_exception_records` table for per-row failure reasons when the status is `PartialSuccess` or `Failure`.

## File validation workflow (pre-load)

Before loading new CSV versions to non-prod or prod, the team follows a validation workflow:

1. Receive a JIRA ticket specifying baseline and new file versions
2. Download both versions from Confluence repositories
3. Start a local PostgreSQL database via `./bin/run-in-docker.sh` (port 5458 for commondata, same schema)
4. Upload the **baseline** file(s) to the `rdpreview` storage container
5. Run the dataload application locally to load baseline data
6. Rename the loaded schema (e.g. `dbcommondata` to `dbcommondata_baseline`)
7. Upload the **new** file(s) and re-run the dataload
8. Execute validation SQL queries comparing baseline vs new data
9. Document results in the validation template (Word doc) and attach to JIRA for QA review

This process requires F5 VPN access and IP whitelisting on the storage account's network configuration.

## Known MRD file quality issues

The upstream MRD (Master Reference Data) system has historically delivered files with quality issues that the batch loaders must handle or reject. Common categories:

- **Leading Unicode characters in CSV headers** (BOM or zero-width spaces) -- causes header validation to fail; the loader rejects the entire file
- **Filename mismatches** -- spaces or incorrect casing in blob names prevent the route from finding the file
- **Column header mismatches** -- extra or renamed columns vs what the route expects in `csv-headers-expected`
- **Duplicate records** -- multiple rows for the same `epimms_id` in building/venue files
- **Invalid FK references** -- `Court_Type_ID`, `Region_ID`, or `Cluster_ID` values not present in parent tables
- **`#N/A` sentinel values** -- Excel artifacts left in numeric fields
- **Trailing special characters** -- whitespace or non-printing characters in venue/building names
- **Missing MRD timestamps** -- `MRD_Created_Time`/`MRD_Updated_Time` columns left blank

When such issues are detected during validation, the team raises them with the MRD governance forum before approving the file for production load.

## Adding a new data type

To add a new CSV file type to either loader:

1. Create a new Spring profile YAML (`application-<route-name>-router.yaml`) declaring `file-name`, `table-name`, `insert-sql`, `blob-path`, `processor-class`, `mapper-class`, `csv-binder-object`, `csv-headers-expected`.
2. Activate the profile in `application.yaml` includes.
3. Create a Camel Bindy binder class (`@CsvRecord` annotated POJO).
4. Create a processor class extending the base processor.
5. Create a mapper class.
6. Add a new Step in `BatchConfig` and wire it into `runRoutesJob()`.

## Examples

### commondata: `FlagDetails.csv` truncate-and-reload route

The `TRUNCATE ... CASCADE` propagates to `flag_service` because of the FK constraint. Both files must always be uploaded together.

```yaml
// Source: apps/rd/rd-commondata-dataload/src/main/resources/application-crd-flag-details-router.yaml
commondata-flag-details-start-route: direct:CommonData-FlagDetails
route:
  commondata-flag-details-load:
    id: commondata-flag-details-load
    file-name: FlagDetails.csv
    table-name: flag_details
    truncate-sql:
      sql:truncate table flag_details restart identity cascade?dataSource=#dataSource
    insert-sql:
      sql:insert into flag_details (id,flag_code,value_en,value_cy,category_id,
        mrd_created_time,mrd_updated_time,mrd_deleted_time)
      values (:#id,:#flag_code,:#value_en,:#value_cy,:#category_id,
        :#mrd_created_time,:#mrd_updated_time,:#mrd_deleted_time)?dataSource=#dataSource
    blob-path:
      azure-storage-blob://${azure.storage.account-name}/rd-common-data?credentials=#credsreg&operation=uploadBlockBlob&blobName=FlagDetails.csv
    processor-class: flagDetailsProcessor
    csv-binder-object: FlagDetails
    csv-headers-expected: id,flag_code,value_en,value_cy,category_id,MRD_Created_Time,MRD_Updated_Time,MRD_Deleted_Time
    header-validation-enabled: true
```

### commondata: `ListOfValues.csv` upsert route

```yaml
// Source: apps/rd/rd-commondata-dataload/src/main/resources/application-crd-list-of-values-router.yaml
commondata-categories-start-route: direct:CommonData-ListOfValues
route:
  commondata-list-of-values-load:
    id: commondata-list-of-values-load
    file-name: ListOfValues.csv
    table-name: list_of_values
    insert-sql:
      sql:insert into list_of_values
        (categorykey,serviceid,key,value_en,value_cy,hinttext_en,hinttext_cy,
         lov_order,parentcategory,parentkey,active,external_reference,external_reference_type)
      values (:#categoryKey,:#serviceId,:#key,:#value_en,:#value_cy,:#hinttext_en,:#hinttext_cy,
              :#lov_order,:#parentcategory,:#parentkey,:#active,:#external_reference,:#external_reference_type)
      on conflict (categorykey,key,serviceid) do UPDATE SET
        value_en = :#value_en, value_cy = :#value_cy, active = :#active,
        // ... ?dataSource=#dataSource
    blob-path:
      azure-storage-blob://${azure.storage.account-name}/rd-common-data?credentials=#credsreg&operation=uploadBlockBlob&blobName=ListOfValues.csv
    csv-headers-expected: categorykey,serviceid,key,value_en,value_cy,hinttext_en,hinttext_cy,lov_order,parentcategory,parentkey,active,external_reference,external_reference_type
    header-validation-enabled: true
```

### commondata: shared route tuning and idempotency check

```yaml
// Source: apps/rd/rd-commondata-dataload/src/main/resources/application-camel-routes-common.yaml
aggregation-strategy-completion-size: 100
aggregation-strategy-timeout: 2000
file-read-time-out: 180000
batchjob-name: CommonDataLoad
scheduler-audit-select: >
  select count(*) from dataload_schedular_audit
  where date(scheduler_start_time) = current_date
archival-file-names: >
  FlagDetails.csv,FlagService.csv,ListOfValues.csv,OtherCategories.csv
  #{"${caselinking-route-disable:false}" ? "" :",CaseLinkingReasons.csv"}
archival-date-format: dd-MM-yyyy--HH-mm
```

### location-ref-data-load: `BuildingLocation.csv` upsert route

```yaml
// Source: apps/rd/rd-location-ref-data-load/src/main/resources/application-lrd-building-location-router.yaml
lrd-building-location-start-route: direct:LRD-buildingLocation
route:
  lrd-building-location-load:
    id: lrd-building-location-load
    file-name: BuildingLocation.csv
    table-name: building_location
    insert-sql:
      sql:INSERT INTO building_location
        (epimms_id, building_location_name, building_location_status, area,
         region_id, cluster_id, court_finder_url, postcode, address,
         welsh_building_location_name, welsh_address, uprn, latitude, longitude,
         mrd_building_location_id, mrd_created_time, mrd_updated_time, mrd_deleted_time,
         created_time, updated_time)
      VALUES (:#epimms_id, :#building_location_name, ...)
      ON CONFLICT (epimms_id) DO UPDATE SET
        building_location_name = :#building_location_name,
        // ... all mutable columns
        updated_time = NOW() AT TIME ZONE 'utc'?dataSource=#dataSource
    blob-path:
      azure-storage-blob://${azure.storage.account-name}/lrd-ref-data?credentials=#credsreg&operation=uploadBlockBlob&blobName=BuildingLocation.csv
    processor-class: buildingLocationProcessor
    csv-headers-expected: ePIMS_ID,Building_Location_Name,Building_Location_Status,Area,Region_ID,Cluster_ID,Court_Finder_URL,Postcode,Address,Welsh_Building_Location_Name,Welsh_Address,UPRN,Latitude,Longitude,MRD_Building_Location_ID,MRD_Created_Time,MRD_Updated_Time,MRD_Deleted_Time
    header-validation-enabled: true
```

### location-ref-data-load: shared route tuning

```yaml
// Source: apps/rd/rd-location-ref-data-load/src/main/resources/application-camel-routes-common.yaml
aggregation-strategy-completion-size: 100
aggregation-strategy-timeout: 2000
file-read-time-out: 180000
batchjob-name: LocationRefDataLoad
scheduler-audit-select: >
  SELECT COUNT(*) FROM dataload_schedular_audit
  where DATE(scheduler_start_time) = current_date
archival-file-names: OrgServiceCCDMapping.csv, BuildingLocation.csv, CourtVenue.csv
archival-date-format: dd-MM-yyyy--HH-mm
# FK validation queries used by CourtVenueProcessor
region-query: SELECT region_id FROM region
cluster-query: SELECT cluster_id FROM cluster
epimms-id-query: SELECT epimms_id FROM building_location
court-type-id-query: SELECT court_type_id FROM court_type
```

## See also

- [Common Data](common-data.md) — explains the `rd-commondata-api` database schema and the endpoints that serve the data loaded by `rd-commondata-dataload`
- [Locations](locations.md) — explains the LRD data model and how `rd-location-ref-api` serves the data loaded by `rd-location-ref-data-load`
- [Onboard Common Data](../how-to/onboard-common-data.md) — step-by-step guide for adding a new CSV data type to the common-data batch loader
- [Architecture](architecture.md) — shows the batch loaders in context: how they sit alongside the six REST API services in the RD product

## Glossary

| Term | Definition |
|------|------------|
| `data-ingestion-lib` | Shared HMCTS library (`com.github.hmcts:data-ingestion-lib`) providing Apache Camel route infrastructure, Azure Blob Camel component wiring, `DataIngestionLibraryRunner`, and `RouteExecutor` |
| `dataload_schedular_audit` | Database table recording batch run timestamps; used for daily idempotency checks (typo "schedular" is canonical) |
| `dataload_exception_records` | Database table storing per-row validation failures with table name, field, error description, and row ID |
| Camel Bindy | Apache Camel data format that maps CSV columns to Java POJO fields via `@DataField` annotations |
| D-record | A `list_of_values` row with `active='D'` indicating soft-deletion; physically removed after load |
| MRD | Master Reference Data -- the upstream source system that generates the CSV files |
| A&P | Analysis & Policy -- the business team that provides new CaseFlags and ListOfValues file versions |
| `cnp-flux-config` | The Flux GitOps repository (`hmcts/cnp-flux-config`) managing Kubernetes CronJob schedules under `apps/rd` |
| `rdpreview` | Azure Storage account used for local development and file validation (not a deployed environment) |
