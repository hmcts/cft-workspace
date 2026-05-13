---
title: Api Hrs
topic: hrs
diataxis: reference
product: em
audience: both
sources:
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/controller/HearingRecordingController.java
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/controller/FolderController.java
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/controller/BlobStoreInspectorController.java
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/dto/HearingRecordingDto.java
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/dto/HearingSource.java
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/impl/SegmentDownloadServiceImpl.java
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/impl/PermissionEvaluatorImpl.java
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/config/security/SecurityConfiguration.java
  - em-hrs-api:src/main/resources/application.yaml
  - em-hrs-api:src/main/resources/ttl_service_map.json
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/domain/HearingRecording.java
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/domain/HearingRecordingSegment.java
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/domain/AuditActions.java
  - em-hrs-ingestor:src/main/java/uk/gov/hmcts/reform/em/hrs/ingestor/parse/FilenameParser.java
status: needs-fix
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/em/em-hrs-ingestor/src/main/java/uk/gov/hmcts/reform/em/hrs/ingestor/parse/FilenameParser.java
confluence:
  - id: "1468013320"
    title: "Hearing Recording Storage and Ingestion Service"
    last_modified: "unknown"
    space: "RDM"
  - id: "1460539669"
    title: "HRS - HLD Ingestion of CVP hearing recordings"
    last_modified: "unknown"
    space: "RDM"
  - id: "1689786541"
    title: "HRS - HLD Ingestion of VH hearing recordings"
    last_modified: "unknown"
    space: "RDM"
  - id: "1454904992"
    title: "HRS - Data Items"
    last_modified: "unknown"
    space: "RDM"
  - id: "1856144729"
    title: "HRS Role Assignments"
    last_modified: "unknown"
    space: "RDM"
  - id: "1824136756"
    title: "HRS - Retain & Dispose"
    last_modified: "unknown"
    space: "RDM"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- HRS API (`em-hrs-api`) stores hearing recording metadata and serves audio/video segments to authorised users.
- Ingest endpoint (`POST /segments`) accepts recording metadata from `em-hrs-ingestor` and queues blob-copy from CVP/VH to the HRS container.
- Download is gated by IDAM role (`caseworker-hrs-searcher`, `caseworker-hrs`) or sharee email grant with 72-hour expiry.
- All endpoints require both S2S token (from whitelist) and IDAM JWT.
- Hearing sources supported: `CVP` (Cloud Video Platform) and `VH` (Video Hearings).
- TTL is per-service-code (from `ttl_service_map.json`), defaulting to `P20Y` when no mapping exists.

## Endpoints

### Ingest

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/segments` | S2S + IDAM | Submit a recording segment for ingest |
| `GET` | `/folders/{name}` | S2S only | List filenames already held in a folder |

### Download and sharing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/hearing-recordings/{recordingId}/segments/{segmentId}` | S2S + IDAM + permission check | Download a recording segment |
| `POST` | `/sharees` | S2S + IDAM | Grant access to a recording via email (triggers GOV.UK Notify) |

### Administration

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `DELETE` | `/delete` | S2S (whitelist: `ccd_case_disposer`, `em_gw`) + IDAM | Delete a hearing recording (TTL disposal) |

### Report (unsecured path, API-key protected)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/report` | API key (Bearer token, base64-encoded key:expiry) | Storage report summary |
| `GET` | `/report/hrs/{hearingSource}/{blobName}` | API key | Inspect a specific blob (hearingSource must be `CVP`) |

### Unsecured

| Path | Description |
|------|-------------|
| `/health/**` | Spring Boot Actuator health |
| `/swagger-ui/**` | Swagger UI |
| `/v3/api-docs/**` | OpenAPI spec |
| `/report/**` | Report endpoints (API-key gated internally) |

## POST /segments

Accepts a `HearingRecordingDto` JSON body. Returns `202 Accepted` if successfully queued for ingest, or `429 Too Many Requests` if the internal queue is full.

### Request body

```json
{
  "folder": "room-001-20240315",
  "recordingRef": "hearing-abc-123",
  "caseRef": "1234567890123456",
  "hearingLocationCode": "101",
  "hearingRoomRef": "Room 1",
  "hearingSource": "CVP",
  "jurisdictionCode": "CIVIL",
  "serviceCode": "AAA6",
  "recordingDateTime": "2024-03-15-10.30.00.000",
  "filename": "room-001-20240315-segment-0.mp4",
  "fileExtension": ".mp4",
  "fileMd5Checksum": "d41d8cd98f00b204e9800998ecf8427e",
  "fileSizeMb": 250.5,
  "recordingSegment": 0,
  "interpreter": false,
  "sourceBlobUrl": "https://cvp.blob.core.windows.net/recordings/room-001-20240315-segment-0.mp4"
}
```

