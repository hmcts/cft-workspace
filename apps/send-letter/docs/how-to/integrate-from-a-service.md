---
title: Integrate From A Service
topic: overview
diataxis: how-to
product: send-letter
audience: both
sources:
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/SendLetterController.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/model/in/LetterWithPdfsAndNumberOfCopiesRequest.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/model/in/Doc.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/MediaTypes.java
  - send-letter-service:src/main/resources/application.yaml
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/config/FtpConfigProperties.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/ftp/ServiceFolderMapping.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/LetterService.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/tasks/UploadLettersTask.java
  - send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/model/in/RecipientsValidator.java
status: needs-fix
last_reviewed: "2026-05-13T12:00:00Z"
examples_extracted_from:
  - apps/send-letter/send-letter-mock/src/main/java/uk/gov/hmcts/reform/client/services/BulkPrintService.java
  - apps/send-letter/send-letter-mock/src/main/java/uk/gov/hmcts/reform/client/controllers/MockSendController.java
  - apps/send-letter/send-letter-mock/src/main/resources/application.yaml
  - apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/model/in/LetterWithPdfsAndNumberOfCopiesRequest.java
confluence:
  - id: "531137194"
    title: "Send-Letter ( Bulk Print) On-boarding"
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
  - id: "1440487628"
    title: "Bulk Print Onboarding and Changes to live service"
    last_modified: "unknown"
    space: "RBS"
  - id: "1381302667"
    title: "How to test address position on print templates"
    last_modified: "unknown"
    space: "DIV"
  - id: "1440495919"
    title: "DTS - Bulk Print"
    last_modified: "unknown"
    space: "DATS"
  - id: "480149739"
    title: "Letter Service - e2e manual testing"
    last_modified: "unknown"
    space: "RPE"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- To send bulk print letters, your service POSTs base64-encoded PDFs to `POST /letters` on `send-letter-service` (port 8485), authenticated via an S2S token.
- Three prerequisites: register your service in S2S, request an SFTP folder from the print provider (approx. 6-week lead time), and add config entries to `send-letter-service`'s `application.yaml`.
- Use content type `application/vnd.uk.gov.hmcts.letter-service.in.letter.v3+json` (v3) to specify per-document copy counts.
- The endpoint returns a `letter_id` UUID immediately; actual printing is asynchronous. Identical letters (same checksum) are deduplicated.
- If the SFTP folder mapping is missing for your service, `POST /letters` throws `ServiceNotConfiguredException` (HTTP 403) immediately.
- Agree a "letter type" code with Xerox during onboarding (e.g. `CMC001`, `SSCS001`) -- sent in the `type` field and used to select envelope format and postage class.

## Prerequisites

Before writing any code, complete these infrastructure steps in order. Deploying config before the provider creates the folder causes upload failures.

### 1. Engage with the Bulk Print service manager

Contact the Bulk Print service manager to discuss your requirements. You will need to:

1. Go through the **Bulk Print Functional Specification** document (examples available on Confluence).
2. Complete a **Request for Service (RFS)** form and a service specifications document. These are submitted to the demand team who forward them to Xerox.
3. A meeting will be arranged between Xerox and your service team to confirm requirements (envelope format, postage class, inserts, etc.).

<!-- CONFLUENCE-ONLY: not verified in source -->

**Allow approximately 6 weeks lead time** from initial contact for Xerox to complete new onboarding work.

### 2. Register your service in S2S

Your microservice must be registered with `service-auth-provider-app` so it can obtain an S2S token. Work with the platform team to add your service name (e.g. `pcs_api`) to the S2S configuration in the target environment.

### 3. Request an SFTP folder from the print provider

Xerox creates folders on their SFTP server in both **UAT** and **production** environments. They will contact the Bulk Print team with the name and path of the folder created. The folder name is typically your service acronym in uppercase (e.g. `PCS`, `PROBATE`, `FPL`).

As part of onboarding, agree a **document type code** with Xerox (e.g. `CMC001`, `SSCS001`). This is the value you pass in the `type` field of the letter request. Send Letter Service does not validate or interpret the type -- Xerox uses it to select the correct print queue, envelope format, and postage class.
<!-- CONFLUENCE-ONLY: not verified in source -->

### 4. Add configuration entries to send-letter-service

Two sections in `send-letter-service/src/main/resources/application.yaml` must be updated:

**a) `ftp.service-folders`** -- maps your S2S service name to the SFTP folder:

```yaml
ftp:
  service-folders:
    - service: pcs_api
      folder: PCS
      enabled: true
```

