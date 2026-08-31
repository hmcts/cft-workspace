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
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/ccd/CcdDataStoreApiClient.java
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/ccd/CaseDataContentCreator.java
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/impl/HearingRecordingServiceImpl.java
  - em-hrs-ingestor:charts/em-hrs-ingestor/values.yaml
  - cnp-flux-config:apps/em/em-hrs-ingestor/em-hrs-ingestor.yaml
  - cnp-flux-config:apps/em/em-hrs-ingestor/prod.yaml
  - cnp-flux-config:apps/em/em-hrs-ingestor/demo.yaml
  - cnp-flux-config:apps/em/em-hrs-ingestor/schedule-off.yaml
  - em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/impl/TtlServiceImpl.java
  - em-hrs-api:src/main/resources/ttl_jurisdiction_map.json
status: reviewed
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
sources_sha:
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/controller/HearingRecordingController.java": "d9c7ef9373e8c43c3e74ab89520efb383ee52c2b"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/controller/FolderController.java": "d9c7ef9373e8c43c3e74ab89520efb383ee52c2b"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/controller/BlobStoreInspectorController.java": "7ee1a5f3f004b37a20f527d479a905be4ea7c759"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/dto/HearingRecordingDto.java": "88e6a5c96adcd3db1ff0c68b48a3f06639ef8bfe"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/dto/HearingSource.java": "650e66e8099ec0c9900f0bfcf9acdf66ab01806b"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/impl/SegmentDownloadServiceImpl.java": "711d96e5651c5f1932656ef6981ee45ea7ab10fc"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/impl/PermissionEvaluatorImpl.java": "dca036be0df07c53e1400b3fd84572c57b37f624"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/config/security/SecurityConfiguration.java": "af70acf0ab8b8d6cdf43b5069a3ae17e01f904c0"
  "em-hrs-api:src/main/resources/application.yaml": "679a3b9d051415424f6c824b7aafa9c049ebadd4"
  "em-hrs-api:src/main/resources/ttl_service_map.json": "22cc67abb7fca8771a32236166bc0076e616ea17"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/domain/HearingRecording.java": "3f8eaf52de4f1a49e891a74be2f5530425db480b"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/domain/HearingRecordingSegment.java": "d630cce32118cdb8542105f873badc789f893246"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/domain/AuditActions.java": "2b6f84a016f3ec51c5b39effae8a88bcfa77725e"
  "em-hrs-ingestor:src/main/java/uk/gov/hmcts/reform/em/hrs/ingestor/parse/FilenameParser.java": "6d60056cc3b7383e3c68c6cc2ae8d896c1af9f78"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/ccd/CcdDataStoreApiClient.java": "fe363f04c8f00149a7ef413db5de4819d13438a0"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/ccd/CaseDataContentCreator.java": "1195877a87ffdc97426c40cfe5555a9e48a1628d"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/impl/HearingRecordingServiceImpl.java": "fe363f04c8f00149a7ef413db5de4819d13438a0"
  "em-hrs-ingestor:charts/em-hrs-ingestor/values.yaml": "36ae29fef9a7b3cb16585c2d0a66d8f7015ff342"
  "cnp-flux-config:apps/em/em-hrs-ingestor/em-hrs-ingestor.yaml": "bfb56a4e4b01264c2db7eec7d682392d6491e172"
  "cnp-flux-config:apps/em/em-hrs-ingestor/prod.yaml": "6b3ddae167745d42b28307678f3716427e7a2a21"
  "cnp-flux-config:apps/em/em-hrs-ingestor/demo.yaml": "bfb56a4e4b01264c2db7eec7d682392d6491e172"
  "cnp-flux-config:apps/em/em-hrs-ingestor/schedule-off.yaml": "efd8da51ac2efac7c99921ecd07c2be314bf91a6"
  "em-hrs-api:src/main/java/uk/gov/hmcts/reform/em/hrs/service/impl/TtlServiceImpl.java": "1195877a87ffdc97426c40cfe5555a9e48a1628d"
  "em-hrs-api:src/main/resources/ttl_jurisdiction_map.json": "d01e774a5454063d4159b4bdc62caa9b41aa4381"
---

## TL;DR

- HRS API (`em-hrs-api`) stores hearing recording metadata and serves audio/video segments to authorised users.
- Ingest endpoint (`POST /segments`) accepts recording metadata from `em-hrs-ingestor` and queues blob-copy from CVP/VH to the HRS container.
- Download is gated by IDAM role (`caseworker-hrs-searcher`, `caseworker-hrs`) or sharee email grant with 72-hour expiry.
- All endpoints require both S2S token (from whitelist) and IDAM JWT.
- Hearing sources supported: `CVP` (Cloud Video Platform) and `VH` (Video Hearings).
- TTL is resolved from the service-code map, then the jurisdiction-code map, then a `P20Y` default; civil and family retain for 6 years, everything else 20.

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