The `recordingDateTime` format is `yyyy-MM-dd-HH.mm.ss.SSS` (`HearingRecordingDto.java:33`).

Valid `hearingSource` values: `CVP`, `VH` (`HearingSource.java`).

### Processing

1. Controller offers the DTO to a `LinkedBlockingQueue` (`HearingRecordingController.java:119`).
2. `IngestionJob` (Quartz, fires every `hrs.ingestion-interval-in-seconds` — default 1s) polls the queue.
3. A `JobInProgress` row is registered to prevent duplicate submission.
4. `HearingRecordingStorageImpl.copyRecording` generates a SAS token and uses `BlockBlobClient.beginCopy` to copy the blob from the CVP source container to the HRS destination container (`HearingRecordingStorageImpl.java:176-183`).
5. If the destination blob already exists with non-zero size, copy is skipped (`HearingRecordingStorageImpl.java:147-149`).
6. On success, the DTO is forwarded to `ccdUploadQueue` for asynchronous CCD case creation.

### CCD case creation

On successful blob copy, HRS creates or updates a CCD case:
<!-- CONFLUENCE-ONLY: not verified in source -->
- If no existing CCD case matches the recording reference + datetime, a new case is created under case type `HearingRecordings`.
- If a case already exists, additional segments are attached as CCD documents.
- The CCD case stores metadata: filename, cloudroom name, jurisdiction, court/location code, case reference, hearing date/time, service code, and file size.

## GET /folders/{name}

Returns the set of filenames HRS already holds (or has in progress) for a given folder. Used by `em-hrs-ingestor` to avoid re-submitting known segments.

### Response body

```json
{
  "folder-name": "room-001-20240315",
  "filenames": [
    "room-001-20240315-segment-0.mp4",
    "room-001-20240315-segment-1.mp4"
  ]
}
```

The response includes both completed segment filenames and filenames with in-progress jobs (`FolderServiceImpl.java:46-57`). If the folder does not exist, it is created and an empty set is returned.

## GET /hearing-recordings/{recordingId}/segments/{segmentId}

Downloads a recording segment as binary audio/video with range-request support.

### Access control

Access is evaluated by `PermissionEvaluatorImpl` (`SegmentDownloadServiceImpl.java:157`):

1. If the user's IDAM roles include `caseworker-hrs-searcher` or `caseworker-hrs` — access granted unconditionally (`PermissionEvaluatorImpl.java:71-78`).
2. Otherwise, if the user's email matches a `HearingRecordingSharee` record for the recording — access granted, subject to 72-hour expiry from `sharedOn` timestamp (`application.yaml:155`).
3. Otherwise — `403 Forbidden`, with `AuditActions.USER_DOWNLOAD_UNAUTHORIZED` logged.

### Audit actions

All download attempts are logged using `AuditActions` (`AuditActions.java`):

| Action | When |
|--------|------|
| `USER_DOWNLOAD_REQUESTED` | Download request received |
| `USER_DOWNLOAD_OK` | Download served successfully |
| `USER_DOWNLOAD_UNAUTHORIZED` | Permission denied |
| `USER_DOWNLOAD_FAIL` | Download failed (e.g. blob not found) |

## POST /sharees

Grants download access to a recording for a specified email address. Triggers a GOV.UK Notify email (template `1e10b560-4a3f-49a7-81f7-c3c6eceab455`) containing segment download links.

Notify personalisation keys: `case_reference`, `hearing_recording_datetime`, `hearing_recording_segment_urls` (`NotificationServiceImpl.java:59-62`).

### Audit actions for sharing

| Action | When |
|--------|------|
| `SHARE_GRANT_OK` | Share successfully created |
| `SHARE_GRANT_FAIL` | Share creation failed |
| `NOTIFY_OK` | Email sent successfully |
| `NOTIFY_FAIL` | Email sending failed |

## S2S service whitelist

The `idam.s2s-authorised.services` configuration (`application.yaml:103`) controls which services may call the API:

| Service name | Purpose |
|--------------|---------|
| `ccd_gw` | CCD API Gateway |
| `em_gw` | EM Gateway |
| `em_hrs_ingestor` | Ingestor submitting segments |
| `xui_webapp` | XUI frontend |
| `ccd` | CCD services |
| `ccd_data` | CCD Data Store |
| `ccd_case_disposer` | TTL-based case disposal |

The DELETE endpoint has a separate, stricter whitelist (`application.yaml:217`): `ccd_case_disposer`, `em_gw`.

## Connectivity and authorisation

The end-to-end solution uses these authorisation mechanisms:

| From | To | Access | Mechanism |
|------|----|--------|-----------|
| `em-hrs-ingestor` | CVP/VH Azure Blob Storage | List, Read | "Storage Blob Data Reader" IAM role via AKS Managed Identity |
| `em-hrs-api` | CVP/VH Azure Blob Storage | Read, Create SAS Token | "Storage Blob Data Reader" + "Storage Blob Delegator" IAM roles |
| `em-hrs-api` | HRS Blob Storage | Contributor | CNP Bootstrap managed identity |
| `em-hrs-ingestor` | `em-hrs-api` | REST (GET folders, POST segments) | S2S OAuth (`em_hrs_ingestor`) |
| `em-hrs-api` | CCD Data Store | REST (create/amend case) | IDAM system user + S2S (`em_hrs_api`) |
| `em-hrs-api` | GOV.UK Notify | REST (send email) | Private API key |
| XUI / ExUI proxy | `em-hrs-api` | REST (download, share) | S2S (`xui_webapp`) + user IDAM |
<!-- CONFLUENCE-ONLY: not verified in source -->

## Domain model

### HearingRecording

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `recordingRef` | String | Unique within folder |
| `caseRef` | String | Case reference (human-readable) |
| `ccdCaseId` | Long | Unique — one CCD case per recording |
| `hearingLocationCode` | String | Court/location code |
| `hearingRoomRef` | String | Room identifier |
| `hearingSource` | String | `CVP` or `VH` |
| `jurisdictionCode` | String | |
| `serviceCode` | String | 4-char service code (e.g. `AAA6`, `BBA1`) |
| `ttl` | LocalDate | Retention expiry (default `P20Y`) |
| `deleted` | boolean | Soft-delete flag |
| `folder` | Folder (FK) | Grouping container |
| `segments` | Set<HearingRecordingSegment> | Audio/video files |
| `sharees` | Set<HearingRecordingSharee> | Access grants |

Unique constraints: `(folder_id, recordingRef)` and `ccd_case_id` (`V1__baseline_migration.sql:65-67`).

### HearingRecordingSegment

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `filename` | String | Globally unique — dedup key |
| `fileExtension` | String | e.g. `.mp4` |
| `fileMd5Checksum` | String | Source file hash |
| `fileSizeMb` | BigDecimal | Segment size |
| `ingestionFileSourceUri` | String | CVP/VH source blob URL |
| `recordingLengthMins` | Integer | Duration |
| `recordingSegment` | Integer | 0-based segment ordinal |
| `interpreter` | Boolean | Interpreter audio flag |
| `mimeType` | String | e.g. `video/mp4` (added V14) |
| `blobUuid` | String | HRS blob container reference |

## Filename parsing (em-hrs-ingestor)

The `em-hrs-ingestor` parses CVP/VH filenames to extract metadata before posting to HRS API. Parsing is handled by `FilenameParser.java` which tries these regex patterns in order:

### Format 1: Royal Courts of Justice with location (courts 0372, 0266)

```
^([A-Z]{3}\d)-(0372|0266)-([A-Z0-9-]*)_([0-9-.]*)-([A-Z]{3})_(\d+)$
```

Example: `AAA6-0372-G00NT095_2024-03-15-10.30.00.000-UTC_0`

### Format 2: Civil and Family (with 3-4 digit location code)

```
^([A-Z]{3}\d)-(\d{3,4})-([A-Z0-9-]*)_([0-9-.]*)-([A-Z]{3})_(\d+)$
```

Example: `ABA5-0150-SA20P00766_2024-03-15-10.30.00.000-UTC_0`

### Format 3: Tribunals / RCJ without location

```
^([A-Z]{3}\d)-([A-Z0-9-]*)_([0-9-.]*)-([A-Z]{3})_(\d+)$
```

Example: `BFA1-HU-01234-2018_2024-03-15-10.30.00.000-UTC_0`

### Format 4: Minimal fallback (timestamp + segment only)