If `enabled` is `false` or the entry is missing, `ServiceFolderMapping.getFolderFor(serviceName)` returns `Optional.empty()`. The `LetterService.save()` method checks this **before** persisting the letter and throws `ServiceNotConfiguredException` (HTTP 403) immediately (`LetterService.java:144-148`). Letters that somehow reach the upload phase without a folder are marked `Skipped` by `UploadLettersTask`.
<!-- DIVERGENCE: Confluence (page 1875865980) says "There is no specific S2S whitelisting, but above configuration takes care of enabling the service", but send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/services/LetterService.java:144-148 shows the service explicitly throws ServiceNotConfiguredException when the service-folder mapping is missing, effectively acting as an application-level whitelist on top of S2S auth. Source wins. -->

**b) `reports.service-config`** -- maps your service to a report code and display name for email reporting:

```yaml
reports:
  service-config:
    - service: pcs_api
      display-name: PCS
      report-code: PCS
```

**c) `delete-old-letters` intervals** -- optionally configure data retention for your service's letters:

```yaml
delete-old-letters:
  pcs-interval: ${PCS_INTERVAL:6 months}
```

Agree with business stakeholders when old letters should be purged. Existing service intervals range from 3 months (SSCS, Divorce, FINREM) to 18 years (Private Law).

### 5. Deploy the configuration

Raise a PR against `send-letter-service` with the `application.yaml` changes. Ensure the print provider has confirmed the SFTP folder exists **before** the deployment reaches the target environment.

## Calling POST /letters

### 6. Add the send-letter-client dependency

Add the Java client to your `build.gradle`:

```groovy
implementation group: 'com.github.hmcts', name: 'send-letter-client', version: '5.1.1'
```

The client autoconfigures when the `send-letter.url` property is set. It exposes `SendLetterApi` which:
- Always sends requests in **async mode** (`isAsync=true`) by default.
- Automatically confirms letter creation by polling the status endpoint with retries after submission.
- Supports both `LetterV3` (per-document copy counts) and the older `LetterWithPdfsRequest` API.

You also need the `send-letter.url` environment variable pointing to the service (e.g. `http://rpe-send-letter-service-aat.service.core-compute-aat.internal`).

Alternatively, call the endpoint directly via HTTP.

If your service fetches documents from **CDAM** (Case Document Access Management) to assemble letter PDFs, your service must also be whitelisted for CDAM access.
<!-- CONFLUENCE-ONLY: not verified in source -->

### 7. Obtain an S2S token

Your service must include the `ServiceAuthorization` header on every request. The value is the S2S JWT obtained from `service-auth-provider-app`.

### 8. Construct and send the request

POST to `/letters` with content type `application/vnd.uk.gov.hmcts.letter-service.in.letter.v3+json`.

**Request body (v3)**:

```json
{
  "documents": [
    {
      "content": "<base64-encoded-PDF-bytes>",
      "copies": 2
    },
    {
      "content": "<base64-encoded-PDF-bytes>",
      "copies": 1
    }
  ],
  "type": "my_letter_type",
  "additional_data": {
    "recipients": ["Recipient Name"],
    "reference": "CASE-12345"
  }
}
```

Key constraints (`LetterWithPdfsAndNumberOfCopiesRequest.java`, `Doc.java:17-21`):

| Field | Constraint |
|-------|-----------|
| `documents` | 1-30 items (`@Size(min=1, max=30)`) |
| `documents[].content` | Base64-encoded PDF bytes (Jackson decodes to `byte[]`). Must not be empty (`@NotEmpty`). |
| `documents[].copies` | 1-100 per document (`@Min(1) @Max(100)`) |
| `type` | Non-empty string (`@NotEmpty`); underscores are stripped in the output filename |
| `additional_data` | **Required** -- must include a `recipients` array of strings. Validated by `@ValidRecipients` which rejects null `additional_data` or missing/empty `recipients`. Error message: "Invalid recipients. Please check that the recipients attribute is included within the additional_data field, and that it includes a list of names (an array of strings)." |

**Duplicate detection**: the service computes a checksum over the letter content. If a letter with the same checksum already exists in `Created` status, the existing `letter_id` is returned rather than creating a new record. Additionally, document-level deduplication (by recipients checksum) catches duplicate submissions with different metadata (`LetterService.java:150-162, 182-187`).

<!-- REVIEW: Rate limiter only applies to FeatureFlagController (GET /feature-flags/{flag}), not to POST /letters. See send-letter-service:src/main/java/uk/gov/hmcts/reform/sendletter/controllers/FeatureFlagController.java:15 — the @RateLimiter annotation is only on that controller. This claim should be removed or corrected. -->
**Rate limiting**: the service applies a Resilience4j rate limiter of 15 requests per second across all callers (`application.yaml` `resilience4j.ratelimiter.instances.default`). Requests exceeding this rate are rejected immediately.

