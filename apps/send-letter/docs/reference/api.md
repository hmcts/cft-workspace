---
title: Api
topic: architecture
diataxis: reference
product: send-letter
audience: both
sources:
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/SendLetterController.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/MediaTypes.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/ActionController.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/TaskController.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/model/in/LetterWithPdfsRequest.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/model/in/LetterWithPdfsAndNumberOfCopiesRequest.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/model/in/Doc.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/util/FileNameHelper.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/model/in/RecipientsValidator.java
  - send-letter-service:src/main/resources/application.yaml
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/LetterService.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/ResponseExceptionHandler.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/config/FtpConfigProperties.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/UploadLettersTask.java
  - send-letter-service:charts/rpe-send-letter-service/values.yaml
  - cnp-flux-config:apps/bsp/bp-cron-trigger-daily-processing/bp-cron-trigger-daily-processing.yaml
  - cnp-flux-config:apps/bsp/bp-cron-trigger-daily-processing/prod.yaml
  - cnp-flux-config:apps/bsp/bp-cron-trigger-daily-checks/bp-cron-trigger-daily-checks.yaml
  - cnp-flux-config:apps/bsp/bp-cron-trigger-daily-checks/prod.yaml
status: reviewed
last_reviewed: "2026-05-13T12:00:00Z"
examples_extracted_from:
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/controllers/SendLetterController.java
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/controllers/MediaTypes.java
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/model/in/LetterWithPdfsAndNumberOfCopiesRequest.java
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/model/in/Doc.java
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/services/util/FileNameHelper.java
confluence:
  - id: "531137194"
    title: "Send-Letter ( Bulk Print) On-boarding"
    last_modified: "unknown"
    space: "RBPS"
  - id: "1791333554"
    title: "Bulk Print - HLD and LLD v1.2"
    last_modified: "unknown"
    space: "RBPS"
  - id: "1875865980"
    title: "Integrating to Bulk Print"
    last_modified: "unknown"
    space: "RRFM"
  - id: "1891014156"
    title: "Implementing Send-letter-service aka bulk print"
    last_modified: "unknown"
    space: "RRFM"
  - id: "1440495919"
    title: "DTS - Bulk Print"
    last_modified: "unknown"
    space: "DATS"
  - id: "1199998192"
    title: "Work with Bulk Printing in COS"
    last_modified: "unknown"
    space: "DIV"
confluence_checked_at: "2026-05-13T00:00:00Z"
sources_sha:
  "send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/SendLetterController.java": "cd01b8cca8df1d5afd7c786701493045172a0eb8"
  "send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/MediaTypes.java": "cd01b8cca8df1d5afd7c786701493045172a0eb8"
  "send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/ActionController.java": "4ad8b8107eacb25c81d44a742a57b0b3bf5e66dc"
  "send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/TaskController.java": "0a0a5c69d4c39afc30fe01542905d1fbaa868171"
  "send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/model/in/LetterWithPdfsRequest.java": "9a5eeff0de681f8381cd779a2aee8fec74124747"
  "send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/model/in/LetterWithPdfsAndNumberOfCopiesRequest.java": "9a5eeff0de681f8381cd779a2aee8fec74124747"
  "send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/model/in/Doc.java": "9a5eeff0de681f8381cd779a2aee8fec74124747"
  "send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/util/FileNameHelper.java": "d5a03ebeda0f0ec72338d4a46b861766e0cc66e4"
  "send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/model/in/RecipientsValidator.java": "fafc1d84527b0687a12d30952ea72bba8474aeaa"
  "send-letter-service:src/main/resources/application.yaml": "3036dec3fa0c30be2662ec2c2bd52c60896d3cc9"
  "send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/LetterService.java": "cd01b8cca8df1d5afd7c786701493045172a0eb8"
  "send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/ResponseExceptionHandler.java": "3036dec3fa0c30be2662ec2c2bd52c60896d3cc9"
  "send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/config/FtpConfigProperties.java": "4ad8b8107eacb25c81d44a742a57b0b3bf5e66dc"
  "send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/UploadLettersTask.java": "523d1f48bf4ca1a73880d32b060a821831ea9a9a"
  "send-letter-service:charts/rpe-send-letter-service/values.yaml": "3036dec3fa0c30be2662ec2c2bd52c60896d3cc9"
  "cnp-flux-config:apps/bsp/bp-cron-trigger-daily-processing/bp-cron-trigger-daily-processing.yaml": "5ff8c9ce8e7878c290a3441f83d6625cee841b41"
  "cnp-flux-config:apps/bsp/bp-cron-trigger-daily-processing/prod.yaml": "40aead8406c136c315b5fd7b8c52be6ab8d94514"
  "cnp-flux-config:apps/bsp/bp-cron-trigger-daily-checks/bp-cron-trigger-daily-checks.yaml": "5ff8c9ce8e7878c290a3441f83d6625cee841b41"
  "cnp-flux-config:apps/bsp/bp-cron-trigger-daily-checks/prod.yaml": "1b458db65004dbaa087d5b36329c05aefa0c8669"