- Existing recordings are looked up with `findByRecordingRefAndFolderName(recordingRef, folder)` (`em-hrs-api:HearingRecordingServiceImpl.java:107-112`) — the recording reference plus the folder name, with no datetime component. If nothing matches, a new case is created under jurisdiction `HRS`, case type `HearingRecordings`, event `createCase` (`em-hrs-api:CcdDataStoreApiClient.java:29,33-34,61,70`).
- If a case already exists, the segment is appended via the `manageFiles` event (`em-hrs-api:CcdDataStoreApiClient.java:35,103,116`). `createCaseUpdateData` skips the append when a document with the same filename is already on the case (`em-hrs-api:CaseDataContentCreator.java:70-74`), so re-ingesting a known segment is a no-op.
- The case stores `recordingFiles` (filename, document URL, segment number, and file size converted to MB), `recordingDate`, `recordingTimeOfDay`, `hearingSource`, `hearingRoomRef`, `serviceCode`, `jurisdictionCode`, `courtLocationCode`, `recordingReference` and the TTL object (`em-hrs-api:CaseDataContentCreator.java:44-60,103-113`). Two details cut against the obvious reading: `recordingReference` is populated from the DTO's `caseRef`, not its `recordingRef`; and `recordingTimeOfDay` is only `"AM"` or `"PM"`, derived from whether the recording hour is before noon (`em-hrs-api:CaseDataContentCreator.java:119-122`) — the full hearing timestamp is not stored on the case.

<!-- DIVERGENCE: Confluence describes the CCD lookup as matching on recording reference plus datetime, and lists the stored metadata as including the hearing date/time. Source matches on recording reference plus folder name, and stores only a date plus an AM/PM marker. Source wins. -->

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

The Azure IAM role assignments above live in the service's infrastructure repo. The S2S half is in-repo and unqualified by environment: `em-hrs-api` accepts `ccd_gw`, `em_gw`, `em_hrs_ingestor`, `xui_webapp`, `ccd`, `ccd_data` and `ccd_case_disposer` (`em-hrs-api:application.yaml:103`), and no flux file overrides `S2S_NAMES_WHITELIST`, so that list is what runs everywhere. Case deletion is gated by a second, narrower list of `ccd_case_disposer` and `em_gw` (`em-hrs-api:application.yaml:220`).

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

TTL resolution has three steps, in order: the service-code map, then the jurisdiction-code map, then the default (`em-hrs-api:TtlServiceImpl.java:25-35`). A recording whose filename failed to yield a service code therefore falls through to its jurisdiction code, and one with neither gets the 20-year default — so a parse gap lengthens retention rather than shortening it. The service-code map (`em-hrs-api:ttl_service_map.json`) holds:

| Service code pattern | TTL | Approximate jurisdiction |
|---------------------|-----|------------------------|
| `AAA*`, `ABA*` | `P6Y` (6 years) | Civil |
| `BBA*`, `BCA*`, `BDA*`, `BGA*`, `BHA*`, `BAA*`, `BAB*`, `BAC*`, `BEA*`, `BFA*`, `BTA*`, `BLA*`, `BIA*`, `BKA*`-`BKC*`, `BMA*` | `P20Y` (20 years) | Family, Tribunals |
| `ZZZ0`, `ZZY1` | `P20Y` (20 years) | Test/unknown |
| Unmapped codes | falls through to the jurisdiction map, then `P20Y` | Fallback |

The jurisdiction-code map (`em-hrs-api:ttl_jurisdiction_map.json`) covers 25 codes. Every entry is `P20Y0M0D` except civil (`CV`) and family (`FM`), which are `P6Y0M0D` — matching the `AAA*`/`ABA*` service codes above.

<!-- DIVERGENCE: Confluence "HRS - Retain & Dispose" page (1824136756) states default TTL for unknown service/jurisdiction is "7 years". But em-hrs-api:src/main/resources/application.yaml:211-212 shows `default-ttl: ${DEFAULT_TTL:P20Y}` (20 years). Source wins. -->

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
| `hrs.ingestion-interval-in-seconds` | `INGESTION_INTERVAL_IN_SECONDS` | `1` | Quartz poll interval per pod (`em-hrs-api:application.yaml:146`) |
| `hrs.allowed-roles` | `ALLOWED_ROLES` | `caseworker-hrs-searcher,caseworker-hrs` | IDAM roles with unconditional download access |
| `idam.s2s-authorised.services` | `S2S_NAMES_WHITELIST` | See whitelist table above | S2S service name whitelist |
| `endpoint.deleteCase.enabled` | `DELETE_CASE_ENDPOINT_ENABLED` | `true` | Feature flag for DELETE endpoint |
| `authorisation.deleteCase.s2s-names-whitelist` | `DELETE_CASE_S2S_WHITELIST` | `ccd_case_disposer,em_gw` | S2S whitelist for DELETE |
| `shareelink.ttl` | `SHAREE_LINK_TTL` | `72` | Sharee link expiry in hours (`em-hrs-api:application.yaml:157-158`); injected as the field `validityInHours` |
| `ttl.default-ttl` | `DEFAULT_TTL` | `P20Y` | Default recording retention (`em-hrs-api:application.yaml:211-212`) |
| `hrs.use-ad-auth` | `USE_AD_AUTH_FOR_SOURCE_BLOB_CONNECTION` | — | Switch to user-delegation SAS via managed identity |
| `report.api-key` | — | — | Base64-encoded API key for `/report` endpoints |

