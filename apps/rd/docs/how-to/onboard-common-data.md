---
title: Onboard Common Data
topic: commondata
diataxis: how-to
product: rd
audience: both
sources:
  - rd-commondata-dataload:src/main/resources/application-camel-routes-common.yaml
  - rd-commondata-dataload:src/main/resources/application-crd-other-categories-router.yaml
  - rd-commondata-dataload:src/main/resources/application-crd-flag-details-router.yaml
  - rd-commondata-dataload:src/main/resources/application-crd-flag-service-router.yaml
  - rd-commondata-dataload:src/main/resources/application-crd-list-of-values-router.yaml
  - rd-commondata-dataload:src/main/java/uk/gov/hmcts/reform/rd/commondata/configuration/BatchConfig.java
  - rd-commondata-dataload:src/main/java/uk/gov/hmcts/reform/rd/commondata/camel/binder/OtherCategories.java
  - rd-commondata-dataload:src/main/java/uk/gov/hmcts/reform/rd/commondata/camel/binder/FlagDetails.java
  - rd-commondata-dataload:src/main/java/uk/gov/hmcts/reform/rd/commondata/camel/processor/FlagDetailsProcessor.java
  - rd-commondata-dataload:src/main/java/uk/gov/hmcts/reform/rd/commondata/camel/processor/OtherCategoriesProcessor.java
  - rd-commondata-dataload:src/main/java/uk/gov/hmcts/reform/rd/commondata/camel/util/CommonDataLoadConstants.java
  - rd-commondata-api:src/main/resources/db/migration/V1_11__alter_flag_service_details.sql
status: needs-fix
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "1667694643"
    title: "List Of Values"
    last_modified: "2023-03-26T00:00:00Z"
    space: "DTSRD"
  - id: "1667694645"
    title: "Case Flags"
    last_modified: "2023-03-26T00:00:00Z"
    space: "DTSRD"
  - id: "1539768323"
    title: "Case Flags - Common Reference Data Low level Design"
    last_modified: "2021-12-13T00:00:00Z"
    space: "RTRD"
  - id: "1568506678"
    title: "Common Reference Data - Master Reference Data Source File Repository"
    last_modified: "2026-05-03T00:00:00Z"
    space: "RTRD"
  - id: "1552151384"
    title: "Common Reference Data - Master Reference Data requirements"
    last_modified: "2024-01-01T00:00:00Z"
    space: "RTRD"
  - id: "1531438038"
    title: "GET: refdata/commondata/caseflags/service-id=<service-id>?flag-type=<flag-type>&welsh-required=<welsh-required>"
    last_modified: "2023-01-01T00:00:00Z"
    space: "RTRD"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- Adding a new data set to `rd-commondata-api` requires three things: a source CSV, a Camel route configuration in `rd-commondata-dataload`, and a Flyway migration for the target table.