---

## TL;DR

- Send Letter Service exposes a REST API on port **8485** for submitting PDF letters for physical printing via Xerox and tracking their status.
- `POST /letters` requires S2S authentication (`ServiceAuthorization` header). GET status endpoints are unauthenticated (security by UUID obscurity; Spring Security is excluded from the build).
- `POST /letters` accepts two content types (v2 and v3); handler is selected by `Content-Type`, not URL path.
- The `type` field in the request body is a Xerox document type (e.g. `CMC001`, `SSCS001`) agreed during onboarding; it determines stationery, envelope format, and postage class.
- Admin/task endpoints (`/letters/{id}/mark-*`, `/tasks/*`) are protected by a static API key (`actions.api-key`).
- Published OpenAPI spec: `platops/cnp-api-docs/docs/specs/send-letter-service.json`.

## Authentication

| Mechanism | Applies to | Header | Validated by |
|---|---|---|---|
| S2S token | `POST /letters` only | `ServiceAuthorization` | `service-auth-provider-java-client` `AuthTokenValidator` |
| Static API key | `/letters/{id}/mark-*`, `/tasks/*` | `Authorization: Bearer <key>` | `ActionController`/`TaskController` inline check against `actions.api-key` config |
| None | `GET /letters/{id}`, `GET /letters/{id}/extended-status`, `GET /letters/v2/{id}` | -- | Unauthenticated (UUID is the secret) |

The S2S token identifies the calling service name. That name is used to look up the SFTP folder mapping in `ftp.service-folders` configuration. If no enabled mapping exists for the service, `POST /letters` returns **403** with the body `Service not configured` and nothing is persisted (`LetterService.java:144-148`, `ResponseExceptionHandler.java:211-215`). The folder configuration is therefore the effective authorisation list, not S2S registration alone.

Spring Security is explicitly excluded from the build (`build.gradle` excludes `spring-boot-starter-security`). The GET status endpoints rely on UUID unpredictability rather than token authentication.

## Public endpoints

### POST /letters

Submits one or more PDF documents for printing and posting. Returns a `letter_id` UUID immediately.

| Attribute | Details |
|---|---|
| Method | `POST` |
| Path | `/letters` |
| Content-Type (v2) | `application/vnd.uk.gov.hmcts.letter-service.in.letter.v2+json` |
| Content-Type (v3) | `application/vnd.uk.gov.hmcts.letter-service.in.letter.v3+json` |
| Auth | `ServiceAuthorization` header (S2S) |
| Query params | `isAsync` (String, default `"false"`) — when `"true"`, PDF assembly and DB write happen off the HTTP thread |

**v2 request body** (`LetterWithPdfsRequest`):

```json
{
  "type": "CMC001",
  "documents": [
    "<base64-encoded-pdf-bytes>",
    "<base64-encoded-pdf-bytes>"
  ],
  "additional_data": {
    "recipients": ["Name", "Address Line 1", "..."],
    "isInternational": false
  }
}
```

**v3 request body** (`LetterWithPdfsAndNumberOfCopiesRequest`):

```json
{
  "type": "CMC001",
  "documents": [
    { "copies": 2, "content": "<base64-encoded-pdf-bytes>" },
    { "copies": 1, "content": "<base64-encoded-pdf-bytes>" }
  ],
  "additional_data": {
    "recipients": ["Name", "Address Line 1", "..."],
    "isInternational": false
  }
}
```

**Validation constraints**:

| Field | Constraint | Source |
|---|---|---|
| `type` | `@NotEmpty` | `LetterWithPdfsRequest.java:29` |
| `documents` | `@Size(min=1, max=30)` | `LetterWithPdfsRequest.java:24` |
| `documents[].content` (v3) | `@NotEmpty` | `Doc.java:17` |
| `documents[].copies` (v3) | `@Min(1) @Max(100)` | `Doc.java:20-21` |
| `additional_data` | `@ValidRecipients` — must contain a non-empty `recipients` list | `LetterWithPdfsRequest.java:33`, `RecipientsValidator.java` |
| `additional_data` | Must not be `null` (validator rejects null) | `RecipientsValidator.java:48` |

**Response** (`SendLetterResponse`):

```json
{
  "letter_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Deduplication**: If a `Created` letter with a matching checksum already exists, the existing letter's UUID is returned instead of inserting a new record (`LetterService.java:151-162`).

**Error responses**:

| Status | Condition | Body | Source |
|---|---|---|---|
| 400 | Bean-validation failure, including a missing or empty `recipients` list | -- | `ResponseEntityExceptionHandler` default |
| 400 | PDF could not be read | `Invalid pdf` | `ResponseExceptionHandler.java:164-167` |
| 401 | Missing or invalid `ServiceAuthorization` header | -- | `ResponseExceptionHandler.java:105-108`, `:199-202` |
| 403 | Calling service has no enabled `ftp.service-folders` entry | `Service not configured` | `LetterService.java:144-148`, `ResponseExceptionHandler.java:211-215` |
| 409 | Unique-index collision on `(checksum, status)` | `Duplicate request` | `ResponseExceptionHandler.java:235-238` |

### GET /letters/{id}

Returns the current status of a letter.

| Attribute | Details |
|---|---|
| Method | `GET` |
| Path | `/letters/{id}` |
| Auth | **None** (unauthenticated; UUID serves as the access token) |
| Query params | `include-additional-info` (String, default `"false"`), `check-duplicate` (String, default `"false"`) |

The endpoint retries the DB lookup up to 3 times with 1-second sleeps to handle eventual consistency from async writes (`LetterService.java:554-566`).

When `check-duplicate=true`, the endpoint throws `DataIntegrityViolationException` if the UUID maps to a record in the `duplicates` table (`LetterService.java:689-699`).

### GET /letters/{id}/extended-status

Returns letter status plus the full `LetterStatusEvent` audit trail from the `letter_events` table.

| Attribute | Details |
|---|---|
| Method | `GET` |
| Path | `/letters/{id}/extended-status` |
| Auth | **None** (unauthenticated) |
| Query params | `include-additional-info` (String, default `"false"`), `check-duplicate` (String, default `"false"`) |
| Source | `SendLetterController.java:122-141` |

### GET /letters/v2/{id}

Returns status including the `copies` JSON field (per-document copy counts).

| Attribute | Details |
|---|---|
| Method | `GET` |
| Path | `/letters/v2/{id}` |
| Auth | **None** (unauthenticated) |
| Source | `SendLetterController.java:172-185` |

## Letter statuses

| Status | Description | Transition |
|---|---|---|
| `Created` | Letter saved to DB, awaiting upload | Initial state |
| `Uploaded` | Successfully uploaded to provider SFTP | `Created` -> `Uploaded` (by `UploadLettersTask`) |
| `Posted` | Provider confirmed physical posting via CSV report | `Uploaded` -> `Posted` (by `MarkLettersPostedService`) |
| `Aborted` | Manually aborted via admin endpoint | Any -> `Aborted` |
| `Skipped` | Folder mapping absent when `UploadLettersTask` reached the letter | `Created` -> `Skipped` |
| `FailedToUpload` | Non-IO exception during SFTP upload | `Created` -> `FailedToUpload` |
| `PostedLocally` | Manually marked via admin endpoint | Any -> `PostedLocally` |
| `NotSent` | Manually marked via admin endpoint | Any -> `NotSent` |
| `NoReportAborted` | Letter `Uploaded` > 7 days with no provider report | `Uploaded` -> `NoReportAborted` |

Callers typically see `Created`, `Uploaded`, `Posted`, `Aborted`. The remaining statuses are internal or administrative. `Skipped` is close to unreachable: submission already requires a folder mapping, so it only occurs when the mapping is removed between creation and upload (`UploadLettersTask.java:143-165`).

## Request field semantics

### `type` (Xerox document type)

The `type` field is a Xerox document type identifier agreed during service onboarding (e.g. `CMC001`, `SSCS001`). Xerox uses this to determine:

- Envelope format (e.g. C5, DL)
- Postage class (1st or 2nd class)
- Stationery selection
- Any envelope inserts
- Print-queue routing within Xerox

The service applies no validation to `type` beyond `@NotEmpty`. It strips underscores from the value, concatenates it into the upload filename, and reads it nowhere else (`FileNameHelper.java:100-117`). A wrong or misspelled type is accepted and uploaded, and surfaces only at the print provider's end.

New type values require coordination with Xerox (approximately 6-week lead time for new work).
<!-- CONFLUENCE-ONLY: not verified in source -->

### `additional_data`

A free-form `Map<String, Object>` that the service stores alongside the letter. Known keys with behavioural significance:

| Key | Type | Purpose | Used by |
|---|---|---|---|
| `recipients` | `List<String>` | **Required**. Recipient name/address lines. Validated by `RecipientsValidator` -- must be a non-empty list. | Validation layer |
| `isInternational` | `Boolean` | Marks the letter for international posting. Affects report-matching logic in `MarkLettersPostedService` and `CheckLettersPostedService`. | Report processing |
| `isIbca` | `Boolean` | When `true` and the service is `sscs`, inserts `_IB` infix into the upload filename (Infected Blood Compensation Authority letters). | `FileNameHelper.infectedBloodInfix()` |

Other keys (e.g. `letterType`, `caseId`, `caseRef`) are stored for auditing/tracking purposes. Xerox does **not** need to be informed about new `additional_data` values -- only the `type` field matters to them.

## File naming convention

When letters are uploaded to the Xerox SFTP server, the filename is generated by `FileNameHelper.generateName()`:

```
<type><ibInfix>_<service>_<ddMMyyyyHHmmss>_<uuid>.<ext>
```

| Component | Description | Example |
|---|---|---|
| `type` | Xerox document type (underscores stripped) | `CMC001` |
| `ibInfix` | `_IB` if SSCS + `isIbca=true`, otherwise empty | `_IB` |
| `service` | S2S service name (underscores stripped) | `cmcclaimstore` |
| `ddMMyyyyHHmmss` | Letter creation timestamp | `13052026143022` |
| `uuid` | Letter UUID | `550e8400-e29b-41d4-a716-446655440000` |
| `ext` | `pgp` if encryption enabled, otherwise `zip` | `zip` |

Full example: `CMC001_cmcclaimstore_13052026143022_550e8400-e29b-41d4-a716-446655440000.zip`

Source: `FileNameHelper.java:100-117`

## Service folder mapping

Each onboarded service has an entry in `ftp.service-folders` (application.yaml) mapping its S2S service name to an SFTP folder created by Xerox:

| S2S service name | SFTP folder |
|---|---|
| `cmc_claim_store` | `CMC` |
| `civil_service` | `CMC` (gated on `CIVIL_SERVICE_ENABLED`; `false` in `application.yaml:146`, `true` in every deployed environment) |
| `civil_general_applications` | `CMC` |
| `nfdiv_case_api` | `NFDIVORCE` |
| `divorce_frontend` | `DIVORCE` |
| `probate_backend` | `PROBATE` |
| `sscs` | `SSCS` |
| `finrem_document_generator` | `FINREM` |
| `finrem_case_orchestration` | `FINREM` |
| `fpl_case_service` | `FPL` |
| `prl_cos_api` | `PRIVLAW` |
| `pcs_api` | `PCS` |
| `send_letter_tests` | `BULKPRINT` |

An entry with `enabled: false` is dropped when the properties bind -- `setServiceFolders` filters on `isEnabled()` before building the map (`FtpConfigProperties.java:157-162`) -- so a disabled service is indistinguishable from an absent one and its submissions are rejected with 403.

## Encryption

PGP encryption of uploaded zip files is configurable:

| Config key | Env var | Default | Description |
|---|---|---|---|
| `encryption.enabled` | `ENCRYPTION_ENABLED` | `false` | Whether to PGP-encrypt zip files before SFTP upload |
| `encryption.publicKey` | `ENCRYPTION_PUBLIC_KEY` | (empty) | Xerox's PGP public key for encryption |

When enabled, the file extension changes from `.zip` to `.pgp` and the content is encrypted using `PgpEncryptionUtil.encryptFile()` with the configured public key.

The `application.yaml` default is not what deployments use. The Helm chart sets `ENCRYPTION_ENABLED: "true"` (`charts/rpe-send-letter-service/values.yaml:54`) and each non-production overlay sets it back to `false`, so production uploads `.pgp` and AAT, demo, ITHC and perftest upload `.zip`.

## Admin endpoints

Protected by `Authorization: Bearer <actions.api-key>` (static key from `ACTIONS_API_KEY` env var).

| Method | Path | Purpose |
|---|---|---|
| `PUT` | `/letters/{id}/mark-posted-locally` | Manually transition letter to `PostedLocally` |
| `PUT` | `/letters/{id}/mark-aborted` | Manually transition letter to `Aborted` |
| `PUT` | `/letters/{id}/mark-not-sent` | Manually transition letter to `NotSent` |

Source: `ActionController.java`

## Task endpoints

Also protected by the static API key.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/tasks/process-reports` | Triggers `MarkLettersPostedService` asynchronously (single-threaded executor) |
| `GET` | `/tasks/check-posted` | Triggers `CheckLettersPostedService.checkLetters()` |
| `GET` | `/tasks/processed-reports` | Queries the `reports` table for processed provider CSVs |