## Ingestor scheduling

The `em-hrs-ingestor` is deployed as a Kubernetes CronJob:

- Frequency: every 30 minutes, around the clock, in both the base and production value files (`schedule: "*/30 * * * *"` — `cnp-flux-config:apps/em/em-hrs-ingestor/em-hrs-ingestor.yaml:9` and `prod.yaml:8`). There is no off-peak window and no per-cluster stagger. Demo runs every 10 minutes (`demo.yaml:8`), and `schedule-off.yaml:13` parks the job on the non-firing date `0 0 31 2 *`.
- On/off switch is `ENABLE_CRONJOB` (no underscore before `JOB`), set `true` in production (`cnp-flux-config:apps/em/em-hrs-ingestor/prod.yaml:11`).
- `MAX_FILES_TO_PROCESS` caps each run: 50 in the base file, 250 in production, 500 in demo (`em-hrs-ingestor.yaml:17`, `prod.yaml:12`, `demo.yaml:13`). At 250 files per 30-minute run, production tops out around 500 files per hour per cluster.
- Concurrency policy: `Forbid` — parallel runs are not permitted (`em-hrs-ingestor:charts/em-hrs-ingestor/values.yaml:10`). A run that overshoots 30 minutes means the next tick is skipped rather than queued.

<!-- DIVERGENCE: Confluence states the ingestor runs at 30-minute intervals during off-peak hours only (9pm-5am), staggered between production clusters, with an ENABLE_CRON_JOB switch. Flux schedules it every 30 minutes around the clock with no stagger, and the variable is ENABLE_CRONJOB. Source wins. -->
- If duplicate ingestion occurs (e.g. overlapping schedules), warnings are logged but no duplicate data is created due to filename uniqueness constraints.
- If any file fails ingestion, it will be retried on the next cycle.

## Examples

### FilenameParser: regex constants

The five regex constants that `em-hrs-ingestor` declares for CVP/VH filenames, in declaration order (`em-hrs-ingestor:FilenameParser.java:19-29`). All are compiled with `Pattern.CASE_INSENSITIVE`. Two of them — `TRIBUNALS_FILE_FORMAT_REGEX` and `ROYAL_COURTS_OF_JUSTICE_FILE_WITHOUT_LOCATION_FORMAT_REGEX` — are character-for-character identical, and the dispatch chain tests the RCJ-without-location matcher first (`em-hrs-ingestor:FilenameParser.java:83-96`), so the tribunals branch can never be reached.

```java
// Source: apps/em/em-hrs-ingestor/src/main/java/uk/gov/hmcts/reform/em/hrs/ingestor/parse/FilenameParser.java
// Priority 1: Royal Courts of Justice — courts 0372 (Strand) and 0266 (Rolls Building)
private static final String ROYAL_COURTS_OF_JUSTICE_FILE_WITH_LOCATION_FORMAT_REGEX
    = "^([A-Z][A-Z][A-Z]\\d)-(0372|0266)-([A-Z0-9-]*)_([0-9-.]*)-([A-Z]{3})_(\\d+)$";

// Priority 2: Civil and Family — 3 or 4 digit court location code
private static final String CIVIL_AND_FAMILY_FILE_FORMAT_REGEX
    = "^([A-Z][A-Z][A-Z]\\d)-(\\d{3,4})-([A-Z0-9-]*)_([0-9-.]*)-([A-Z]{3})_(\\d+)$";

// Declared third, tested fourth — unreachable, identical to the pattern below
private static final String TRIBUNALS_FILE_FORMAT_REGEX
    = "^([A-Z][A-Z][A-Z]\\d)-([A-Z0-9-]*)_([0-9-.]*)-([A-Z]{3})_(\\d+)$";

// Priority 3: RCJ without location code
private static final String ROYAL_COURTS_OF_JUSTICE_FILE_WITHOUT_LOCATION_FORMAT_REGEX
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