```
^(.*?)_([0-9-.]*)-([A-Z]{3})_(\d+)$
```

If no pattern matches, a `FilenameParsingException` is thrown.

### Extracted fields

1. **Service code** — 4 characters (`[A-Z]{3}\d`), maps to TTL via `ttl_service_map.json`
2. **Location code** — 3-4 digit court code (4-digit codes have leading zero stripped)
3. **Case reference** — alphanumeric case ID
4. **Recording date/time** — `yyyy-MM-dd-HH.mm.ss.SSS` with timezone
5. **Segment number** — integer after final underscore

<!-- DIVERGENCE: Confluence "Data Items" page (1454904992) describes 2-letter jurisdiction codes (CV, FM, CP, EE, etc.) in filenames. But em-hrs-ingestor:FilenameParser.java shows the current regex expects 4-char service codes ([A-Z]{3}\d like AAA6, ABA5). The 2-letter codes represent the older CVP-era naming before service code adoption. Source wins. -->

### Jurisdiction codes (legacy reference)

The original CVP naming used 2-letter jurisdiction codes. These are now superseded by 4-character service codes but may still appear in historic filenames matched by the fallback regex:

| Code | Jurisdiction |
|------|-------------|
| `CV` | Civil |
| `FM` | Family |
| `CP` | Court of Protection |
| `EE` | Employment Tribunal (England & Wales) |
| `ES` | Employment Tribunal (Scotland) |
| `GR` | General Regulatory Chamber |
| `IA` | Immigration and Asylum |
| `PC` | Property Chamber |
| `SE` | Social Entitlement Chamber |
| `TC` | Tax Chamber |
| `WP` | War Pensions |
| `CI` | Civil Appeals |
| `QB` | Admin Court / QB General |
| `HF` | High Court Family |
| `BP` | Business & Property Courts |
| `SC` | Senior Courts Costs Office |
| `CR` | Criminal Appeals |

## TTL (time-to-live) and retention

Recording TTL is determined per-service-code via a static lookup (`ttl_service_map.json`):

| Service code pattern | TTL | Approximate jurisdiction |
|---------------------|-----|------------------------|
| `AAA*`, `ABA*` | `P6Y` (6 years) | Civil |
| `BBA*`, `BCA*`, `BDA*`, `BGA*`, `BHA*`, `BAA*`, `BAB*`, `BAC*`, `BEA*`, `BFA*`, `BTA*`, `BLA*`, `BIA*`, `BKA*`-`BKC*`, `BMA*` | `P20Y` (20 years) | Family, Tribunals |
| `ZZZ0`, `ZZY1` | `P20Y` (20 years) | Test/unknown |
| Unmapped codes | `P20Y` (default) | Fallback |

<!-- DIVERGENCE: Confluence "HRS - Retain & Dispose" page (1824136756) states default TTL for unknown service/jurisdiction is "7 years". But em-hrs-api:src/main/resources/application.yaml:209 shows `default-ttl: ${DEFAULT_TTL:P20Y}` (20 years). Source wins. -->

The Retain & Dispose integration uses `ccd_case_disposer` to call the `DELETE /delete` endpoint when a case's TTL has expired. The feature flag `DELETE_CASE_ENDPOINT_ENABLED` (default `true`) controls whether the endpoint is active.

## Role assignments (planned)

HRS is migrating from IDAM-role-based access to Role Assignment Service (RAS):

| Role name | Description | Phase |
|-----------|-------------|-------|
| `hrs-team-leader` | Full access to all hearings for all services | Phase 1 |
| `hrs-listener` | Listen to recordings (skill-scoped) | Phase 2 |
| `hrs-sharer` | Share recordings (skill-scoped) | Phase 2 |

Skill codes follow the pattern `SKILL:HRS:<key>` where `<key>` maps to a case access category (e.g. `AA` = Civil, `AB` = Family, `BF` = Immigration and Asylum).
<!-- CONFLUENCE-ONLY: not verified in source -->

## Configuration