Source: `TaskController.java:57-109`

`POST /tasks/process-reports` is the only mechanism that triggers provider report processing; the service carries no `@Scheduled` trigger for it. In production the call is made by a separate Kubernetes CronJob, `bp-cron-trigger-daily-processing`, on the hour from 11:00 to 16:00 Monday to Friday, and `bp-cron-trigger-daily-checks` calls `GET /tasks/check-posted` on the half hour across the same window (`cnp-flux-config:apps/bsp/bp-cron-trigger-daily-processing/bp-cron-trigger-daily-processing.yaml:12-16`, `cnp-flux-config:apps/bsp/bp-cron-trigger-daily-checks/bp-cron-trigger-daily-checks.yaml:12-16`). Both triggers are disabled in their base HelmReleases and enabled only by the production overlays (`cnp-flux-config:apps/bsp/bp-cron-trigger-daily-processing/prod.yaml:9`, `cnp-flux-config:apps/bsp/bp-cron-trigger-daily-checks/prod.yaml:10`), so outside production these endpoints must be called by hand.

## OpenAPI spec

The published spec is available at `platops/cnp-api-docs/docs/specs/send-letter-service.json`. It is generated by the `ApplicationTest` integration test which writes to `/tmp/openapi-specs.json` and published via the `publish-openapi.yaml` workflow.