**Response** (HTTP 200):

```json
{
  "letter_id": "a2b3c4d5-e6f7-8901-abcd-ef1234567890"
}
```

### 9. (Optional) Use async mode

Append `?isAsync=true` to the request URL to return immediately before PDF assembly and DB write complete. The `GET /letters/{id}` endpoint retries up to 3 times with 1-second sleep to handle the write lag (`LetterService.java:554-566`).

Note: if you use the `send-letter-client` library, async mode is enabled by default -- the client sends `isAsync=true` on every request and then calls `confirmRequestIsCreated()` which polls the status endpoint with a configured `RetryTemplate` to verify persistence.

### 10. (Optional) Mark letters as international

Set `additional_data.isInternational` to `true` to route the letter to the provider's `/International` subfolder:

```json
{
  "additional_data": {
    "isInternational": true
  }
}
```

The upload task appends `/International` to the target SFTP folder path (`UploadLettersTask.java:148-150`).

## Check letter status

### 11. Poll for status

```
GET /letters/{letter_id}
ServiceAuthorization: <S2S token>
```

Returns the current status. Possible public statuses: `Created`, `Uploaded`, `Posted`, `Aborted`, `Skipped`.

For extended history including events:

```
GET /letters/{letter_id}/extended-status?include-additional-info=true
```

## PDF formatting requirements

Your letter PDFs must position the recipient address within the envelope window. These specifications are enforced by the print provider's physical envelope insertion process.
<!-- CONFLUENCE-ONLY: not verified in source -->

| Requirement | Specification |
|-------------|--------------|
| Page size | Standard A4 (210mm x 297mm) |
| Address window size | 26mm high x 82mm from left margin (effective: 26mm x 59mm with 23mm left margin) |
| Address window top edge | 59mm from top of page (238mm from bottom) |
| Address window bottom edge | 85mm from top of page (212mm from bottom) |
| Tap zone | 43mm from top to 100mm from top; 0mm from left edge, 108mm wide |
| Country in address | **Not allowed** -- Royal Mail specification prohibits country name in UK-posted letters |

The Divorce/FR team maintain a GIMP/Photoshop overlay template for verifying address positioning on letter templates. The workflow:

1. Open your Docmosis/document template in Word and save as PDF.
2. Open the address-tester overlay (`.psd` or `.xcf`) in GIMP.
3. Import your PDF as a layer (`File > Open as layer`).
4. Verify all address lines fall within the marked address window zone.

## Verify

1. Deploy your service to a test environment with a valid S2S registration.
2. Send a test letter:

```bash
curl -X POST https://rpe-send-letter-service-aat.service.core-compute-aat.internal/letters \
  -H "ServiceAuthorization: Bearer <s2s-token>" \
  -H "Content-Type: application/vnd.uk.gov.hmcts.letter-service.in.letter.v3+json" \
  -d '{
    "documents": [{"content": "'$(base64 -w0 test.pdf)'", "copies": 1}],
    "type": "smoke_test",
    "additional_data": {"recipients": ["Test"]}
  }'
```

3. Confirm a `letter_id` UUID is returned in the response.
4. Poll `GET /letters/{letter_id}` and verify the status transitions from `Created` to `Uploaded` (this may take up to 2 minutes due to the `db-poll-delay` and the 30-second scheduler interval).

## Troubleshooting and support

**Service returns HTTP 403**: Your service is not configured in `ftp.service-folders`. Ensure the `application.yaml` PR has been merged and deployed.

<!-- REVIEW: "db-poll-delay of 2 seconds" is wrong — it is 2 MINUTES. See application.yaml:177 (DB_POLL_DELAY:2) and UploadLettersTask.java:103 which uses minusMinutes(dbPollDelay). Also "16:00-17:00 UTC" should be "London time" (Europe/London zone). -->
**Letter status stuck at `Created`**: The upload scheduler runs every 30 seconds (configurable via `UPLOAD_LETTERS_INTERVAL`). It also has a `db-poll-delay` of 2 seconds. During the FTP downtime window (default 16:00-17:00 UTC), uploads are suppressed entirely.

**Xerox support issues**: Raise a ticket via ServiceNow:
- Business Service: `Offsite Bulk Print (Shared)`
- Service offering: `Offsite Bulk Print Services`
- Assignment group: `Offsite_Bulk_Printing_Xerox`
<!-- CONFLUENCE-ONLY: not verified in source -->

**Encryption**: Letters are optionally PGP-encrypted before upload (controlled by `ENCRYPTION_ENABLED`). This is a service-level setting, not per-calling-service. If enabled, the print provider decrypts using the corresponding private key.