| Property | Env var | Default | Description |
|----------|---------|---------|-------------|
| `hrs.ingestion-interval-in-seconds` | — | `1` | Quartz poll interval per pod |
| `hrs.allowed-roles` | `ALLOWED_ROLES` | `caseworker-hrs-searcher,caseworker-hrs` | IDAM roles with unconditional download access |
| `idam.s2s-authorised.services` | `S2S_NAMES_WHITELIST` | See whitelist table above | S2S service name whitelist |
| `endpoint.deleteCase.enabled` | `DELETE_CASE_ENDPOINT_ENABLED` | `true` | Feature flag for DELETE endpoint |
| `authorisation.deleteCase.s2s-names-whitelist` | `DELETE_CASE_S2S_WHITELIST` | `ccd_case_disposer,em_gw` | S2S whitelist for DELETE |
<!-- REVIEW: Property name is 'shareelink.ttl' in application.yaml:155, not 'sharee.validity-in-hours'. The Java field injected via @Value("${shareelink.ttl}") is named validityInHours. Value 72 is correct. -->
| `sharee.validity-in-hours` | — | `72` | Sharee link expiry (hours) |
| `ttl.default-ttl` | `DEFAULT_TTL` | `P20Y` | Default recording retention |
| `hrs.use-ad-auth` | `USE_AD_AUTH_FOR_SOURCE_BLOB_CONNECTION` | — | Switch to user-delegation SAS via managed identity |
| `report.api-key` | — | — | Base64-encoded API key for `/report` endpoints |

## Ingestor scheduling

The `em-hrs-ingestor` is deployed as a Kubernetes CronJob:
<!-- CONFLUENCE-ONLY: not verified in source -->
- Frequency: 30-minute intervals, staggered between production clusters, during off-peak hours (9pm-5am).
- On/off switch via flux environment variables `ENABLE_CRON_JOB` and `MAX_FILES_TO_PROCESS`.
- Concurrency policy: `Forbid` — parallel runs are not permitted.
- If duplicate ingestion occurs (e.g. overlapping schedules), warnings are logged but no duplicate data is created due to filename uniqueness constraints.
- If any file fails ingestion, it will be retried on the next cycle.

## Examples

### FilenameParser: regex constants

The four regex patterns that `em-hrs-ingestor` applies to CVP/VH filenames, in declaration order. All patterns are compiled with `Pattern.CASE_INSENSITIVE`.

```java
// Source: apps/em/em-hrs-ingestor/src/main/java/uk/gov/hmcts/reform/em/hrs/ingestor/parse/FilenameParser.java
// Priority 1: Royal Courts of Justice — courts 0372 (Strand) and 0266 (Rolls Building)
private static final String ROYAL_COURTS_OF_JUSTICE_FILE_WITH_LOCATION_FORMAT_REGEX
    = "^([A-Z][A-Z][A-Z]\\d)-(0372|0266)-([A-Z0-9-]*)_([0-9-.]*)-([A-Z]{3})_(\\d+)$";

// Priority 2: Civil and Family — 3 or 4 digit court location code
private static final String CIVIL_AND_FAMILY_FILE_FORMAT_REGEX
    = "^([A-Z][A-Z][A-Z]\\d)-(\\d{3,4})-([A-Z0-9-]*)_([0-9-.]*)-([A-Z]{3})_(\\d+)$";

// Priority 3: Tribunals / RCJ without location code
private static final String TRIBUNALS_FILE_FORMAT_REGEX
    = "^([A-Z][A-Z][A-Z]\\d)-([A-Z0-9-]*)_([0-9-.]*)-([A-Z]{3})_(\\d+)$";

// Priority 4: Minimal fallback — anything left of timestamp becomes caseRef
private static final String MINIMAL_FORMAT_REGEX
    = "^(.*?)_([0-9-.]*)-([A-Z]{3})_(\\d+)$";
```

Datetime parsing used by all patterns — timezone is extracted from the filename and applied via `ZoneId.of(timeZone)`:

```java
// Source: apps/em/em-hrs-ingestor/src/main/java/uk/gov/hmcts/reform/em/hrs/ingestor/parse/FilenameParser.java
public static LocalDateTime processRawDatePart(final String rawDatePart, final String timeZone) {
    DateTimeFormatter datePattern =
        DateTimeFormatter.ofPattern("yyyy-MM-dd-HH.mm.ss.SSS").withZone(ZoneId.of(timeZone));
    return LocalDateTime.parse(rawDatePart, datePattern);
}
```

## See also

- [Hearing Recordings](../explanation/hearing-recordings.md) — full explanation of the ingest pipeline, blob polling, deduplication, access control, and business context for HRS
- [Architecture](../explanation/architecture.md) — how HRS fits in the EM service inventory and the ingest sequence diagram
- [Glossary](glossary.md#cvp-cloud-video-platform) — definitions for CVP, VH, HRS, `FilenameParser`, and `HearingSource`