## Onboarding a new service

Integrating a new service requires coordination between your team, the Bulk Print team, and Xerox:

1. **Business engagement**: Contact the Bulk Print service manager to discuss requirements and complete the RFS (Request for Service) form and functional specification document.
2. **Xerox folder creation**: Xerox creates an SFTP folder for the service on both UAT and Production (~6 week lead time).
3. **Agree document type**: A Xerox document type code (e.g. `PCS001`) must be agreed between your service and Xerox. This determines envelope format, stationery, postage class.
4. **S2S registration**: Ensure your service is registered in `service-auth-provider-app`.
5. **Configuration changes**: The Bulk Print team adds entries to `ftp.service-folders` and `reports.service-config` in `application.yaml`.
6. **Client integration**: Add `send-letter-client` as a dependency. The client handles S2S token injection and provides typed API methods.

There is no S2S allow-list inside send-letter-service beyond the `service-folders` configuration. The only service-name check in the submission path is the folder lookup, and its failure is what produces the 403 (`LetterService.java:144-148`), so an enabled entry in that list is sufficient to submit letters.

**Document formatting requirements**: Templates must comply with Xerox formatting guidelines -- particularly letter margins and address-box positioning to fit the envelope window. The Bulk Print team can facilitate approval of templates with Xerox.

## Client library

Most services integrate via `send-letter-client` (Java):

```xml
<dependency>
  <groupId>com.github.hmcts</groupId>
  <artifactId>send-letter-client</artifactId>
</dependency>
```

The client provides `SendLetterApi` interface with methods for sending v2/v3 letters and checking status. It automatically handles S2S token injection.

## Examples

### POST /letters controller (v2 and v3)