## Examples

### Using send-letter-client (from the mock)

The `send-letter-mock` shows the canonical way to call the service using the `SendLetterApi` Feign client from `send-letter-client`:

```java
// Source: apps/send-letter/send-letter-mock/src/main/java/uk/gov/hmcts/reform/client/services/BulkPrintService.java

public UUID send(
    final BulkPrintRequest bulkPrintRequest,
    final List<byte[]> listOfDocumentsAsByteArray,
    String service,
    String secret,
    Map<String, Object> additionalData) {

    String s2sToken = tokenGeneratorForService(service, secret).generate();

    // encode each PDF byte array as base64 and wrap in Document with copy count
    final List<Document> documents = listOfDocumentsAsByteArray.stream()
        .map(docBytes -> new Document(getEncoder().encodeToString(docBytes), 3))
        .collect(toList());

    SendLetterResponse sendLetterResponse = sendLetterApi.sendLetter(
        s2sToken,
        new LetterV3("a type", documents, additionalData)
    );

    return sendLetterResponse.letterId;
}

private Map<String, Object> getAdditionalData(boolean internationalPost, Map<String, String> attrs) {
    final Map<String, Object> additionalData = new HashMap<>();
    additionalData.put("caseIdentifier", "1448915163945522589");
    additionalData.put("caseReferenceNumber", "1448915163945522588");
    additionalData.put("letterType", "general-letter");
    additionalData.put("isInternational", internationalPost);
    additionalData.put("recipients", Arrays.asList("Gilligan Blobbers", "Querky Mcgibbins"));
    return additionalData;
}
```

### Mock test endpoints

```java
// Source: apps/send-letter/send-letter-mock/src/main/java/uk/gov/hmcts/reform/client/controllers/MockSendController.java

@GetMapping("/test")
public ResponseEntity<List<UUID>> test() throws IOException {
    return ResponseEntity.ok(bulkPrintService.tryToSend(false));
}

@GetMapping("/test-international-post")
public ResponseEntity<List<UUID>> testInternationalPost() throws IOException {
    return ResponseEntity.ok(bulkPrintService.tryToSend(true));
}

@GetMapping("/test-multiple")
public ResponseEntity<List<UUID>> testMultiple(
    @RequestParam(value = "count") Long count,
    @RequestParam(value = "international", required = false, defaultValue = "false") Boolean internationalPost,
    @RequestParam(value = "service", required = false) String service,
    @RequestParam(value = "s2s-key", required = false) String secret,
    @RequestParam(value = "attrs", required = false) Map<String, String> attrs)
    throws IOException {
    return ResponseEntity.ok(
        bulkPrintService.tryToSendMultiple(count, internationalPost, service, secret, attrs)
    );
}
```

### Mock application.yaml (how to point it at a real service)

```yaml
# Source: apps/send-letter/send-letter-mock/src/main/resources/application.yaml

server:
  port: 8877

send-letter:
  url: ${SEND_LETTER_URL:http://localhost:1234}   # point at any environment's send-letter-service

idam:
  s2s-auth:
    url: ${AUTH_PROVIDER_SERVICE_CLIENT_BASEURL:http://localhost:1256}
    microservice: ${IDAM_S2S_AUTH_MICROSERVICE:sendletter}
    secret: ${IDAM_S2S_AUTH_TOTP_SECRET:verysecret}
```

Trigger a test letter submission: `GET http://localhost:8877/test`.

### v3 request model (request body fields)

```java
// Source: apps/send-letter/send-letter-service/src/main/java/uk/gov/hmcts/reform/sendletter/model/in/LetterWithPdfsAndNumberOfCopiesRequest.java

public class LetterWithPdfsAndNumberOfCopiesRequest implements ILetterRequest {

    @Valid
    @Size(min = 1, max = 30)
    public final List<Doc> documents;    // each Doc has content (byte[]) and copies (1-100)

    @NotEmpty
    public final String type;            // Xerox document type e.g. "CMC001"

    @ValidRecipients                     // must contain non-empty "recipients" list
    public final Map<String, Object> additionalData;
}
```

## See also

- [API reference](../reference/api.md) — full endpoint specification including validation constraints and file-naming convention
- [Configuration reference](../reference/configuration.md) — `ftp.service-folders`, `reports.service-config`, and per-service data retention intervals
- [Letter Lifecycle](../explanation/letter-lifecycle.md) — understand what happens after `POST /letters` returns a `letter_id`
- [Troubleshoot upload failures](troubleshoot-upload-failures.md) — diagnose issues once your service is integrated and letters are not being uploaded
