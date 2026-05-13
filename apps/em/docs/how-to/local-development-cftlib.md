---
title: Local Development Cftlib
topic: architecture
diataxis: how-to
product: em
audience: both
sources:
  - em-stitching-api:build.gradle
  - em-stitching-api:src/cftlib/java/uk/gov/hmcts/reform/em/stitching/cftlib/CftLibConfig.java
  - em-stitching-api:src/cftlib/resources/docker-compose-local.yml
  - em-annotation-api:build.gradle
  - em-annotation-api:src/cftlib/java/uk/gov/hmcts/reform/em/annotation/cftlib/CftLibConfig.java
  - em-native-pdf-annotator-app:build.gradle
  - em-native-pdf-annotator-app:src/cftlib/java/uk/gov/hmcts/reform/em/npa/redaction/cftlib/CftLibConfig.java
  - em-native-pdf-annotator-app:src/cftlib/resources/docker-compose-local.yml
  - em-hrs-api:build.gradle
  - em-hrs-api:src/cftlib/java/uk/gov/hmcts/reform/em/hrs/cftlib/CftLibConfig.java
  - em-hrs-api:src/cftlib/resources/docker-compose-local.yml
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "850755910"
    title: "Developer Environments"
    last_modified: "unknown"
    space: "RDM"
  - id: "1504222204"
    title: "DTS - Evidence Management"
    last_modified: "unknown"
    space: "DATS"
  - id: "1604492994"
    title: "RSE CFT Library"
    last_modified: "unknown"
    space: "SSCS"
  - id: "1602552914"
    title: "CFTLib Feeback"
    last_modified: "unknown"
    space: "RSE"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- Four EM repos support `bootWithCCD` via the `rse-cft-lib` Gradle plugin: `em-stitching-api`, `em-annotation-api`, `em-native-pdf-annotator-app`, and `em-hrs-api`.
- Running `./gradlew bootWithCCD` starts the full CFT stack (CCD, IDAM, S2S, AM) in-process alongside the EM service.
- All four use `AuthMode.Local` so no real IDAM token exchange is needed.
- `em-stitching-api` and `em-native-pdf-annotator-app` additionally launch Docker containers (DM Store + Azurite) via a bundled `docker-compose-local.yml`; `em-hrs-api` launches only Azurite.
- Azure Key Vault secrets are required for `em-stitching-api` (vault: `em-stitching-aat`), `em-native-pdf-annotator-app` (vault: `em-npa-aat`), and `em-hrs-api` (vault: `em-hrs-api-aat`) -- fetched automatically on first run via `az keyvault`.
- All test users provisioned by `CftLibConfig` use the password `password`; XUI is accessible at `http://localhost:3455`.

## Prerequisites