```java
// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/controllers/SendLetterController.java

@RestController
@RequestMapping(path = "/letters", produces = {MediaType.APPLICATION_JSON_VALUE})
public class SendLetterController {

    // v2 endpoint — Content-Type: application/vnd.uk.gov.hmcts.letter-service.in.letter.v2+json
    @PostMapping(consumes = MediaTypes.LETTER_V2, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SendLetterResponse> sendLetter(
        @RequestHeader(name = "ServiceAuthorization", required = false) String serviceAuthHeader,
        @RequestParam(name = "isAsync", defaultValue = "false") String isAsync,
        @Valid @RequestBody LetterWithPdfsRequest letter
    ) {
        String serviceName = authService.authenticate(serviceAuthHeader);
        UUID letterId = letterService.save(letter, serviceName, isAsync);
        return ok().body(new SendLetterResponse(letterId));
    }

    // v3 endpoint — Content-Type: application/vnd.uk.gov.hmcts.letter-service.in.letter.v3+json
    @PostMapping(consumes = MediaTypes.LETTER_V3, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SendLetterResponse> sendLetter(
        @RequestHeader(name = "ServiceAuthorization", required = false) String serviceAuthHeader,
        @RequestParam(name = "isAsync", defaultValue = "false") String isAsync,
        @Valid @RequestBody LetterWithPdfsAndNumberOfCopiesRequest letter
    ) {
        String serviceName = authService.authenticate(serviceAuthHeader);
        UUID letterId = letterService.save(letter, serviceName, isAsync);
        return ok().body(new SendLetterResponse(letterId));
    }

    // Status endpoints — unauthenticated
    @GetMapping(path = "/{id}")
    public ResponseEntity<LetterStatus> getLetterStatus(@PathVariable String id,
        @RequestParam(name = "include-additional-info", defaultValue = "false") String isAdditionalInfoRequired,
        @RequestParam(name = "check-duplicate", defaultValue = "false") String isDuplicate) { ... }

    @GetMapping(path = "/{id}/extended-status")
    public ResponseEntity<LetterStatus> getExtendedLetterStatus(@PathVariable String id, ...) { ... }

    @GetMapping(path = "/v2/{id}")
    public ResponseEntity<LetterStatusV2> getLatestLetterStatus(@PathVariable String id) { ... }
}
```

### Content-type constants

```java
// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/controllers/MediaTypes.java

public static final String LETTER_V2 = "application/vnd.uk.gov.hmcts.letter-service.in.letter.v2+json";
public static final String LETTER_V3 = "application/vnd.uk.gov.hmcts.letter-service.in.letter.v3+json";
```

### v3 request model

```java
// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/model/in/LetterWithPdfsAndNumberOfCopiesRequest.java

public class LetterWithPdfsAndNumberOfCopiesRequest implements ILetterRequest {

    @Valid
    @Size(min = 1, max = 30)
    public final List<Doc> documents;

    @NotEmpty
    public final String type;

    @ValidRecipients
    public final Map<String, Object> additionalData;
}

// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/model/in/Doc.java

public class Doc {
    @NotEmpty
    public final byte[] content;   // base64-decoded by Jackson to byte[]

    @Min(1) @Max(100)
    public final int copies;
}
```

### File naming logic

```java
// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/services/util/FileNameHelper.java

public static String generateName(
    String type,
    String service,
    LocalDateTime createdAtDateTime,
    UUID id,
    Boolean isEncrypted,
    Map<String, Object> additionalData
) {
    return String.format(
        "%s%s_%s_%s_%s.%s",
        type.replace("_", ""),
        infectedBloodInfix(service, additionalData),
        service.replace("_", ""),
        createdAtDateTime.format(dateTimeFormatter),   // ddMMyyyyHHmmss
        id,
        Boolean.TRUE.equals(isEncrypted) ? "pgp" : "zip"
    );
}
// Example output: CMC001_cmcclaimstore_13052026143022_550e8400-e29b-41d4-a716-446655440000.zip
```

## See also

- [Letter Lifecycle](../explanation/letter-lifecycle.md) — explains the full state machine behind the statuses returned by the GET endpoints
- [Integrate from a service](../how-to/integrate-from-a-service.md) — step-by-step guide to calling `POST /letters` from a new service
- [Configuration reference](configuration.md) — `ftp.service-folders` mappings, encryption settings, and the `ACTIONS_API_KEY` secret
- [Troubleshoot upload failures](../how-to/troubleshoot-upload-failures.md) — how to use admin and task endpoints during incident response