- All route configuration is externalised to Spring profile YAMLs — Java code only wires tasklets to route names.
- CSVs are consumed from the `rd-common-data` Azure Blob Storage container; after processing they are archived to `rd-common-data-archive`.
- New data sets that map to `list_of_values` use upsert (`ON CONFLICT ... DO UPDATE`); dedicated tables (e.g. `flag_details`, `flag_service`) use truncate-and-reload with cascade.
<!-- REVIEW: rd-commondata-dataload does NOT use ShedLock. Idempotency is via the dataload_schedular_audit table (checking if a record exists for today's date). See batch-loading.md and rd-commondata-dataload/src/main/resources/application-camel-routes-common.yaml:11. -->
- The batch job runs once per day per cluster as a Kubernetes CronJob, using ShedLock to prevent concurrent runs.
- Case Flag files (`FlagDetails.csv` + `FlagService.csv`) must **always** be uploaded together due to FK cascade — uploading only one will delete the other's data.

## Prerequisites

- Access to the `rd-commondata-dataload` and `rd-commondata-api` repositories.
- Ability to upload files to the `rd-common-data` Azure Blob Storage container (or coordinate with the upstream team that populates it).
- Familiarity with Apache Camel Bindy CSV binding and Spring Batch step ordering.

## Steps

### 1. Design the target table schema

Decide whether your data set maps to the shared `list_of_values` table or needs a dedicated table.

- **Shared `list_of_values` table** — use this if your data has the standard 13-column LoV structure: `categorykey`, `serviceid`, `key`, `value_en`, `value_cy`, `hinttext_en`, `hinttext_cy`, `lov_order`, `parentcategory`, `parentkey`, `active`, `external_reference`, `external_reference_type`. Examples: `OtherCategories`, `ListOfValues`, `CaseLinkingReasons`. The unique constraint is on `(categorykey, key, serviceid)` and the upsert uses `ON CONFLICT ... DO UPDATE`.
- **Dedicated table** — use this if your data has a different shape. Examples: `flag_details` (8 columns including MRD timestamps), `flag_service` (7 columns). These use truncate-and-reload (`TRUNCATE ... RESTART IDENTITY CASCADE`).

The LoV column data types are defined as:

| Column | Type | Max Length |
|--------|------|-----------|
| `categorykey` | varchar | 64 |
| `serviceid` | varchar | 16 |
| `key` | varchar | 64 |
| `value_en` | varchar | 128 |
| `value_cy` | varchar | 128 |
| `hinttext_en` | varchar | 512 |
| `hinttext_cy` | varchar | 512 |
| `lov_order` | bigint | - |
| `parentcategory` | varchar | 64 |
| `parentkey` | varchar | 64 |
| `active` | varchar | 1 |
| `external_reference` | varchar | 64 |
| `external_reference_type` | varchar | 64 |

### 2. Create the Flyway migration in `rd-commondata-api`

Add a new versioned migration script under `rd-commondata-api/src/main/resources/db/migration/`.

- Name it following the existing pattern: `V1_<next>__<description>.sql` (e.g. `V1_16__create_table_my_dataset.sql`).
- Use the `dbcommondata` schema — all Common Data tables live in this schema, not `public`.
- If writing to the shared `list_of_values` table, your migration may only need to seed initial data or add indexes; the table already exists.
- If creating a dedicated table, define the DDL and any required indexes.

```sql
-- Example: V1_16__create_table_my_dataset.sql
CREATE TABLE dbcommondata.my_dataset (
    id            SERIAL PRIMARY KEY,
    dataset_key   VARCHAR(256) NOT NULL,
    value_en      VARCHAR(512) NOT NULL,
    value_cy      VARCHAR(512),
    active        VARCHAR(1) DEFAULT 'Y',
    UNIQUE(dataset_key)
);
```

### 3. Prepare the source CSV

Create the CSV file that will be placed in Azure Blob Storage:

- Use UNIX line endings (LF, not CRLF).
- Include a header row (it is skipped during processing).
- Column order must match the `@DataField(pos = N)` annotations you will define in the binder class.
- Timestamps follow the pattern `dd-MM-yyyy HH:mm:ss` (regex: `(0[1-9]|[12][0-9]|[3][01])-(0[1-9]|1[012])-\d{4}\s\d{2}:\d{2}:\d{2}`).
- Avoid zero-byte characters (`​` and similar) — the processor scans for these and rejects affected records with the error "Zero byte characters identified - check source file".
- For **FlagDetails** specifically: records where `MRD_Deleted_Time` is current or past-dated are treated as expired and automatically excluded from ingestion. These are audited with the message "Record is expired" and trigger a `PartialSuccess` status.
- For **LoV data** (ListOfValues, OtherCategories): records with `active = 'D'` are deleted from the table after load. The processor logs "Record is deleted as Active flag was 'D'".

Example (`MyDataset.csv`):

```csv
ID,DatasetKey,ValueEN,ValueCY,Active
1,exampleKey,Example Value,Gwerth Enghreifftiol,Y
2,anotherKey,Another Value,,Y
```

### 4. Create the Camel Bindy binder class

In `rd-commondata-dataload`, add a new binder under `src/main/java/uk/gov/hmcts/reform/rd/commondata/camel/binder/`:

```java
@CsvRecord(separator = ",", crlf = "UNIX", skipFirstLine = true, skipField = true)
public class MyDataset implements Serializable {

    @DataField(pos = 1, columnName = "ID")
    private String id;

    @DataField(pos = 2, columnName = "DatasetKey")
    @NotBlank
    private String datasetKey;

    @DataField(pos = 3, columnName = "ValueEN")
    @NotBlank
    private String valueEn;

    @DataField(pos = 4, columnName = "ValueCY")
    private String valueCy;

    @DataField(pos = 5, columnName = "Active")
    private String active;
}
```

Use JSR-303 annotations (`@NotBlank`, `@Pattern`, etc.) for field-level validation. Validation failures are written to `dataload_exception_records`.

### 5. Create the processor class

Add a processor under `src/main/java/uk/gov/hmcts/reform/rd/commondata/camel/processor/`:

- Extend the common processor pattern used by `OtherCategoriesProcessor` or `FlagDetailsProcessor`.
- Implement any business validation (e.g. foreign-key checks, date filtering for expired records).
- Zero-byte character checking is applied generically; you do not need to re-implement it.

### 6. Create the mapper class

Add a row mapper that transforms the binder object into the JDBC parameter map for the INSERT SQL. Follow the pattern of existing mappers in `src/main/java/uk/gov/hmcts/reform/rd/commondata/camel/mapper/`.

### 7. Add the Camel route YAML profile

Create a new Spring profile YAML, e.g. `src/main/resources/application-crd-my-dataset-router.yaml`:

```yaml
crd-my-dataset-router:
  id: crd-my-dataset-load
  data-type: MyDataset
  file-name: MyDataset.csv
  table-name: my_dataset
  truncate-sql:
    - truncate table my_dataset restart identity
  insert-sql: >
    INSERT INTO my_dataset (id, dataset_key, value_en, value_cy, active)
    VALUES (:#id, :#datasetKey, :#valueEn, :#valueCy, :#active)
  blob-path: ${active-blob-path}/MyDataset.csv?credentials=#credsreg&operation=uploadBlockBlob
  processor-class: uk.gov.hmcts.reform.rd.commondata.camel.processor.MyDatasetProcessor
  mapper-class: uk.gov.hmcts.reform.rd.commondata.camel.mapper.MyDatasetMapper
  csv-binder-object: uk.gov.hmcts.reform.rd.commondata.camel.binder.MyDataset
  csv-headers-expected: ID,DatasetKey,ValueEN,ValueCY,Active
```

Key configuration choices:

| Property | Purpose |
|----------|---------|
| `truncate-sql` | Use for full-refresh data sets (like FlagDetails). Omit and use `ON CONFLICT ... DO UPDATE` in `insert-sql` for upsert behaviour. |
| `csv-headers-expected` | Validated at runtime; mismatched headers fail the route. |
| `blob-path` | Must include `blobName=<filename>.csv` or the filename directly in the path. |

### 8. Activate the Spring profile

In `rd-commondata-dataload/src/main/resources/application.yaml`, add your new profile to the `spring.profiles.include` list (around line 55-63):

```yaml
spring:
  profiles:
    include:
      - lib
      - camel-routes-common
      - crd-flag-service-router
      - crd-list-of-values-router
      - crd-case-linking-reasons-router
      - crd-flag-details-router
      - crd-other-categories-router
      - crd-my-dataset-router        # <-- add this
```

Note: The `lib` profile is required — it pulls in the `data-ingestion-lib` shared configuration.

### 9. Wire the Step into the Spring Batch Job

In `BatchConfig.java` (`rd-commondata-dataload:src/main/java/.../configuration/BatchConfig.java`):

1. Define a new `@Bean` Step that creates a tasklet for your route (follow the pattern of existing steps).
2. Add the step to the `runRoutesJob()` flow in the desired execution order.

The current execution order is:

1. **FlagDetails** (truncate-and-reload)
2. **FlagService** (truncate-and-reload; depends on FlagDetails via FK)
3. **OtherCategories** (upsert into `list_of_values`)
4. **CaseLinkingReasons** (conditionally enabled via `commondata-caselinking-route-disable` flag; deprecated in favour of OtherCategories)
5. **ListOfValues** (upsert into `list_of_values`)

Steps execute sequentially. If your data set has a foreign-key dependency on another (e.g. `FlagService` depends on `FlagDetails`), ensure it runs after the dependency. The `runRoutesJob()` method uses Spring Batch flow control with a `JobExecutionDecider` to conditionally skip the CaseLinkingReasons step.

### 10. Add the file to the archival list

In `application-camel-routes-common.yaml` (line 6), append your CSV filename to the `archival-file-names` list so it is moved to the archive container after processing:

```yaml
archival-file-names: FlagDetails.csv,FlagService.csv,ListOfValues.csv,OtherCategories.csv,MyDataset.csv
```

Note: The actual archival-file-names value in source uses a SpEL expression to conditionally include `CaseLinkingReasons.csv` based on the `caselinking-route-disable` flag:

```yaml
archival-file-names: FlagDetails.csv,FlagService.csv,ListOfValues.csv,OtherCategories.csv#{"${caselinking-route-disable:false}" ? "" :",CaseLinkingReasons.csv"}
```

The archive container is `rd-common-data-archive` and files are archived with a timestamp suffix in the format `dd-MM-yyyy--HH-mm`.

### 11. Upload the CSV to Azure Blob Storage

Place your CSV file in the `rd-common-data` container. The blob name must exactly match the `file-name` configured in your route YAML. Only one version of each file should exist at a time in the active container.

## Verify

1. **Run the dataload job locally** (functional test):
   - Check `src/functionalTest/java/.../cameltest/` for existing load tests as a template.
   - Create a test class (e.g. `CommonDataMyDatasetLoadTest.java`) that places a test CSV in the expected location and asserts the target table is populated.

2. **Check the audit table** after a successful run:
   ```sql
   SELECT * FROM dataload_schedular_audit
   WHERE date(scheduler_start_time) = current_date;
   ```
   A row should exist with a successful status.

3. **Confirm no exceptions**:
   ```sql
   SELECT * FROM dataload_exception_records
   WHERE scheduler_start_time = (
     SELECT MAX(scheduler_start_time) FROM dataload_schedular_audit
   );
   ```
   This table should be empty (or contain only expected validation skips).

4. **Query the API** (if the data is served via the LoV endpoint):
   ```
   GET /refdata/commondata/lov/categories/{categoryId}
   ```
   where `categoryId` matches your `categorykey` value. Confirm your data appears in the response.

## Existing data sets and file sources

The Common Data platform currently manages these CSV data sets:

| File | Target Table | Load Strategy | Source | Typical Frequency |
|------|-------------|---------------|--------|-------------------|
| `ListOfValues.csv` | `list_of_values` | Upsert | A&P team (via MRD Change Log) | Monthly or on change |
| `OtherCategories.csv` | `list_of_values` | Upsert | CFT Ref Data team | On change |
| `FlagDetails.csv` | `flag_details` | Truncate + reload | MRD / A&P team | On change |
| `FlagService.csv` | `flag_service` | Truncate + reload | CFT Ref Data team (service teams request changes) | On change |
| `CaseLinkingReasons.csv` | `list_of_values` | Upsert | Deprecated (use OtherCategories) | N/A |

<!-- CONFLUENCE-ONLY: not verified in source -->
File versions and upload history are tracked on the Confluence page "Common Reference Data - Master Reference Data Source File Repository" (RTRD space), with a corresponding MRD Change Log spreadsheet on SharePoint. Each file version has an associated JIRA ticket (pattern: `DTSRD-XXXX`).

### Important: Case Flags upload constraint

When uploading Case Flag data, **both `FlagDetails.csv` and `FlagService.csv` must always be uploaded together**, even if only one has changed. This is because:

1. `flag_details` uses `TRUNCATE ... RESTART IDENTITY CASCADE`
2. The cascade propagates to `flag_service` (which has a FK on `flag_code`)
3. If you upload only `FlagDetails.csv`, the `flag_service` table data will be deleted

This constraint is verified in the route configs: `application-crd-flag-details-router.yaml` specifies `truncate table flag_details restart identity cascade`.

## File validation workflow

<!-- CONFLUENCE-ONLY: not verified in source -->
Before deploying a new CSV version to non-production or production environments, the RD team follows a validation workflow:

1. **Load baseline** — upload the currently-deployed CSV version to the `rdpreview` storage account's `rd-common-data` container and run the dataload locally.
2. **Rename schema** — rename `dbcommondata` to `dbcommondata_baseline` in the local database.
3. **Load new file** — upload the new CSV version and re-run the dataload.
4. **Run validation SQL** — execute the appropriate validation script (`CaseFlags-Validation.sql` or `ListOfValues-Validation.sql`) against both schemas to compare baseline vs new.
5. **Document results** — capture results in the validation Word template, attach to the JIRA ticket.
6. **QA review** — move the JIRA to "Ready for QA" and assign to a QA team member.

Local database connection for validation:
- Host: `localhost`, Port: `5458`
- Database/Username/Password: `dbcommondata`
- Start with: `./bin/run-in-docker.sh` (caution: this deletes existing data volumes)

## See also

- [Common Data](../explanation/common-data.md) — explains the `dbcommondata` schema, case flags endpoint, LoV endpoint, and the batch loader execution model
- [Batch Loading](../explanation/batch-loading.md) — covers both batch loaders (commondata and location); explains truncate vs upsert strategies, validation layers, and idempotency
- [Query Reference Data](query-reference-data.md) — how to call the Common Data API endpoints once data is loaded
- [Glossary](../reference/glossary.md) — definitions of MRD, A&P, data-ingestion-lib, Camel Bindy, D-record, and dataload_schedular_audit