- Java 21
- Docker (running) with at least **10 GB memory** allocated (Docker Desktop defaults to 2 GB, which is insufficient)
- Azure CLI (`az`) authenticated with access to the relevant Key Vault (only for stitching, NPA, and HRS)
- Azure Container Registry login: `az acr login --name hmctspublic` (required to pull the DM Store image from `hmctsprod.azurecr.io`)
- Gradle wrapper (`./gradlew`) available in the repo root
- Membership of the HMCTS `evidence` GitHub team (https://github.com/orgs/hmcts/teams/evidence) for repo access

## Which repos support cftlib

| Repo | Plugin version | Additional databases | Docker Compose | Key Vault |
|------|---------------|---------------------|----------------|-----------|
| `em-annotation-api` | `0.19.2134` | `emannotationapp` | No | None |
| `em-stitching-api` | `0.19.2133` | `emstitch,evidence` | Yes (DM Store + Azurite) | `em-stitching-aat` |
| `em-native-pdf-annotator-app` | `0.19.2134` | `emnpa,evidence` | Yes (DM Store + Azurite) | `em-npa-aat` |
| `em-hrs-api` | `0.19.2133` | `emhrs` | Yes (Azurite only) | `em-hrs-api-aat` |
<!-- DIVERGENCE: Confluence "Developer Environments" page and earlier draft stated HRS uses DM Store + Azurite, but em-hrs-api:src/cftlib/resources/docker-compose-local.yml shows only Azurite (no DM Store container). Source wins. -->

## Run em-annotation-api locally

1. Change into the repo directory:
   ```bash
   cd apps/em/em-annotation-api
   ```

2. Run the `bootWithCCD` task:
   ```bash
   ./gradlew bootWithCCD
   ```

3. Wait for startup. The task provisions IDAM roles (`caseworker`, `caseworker-publiclaw`) and imports the CCD definition from `src/aat/resources/adv_annotation_functional_tests_ccd_def.xlsx` (`CftLibConfig.java:16-19`).

4. The annotation API is available at `http://localhost:8080`. Hot-reload is active via `spring-boot-devtools` (`build.gradle:223`).

## Run em-stitching-api locally

1. Change into the repo directory:
   ```bash
   cd apps/em/em-stitching-api
   ```

2. Ensure Docker is running. The task will launch DM Store and Azurite containers automatically.

3. Run the `bootWithCCD` task:
   ```bash
   ./gradlew bootWithCCD
   ```
   On first run, the `loadEnvSecrets` task fetches secrets from the `em-stitching-aat` Key Vault and writes them to `.aat-env`. If you need to refresh secrets later, run `./gradlew reloadEnvSecrets` (`build.gradle:433`).

4. The task launches a `docker-compose-local.yml` that starts:
   - **DM Store** on port `4603` (connected to the `evidence` database on cftlib's Postgres at `host.docker.internal:6432`)
   - **Azurite** blob emulator on port `10000`

   See `src/cftlib/resources/docker-compose-local.yml`.

5. `CftLibConfig` creates IDAM users/profiles, provisions roles (`caseworker`, `caseworker-publiclaw`, `ccd-import`), configures AM role assignments, and imports the CCD definition from `src/aat/resources/adv_stitching_functional_tests_ccd_def.xlsx` (`CftLibConfig.java:20-37`).

6. The stitching API runs on port `4630`. Spring Batch scheduling is active so submitted `DocumentTask` jobs will be processed automatically.

### Key environment variables set by the task

| Variable | Value | Purpose |
|----------|-------|---------|
| `RSE_LIB_ADDITIONAL_DATABASES` | `emstitch,evidence` | Creates the stitching and DM Store databases |
| `DATA_STORE_S2S_AUTHORISED_SERVICES` | `ccd_gw,ccd_data,...,em_ccd_orchestrator` | Permits S2S calls to CCD data store |
| `CASE_DOCUMENT_S2S_AUTHORISED_SERVICES` | `em_gw,em_stitching_api,...` | Permits S2S calls to CDAM |
| `DM_STORE_BASE_URL` | `http://localhost:4603` | Points stitching at the local DM Store container |
| `DOC_ASSEMBLY_SERVER_PORT` | `8081` | Avoids port conflict |

## Run em-native-pdf-annotator-app locally

1. Change into the repo directory:
   ```bash
   cd apps/em/em-native-pdf-annotator-app
   ```

2. Run:
   ```bash
   ./gradlew bootWithCCD
   ```
   Secrets are fetched from the `em-npa-aat` Key Vault (secret name: `em-npa-dot-env`) on first run. Docker containers (DM Store + Azurite) are launched from `src/cftlib/resources/docker-compose-local.yml`. The additional databases created are `emnpa,evidence` (`build.gradle:611`).

3. `CftLibConfig` creates profiles for `bundle-tester@gmail.com` and `redactionTestUser2@redactiontest.com` (jurisdiction `PUBLICLAW`, case type `CCD_BUNDLE_MVP_TYPE_ASYNC`), provisions roles (`caseworker`, `caseworker-publiclaw`, `ccd-import`), configures AM role assignments, and imports `src/aat/resources/adv_redaction_functional_tests_ccd_def.xlsx`.

4. NPA also explicitly sets `SPRING_DATASOURCE_USERNAME=postgres` and `SPRING_DATASOURCE_PASSWORD=postgres` in the `doFirst` block, and connects to S2S via AAT URL (`S2S_URL=http://rpe-service-auth-provider-aat.service.core-compute-aat.internal`). The NPA service runs on port `8080` (Spring Boot default).

## Run em-hrs-api locally

1. Change into the repo directory:
   ```bash
   cd apps/em/em-hrs-api
   ```

2. Run:
   ```bash
   ./gradlew bootWithCCD
   ```
   Secrets are fetched from the `em-hrs-api-aat` Key Vault (secret name: `em-hrs-api-dot-env`). Docker containers are launched -- **Azurite only** (no DM Store, unlike stitching/NPA). The additional database is `emhrs` (`build.gradle:569`). The HRS API runs on port `8081` (configured via `HRS_API_SERVER_PORT`).

3. `CftLibConfig` provisions multiple test users with HRS-specific roles (`caseworker-hrs`, `caseworker-hrs-searcher`, `cft-ttl-manager`, `caseworker-hrs-systemupdate`). It also configures AM role assignments by looking up the IDAM user ID for the searcher user. The CCD definition imported is `src/functionalTest/resources/CCD_HRS_v1.8-AAT.xlsx`.

4. Key test users (all use password `password`):
   - `hrs.tester@hmcts.net` -- full HRS roles
   - `em-test-searcher@test.hmcts.net` -- searcher role
   - `em-test-requestor@test.hmcts.net` -- caseworker only
   - `em-test-citizen@test.hmcts.net` -- citizen only

5. HRS also sets a custom `CCD_DOCUMENT_URL_PATTERN` that matches both DM Store URLs and HRS recording URLs:
   ```
   https?://((dm-store:8080/documents/[A-Za-z0-9-]+(?:/binary)?)|(localhost:8081/hearing-recordings/...))
   ```

## Test users and XUI access

Once any EM service is running via `bootWithCCD`, the local XUI (CCD case management UI) is available at **http://localhost:3455**. All test users provisioned by `CftLibConfig` use the password `password`.

| Service | Test user email | Roles |
|---------|----------------|-------|
| Annotation | `local.test@example.com` (cftlib default) | `caseworker`, `caseworker-publiclaw` |
| Stitching | `stitchingTestUser@stitchingTest.com` | `caseworker`, `caseworker-publiclaw` |
| Stitching | `bundle-tester@gmail.com` | (profile only, no explicit IDAM user) |
| NPA | `redactionTestUser2@redactiontest.com` | (profile only) |
| NPA | `bundle-tester@gmail.com` | (profile only) |
| HRS | `hrs.tester@hmcts.net` | `citizen`, `caseworker`, `caseworker-hrs`, `caseworker-hrs-searcher`, `cft-ttl-manager`, `caseworker-hrs-systemupdate` |
| HRS | `em-test-searcher@test.hmcts.net` | `citizen`, `caseworker`, `caseworker-hrs`, `caseworker-hrs-searcher` |
| HRS | `em-test-requestor@test.hmcts.net` | `citizen`, `caseworker` |

## Test stitching end-to-end locally

Once `em-stitching-api` is running via `bootWithCCD`:

1. Upload one or more documents to DM Store (port `4603`) or CDAM (provided by cftlib). Note the document URIs returned.

2. POST a `DocumentTask` to the stitching API:
   ```bash
   curl -X POST http://localhost:4630/api/document-tasks \
     -H "Authorization: Bearer <idam-token>" \
     -H "ServiceAuthorization: <s2s-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "bundle": {
         "bundleTitle": "Test Bundle",
         "fileName": "test-bundle",
         "hasTableOfContents": true,
         "hasCoversheets": false,
         "documents": [
           { "docTitle": "Doc 1", "documentURI": "<dm-store-doc-uri>", "sortIndex": 0 },
           { "docTitle": "Doc 2", "documentURI": "<dm-store-doc-uri>", "sortIndex": 1 }
         ]
       },
       "caseTypeId": "CCD_BUNDLE_MVP_TYPE_ASYNC",
       "jurisdictionId": "PUBLICLAW"
     }'
   ```
   The response includes a task `id` and `taskState: "NEW"`.

3. The Spring Batch job polls every 6 seconds (default `spring.batch.document-task-milliseconds: 6000`). Wait a few seconds, then poll the task status:
   ```bash
   curl http://localhost:4630/api/document-tasks/<task-id> \
     -H "Authorization: Bearer <idam-token>" \
     -H "ServiceAuthorization: <s2s-token>"
   ```
   When `taskState` is `DONE`, the `bundle.stitchedDocumentURI` field contains the merged PDF URI.

4. If `caseTypeId` and `jurisdictionId` are both populated, the CDAM path is used for download/upload. To exercise the legacy DM Store path instead, omit those fields from the request.

## Verify

- After starting any EM service with `bootWithCCD`, confirm the health endpoint returns `UP`:
  ```bash
  curl http://localhost:<port>/health
  ```
  Ports: annotation API = `8080`, stitching API = `4630`, NPA = `8080`, HRS = `8081`.

- For stitching, confirm the batch job processed a task by checking the task state transitions from `NEW` to `IN_PROGRESS` to `DONE`.

## Tips and tricks

- **Remote debugging in IntelliJ**: Add a `jvmArgs` line to the `bootWithCCD` block in `build.gradle`:
  ```groovy
  jvmArgs = ['-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5006']
  ```
  Then create a Remote Debug run configuration in IntelliJ on port `5006`. The task will wait for the debugger to attach before proceeding.
  <!-- CONFLUENCE-ONLY: not verified in source -->

- **IntelliJ Gradle panel**: The `bootWithCCD` task is accessible in the Gradle tool window under Tasks. You can run or debug it directly from there without using the terminal.
  <!-- CONFLUENCE-ONLY: not verified in source -->

- **Clean boot**: Docker containers persist between runs. To force a fresh start, set the environment variable `RSE_LIB_CLEAN_BOOT=true` before running `bootWithCCD`, or manually tear down containers with:
  ```bash
  docker compose -f src/cftlib/resources/docker-compose-local.yml -p cftlib-additional down -v
  ```
  <!-- CONFLUENCE-ONLY: not verified in source -->

- **Full callback logging**: Add `environment 'LOG_CALLBACK_DETAILS', '*'` to the `bootWithCCD` block to produce full logging of case data sent between callbacks.
  <!-- CONFLUENCE-ONLY: not verified in source -->

- **Refreshing secrets**: If your `.aat-env` file is stale (e.g., after Key Vault rotation), run `./gradlew reloadEnvSecrets` to delete and re-fetch it.

## Troubleshooting

- **`az keyvault` fails**: Ensure you are logged into Azure CLI (`az login`) and have access to the relevant vault (e.g., `em-stitching-aat`). Delete `.aat-env` and re-run if the file is stale.
- **Port conflicts**: DM Store binds to `4603`, Azurite to `10000`. Ensure nothing else occupies those ports. The `DOC_ASSEMBLY_SERVER_PORT=8081` setting avoids a common clash.
- **Docker containers not starting**: The task runs `docker compose -f src/cftlib/resources/docker-compose-local.yml -p cftlib-additional up -d`. Verify Docker is running and the images can be pulled (`hmctsprod.azurecr.io/dm/store:latest`). You must have run `az acr login --name hmctspublic` first.
- **Logback conflict**: If you see duplicate SLF4J binding warnings, cftlib already excludes `logback-classic` from `cftlibTestImplementation` configurations.
- **Transient network failures**: cftlib startup may fail on flaky networks. Simply re-run `./gradlew bootWithCCD` -- the existing containers will be reused.
- **CCD definition changes not propagating**: Delete any locally generated spreadsheet and re-run. The definition import happens during startup via `CftLibConfig`.
- **"Idam not ready..." loop**: Check that `docker-compose` is installed and at version 1.28+. On WSL2, Docker Desktop can interfere -- prefer Docker Engine.

## See also

- [Architecture](../explanation/architecture.md) — service inventory table showing which repos are stateful, their ports, and S2S names — useful context before starting a local stack
- [Trigger Bundle Stitching](trigger-bundle-stitching.md) — once `em-stitching-api` is running locally, follow this guide to test an end-to-end bundle stitching flow
- [Add Annotations](add-annotations.md) — once `em-annotation-api` is running locally, follow this guide to test annotation creation via the API
- [Glossary](../reference/glossary.md#rse-cft-lib--bootwithccd) — definition of `rse-cft-lib` and the `bootWithCCD` Gradle task
