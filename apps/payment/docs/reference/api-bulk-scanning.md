---
title: Api Bulk Scanning
topic: bulk-scan-payments
diataxis: reference
product: payment
audience: both
sources:
  - ccpay-bulkscanning-app:src/main/java/uk/gov/hmcts/reform/bulkscanning/controller/PaymentController.java
  - ccpay-bulkscanning-app:src/main/java/uk/gov/hmcts/reform/bulkscanning/controller/SearchController.java
  - ccpay-bulkscanning-app:src/main/java/uk/gov/hmcts/reform/bulkscanning/controller/ReportController.java
  - ccpay-bulkscanning-app:src/main/java/uk/gov/hmcts/reform/bulkscanning/model/request/BulkScanPaymentRequest.java
  - ccpay-bulkscanning-app:src/main/java/uk/gov/hmcts/reform/bulkscanning/model/request/BulkScanPayment.java
  - ccpay-bulkscanning-app:src/main/java/uk/gov/hmcts/reform/bulkscanning/model/enums/ResponsibleSiteId.java
  - ccpay-bulkscanning-app:src/main/java/uk/gov/hmcts/reform/bulkscanning/model/enums/EnvelopeSource.java
  - ccpay-bulkscanning-app:src/main/java/uk/gov/hmcts/reform/bulkscanning/model/enums/ReportType.java
  - ccpay-bulkscanning-app:src/main/java/uk/gov/hmcts/reform/bulkscanning/model/request/CaseReferenceRequest.java
  - ccpay-bulkscanning-app:src/main/java/uk/gov/hmcts/reform/bulkscanning/utils/BulkScanningUtils.java
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/payment/ccpay-bulkscanning-app/src/main/java/uk/gov/hmcts/reform/bulkscanning/controller/PaymentController.java
  - apps/payment/ccpay-bulkscanning-app/src/main/java/uk/gov/hmcts/reform/bulkscanning/model/enums/ResponsibleSiteId.java
confluence:
  - id: "1794557345"
    title: "Bulk Scanning Payments - HLD"
    last_modified: "2024-09-16"
    space: "DTSFP"
  - id: "1791351069"
    title: "Bulk Scan for Cash/Cheque/PO"
    last_modified: "2024-09-16"
    space: "DTSFP"
  - id: "866485912"
    title: "Bulk Scanning Payments Handling"
    last_modified: "2018-12-12"
    space: "RP"
  - id: "580649068"
    title: "Bulk Scanning and Payments"
    last_modified: "2021-03-30"
    space: "RBS"
  - id: "1712766455"
    title: "Payments and Fee Reg E2E Flows"
    last_modified: "2024-06-26"
    space: "DTSFP"
  - id: "1440508905"
    title: "Auto case creation - Bulk scan payments"
    last_modified: "2020-09-15"
    space: "RP"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- `ccpay-bulkscanning-app` receives cash/cheque/postal-order payment data from the bulk-scan pipeline (Exela) and makes it available to `ccpay-payment-app` via a pull model.
- Two ingest endpoints: `POST /bulk-scan-payments` (initial envelope from scanning supplier) and `POST /bulk-scan-payment` (financial detail from Exela).
- Envelope status machine: `INCOMPLETE` -> `COMPLETE` -> `PROCESSED`. The `source` column tracks data provenance (`Exela`, `Bulk_Scan`, `Both`).
- Accepted payment methods: `Cash`, `Cheque`, `PostalOrder`; currency `GBP` only. Exela does **not** scan cheque images or extract PII.
- All endpoints require IDAM JWT (`Authorization`) and S2S token (`ServiceAuthorization`).
- Once allocated in PayBubble, bulk-scan payments follow the same apportionment rules as other payment channels (allocated to outstanding fees in chronological order).

## Endpoints

### Payment ingest

| Method | Path | Purpose | Controller location |
|--------|------|---------|-------------------|
| `POST` | `/bulk-scan-payments` | Initial metadata from bulk-scan system (envelope + DCNs) | `PaymentController:56` |
| `POST` | `/bulk-scan-payment` | Payment detail from Exela (amount, method, BGC slip) | `PaymentController:71` |
| `PUT` | `/bulk-scan-payments?exception_reference={16-char}` | Update case reference for exception record | `PaymentController:97` |
| `PATCH` | `/bulk-scan-payments/{dcn}/status/{status}` | Mark payment as processed | `PaymentController:126` |
| `DELETE` | `/bulk-scan-payment/{dcn}` | Delete payment by DCN | `PaymentController:139` |

### Search

| Method | Path | Purpose | Controller location |
|--------|------|---------|-------------------|
| `GET` | `/cases/{ccd_reference}` | Search by CCD case reference (used by PayBubble) | `SearchController:37` |
| `GET` | `/cases?document_control_number=` | Search by DCN (used by PayBubble) | `SearchController:62` |
| `GET` | `/case/{document_control_number}?internalFlag=true` | Internal lookup used by `ccpay-payment-app` | `SearchController:73` |

### Reporting

| Method | Path | Purpose | Controller location |
|--------|------|---------|-------------------|
| `GET` | `/report/download` | Generate XLS report | `ReportController:54` |
| `GET` | `/report/data` | JSON report data | `ReportController:91` |

## Request/response shapes

### `POST /bulk-scan-payments` — BulkScanPaymentRequest

Sent by the scanning supplier to register an envelope of documents.

```json
{
  "site_id": "AA07",
  "ccd_case_number": "1234567890123456",
  "is_exception_record": false,
  "document_control_numbers": ["123456789012345678901"]
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `site_id` | string | Exactly 4 characters; one of `AA07`, `AA08`, `AA09`, `ABA1`, `ABA5` (`BulkScanPaymentRequest:53`) |
| `ccd_case_number` | string | Exactly 16 digits numeric |
| `is_exception_record` | boolean | Whether this is an exception record |
| `document_control_numbers` | string[] | Each must be exactly 21 digits numeric (`BulkScanPaymentRequest:59`) |

**Response**: 201 Created with list of created DCNs.

### `POST /bulk-scan-payment` — BulkScanPayment (Exela)

Sent by Exela when payment processing is complete.

```json
{
  "document_control_number": "123456789012345678901",
  "amount": 100.00,
  "currency": "GBP",
  "method": "Cash",
  "bank_giro_credit_slip_number": 12345,
  "banked_date": "2024-01-15"
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `document_control_number` | string | 21 digits numeric |
| `amount` | decimal | Payment amount |
| `currency` | string | `GBP` only (`BulkScanPayment:112`) |
| `method` | string | One of: `Cash`, `Cheque`, `PostalOrder` (`BulkScanPayment:106`) |
| `bank_giro_credit_slip_number` | integer | Max 6 digits, required (`BulkScanPayment:68`) |
| `banked_date` | string | `YYYY-MM-DD` format, must not be a future date (`BulkScanPayment:83`) |

**Response**: 201 Created on success; 409 Conflict if metadata for the DCN already exists (`PaymentController:77`).

### `PUT /bulk-scan-payments?exception_reference={ref}` — CaseReferenceRequest

Sent by service teams to link an exception record to a real CCD case number after the caseworker identifies the correct case.

```json
{
  "ccd_case_number": "1234567890123456"
}
```

| Field | Type | Constraints |
|-------|------|-------------|
| `ccd_case_number` | string | Exactly 16 digits numeric (`CaseReferenceRequest.java`) |

The `exception_reference` query parameter must also be exactly 16 characters (`PaymentController:100`).

**Response**: 200 OK with envelope group ID; 404 if exception reference not found.

## Envelope source tracking

The `envelope_payment.source` column (`EnvelopeSource` enum) records which systems have contributed data for each DCN:

| Source value | Meaning |
|--------------|---------|
| `Exela` | Only the Exela financial data has been received |
| `Bulk_Scan` | Only the bulk-scan metadata has been received |
| `Both` | Both Exela financial data and bulk-scan metadata have been received; payment is `COMPLETE` |

When `BulkScanningUtils.processAllTheDCNPayments()` detects that a DCN already exists from one source and the other source is now providing its data, it sets `source = Both` and `paymentStatus = COMPLETE` for that payment slot.

## Site ID mapping

The `site_id` field maps to a responsible service via `ResponsibleSiteId` enum (`ResponsibleSiteId.java:4-9`):

| Site ID | Service |
|---------|---------|
| `AA07` | Divorce |
| `AA08` | Probate |
| `AA09` | Financial Remedy |
| `ABA1` | Divorce |
| `ABA5` | Family Private Law |

Note: both `AA07` and `ABA1` map to "Divorce" — two different site IDs for the same jurisdiction.

## Envelope status machine

| Status | Meaning |
|--------|---------|
| `INCOMPLETE` | Initial — either bulk-scan metadata or Exela payment detail received, but not both |
| `COMPLETE` | Both bulk-scan metadata and Exela payment detail received for all DCNs in the envelope |
| `PROCESSED` | `ccpay-payment-app` has pulled and processed the envelope |

Status transitions are audited in the `status_history` table via `BulkScanningUtils.insertStatusHistoryAudit()` (`BulkScanningUtils:155`).

## Authentication

All endpoints require:
- `Authorization` header: IDAM JWT
- `ServiceAuthorization` header: S2S token from an authorised service

Trusted S2S callers: `ccpay_bubble`, `cmc`, `bulk_scan_payment_processor`, `api_gw`, `probate_frontend`, `divorce_frontend`, `ccd_gw`, `payment_app`.

## Integration pattern

`ccpay-bulkscanning-app` does not push data to `ccpay-payment-app`. The integration is pull-based:

1. **Exela** calls `POST /bulk-scan-payment` — creates a `payment_metadata` record and an `envelope_payment` slot in `INCOMPLETE` status with `source = Exela`.
2. **Bulk-scan processor** calls `POST /bulk-scan-payments` — creates/matches the envelope and attaches case metadata. If DCNs already exist from step 1, the payment transitions to `COMPLETE` with `source = Both`.
3. (Optional) If the envelope was linked to an exception record, the **service team** calls `PUT /bulk-scan-payments?exception_reference={ref}` to associate the real CCD case number.
4. **`ccpay-payment-app`** calls `GET /case/{dcn}?internalFlag=true` to retrieve completed envelope data for payment allocation.
5. After processing, `PATCH /bulk-scan-payments/{dcn}/status/{status}` marks the envelope as `PROCESSED`.

Note: Steps 1 and 2 can arrive in either order. The system handles both "Exela first" and "Bulk-scan metadata first" orderings; whichever arrives second triggers the `COMPLETE` transition.

### Auto-case creation impact

With auto-case creation, bulk scanning creates CCD cases directly from envelopes without caseworker involvement (exception records are only created when validation fails). This means:

- The `exception_record_reference` in `envelope_case` may be blank for auto-created cases.
- The `case_reference` attribute passed to the Liberata reconciliation API may be empty (the field is not mandatory).
- Unidentified payments (no application/case reference) are handled offline by Exela and the business — they are not sent to CCD or PayBubble.
<!-- CONFLUENCE-ONLY: not verified in source -->

## Banking reconciliation

The reconciliation flow for bulk-scan payments works as follows:

1. Before banking cheques, Exela obtains a payment reference from PayHub and imprints it on the back of the cheque.
2. Exela banks the cheques/postal orders.
3. Liberata pulls payment information from PayHub at regular intervals (daily) via the API Gateway.
4. If errors occur (e.g. payment amount mismatches), banks share the scanned image of the cheque back with Liberata. The PayHub payment reference on the cheque back enables reconciliation.
5. As Liberata holds a copy of all PayHub payments with references, discrepancies can be identified and reconciliation incidents raised.
<!-- CONFLUENCE-ONLY: not verified in source -->

Key security constraints:
- Exela does **not** scan cheque images (information security requirement).
- Exela does **not** extract any PII from cheques.
- Only the DCN and payment amount metadata flows through the bulk-scanning system.

## Payment allocation (PayBubble)

Once bulk-scan payments reach `COMPLETE` status, caseworkers allocate them to fees via PayBubble:

1. Caseworker searches for the CCD case in PayBubble.
2. The system shows unallocated payments for that case.
3. Caseworker selects "Allocate to new service request", selects the appropriate fee(s).
4. Payment is allocated using the same apportionment rules applied to all payment channels:
   - Payments allocated to outstanding fees in chronological order.
   - Payments may be partial (underpayment) or exceed the total fee value (overpayment).
   - The `PaymentGroup.CalculatePaymentMatchesAmountDue` method determines: overpayment (refund needed), underpayment (additional payment required), or balanced.
<!-- CONFLUENCE-ONLY: not verified in source -->

## Report types

The reporting endpoints support two report types (`ReportType` enum):

| Report type | Purpose |
|-------------|---------|
| `DATA_LOSS` | Identifies envelopes where payment data may have been lost (e.g. Exela sent payment but no corresponding bulk-scan metadata arrived) |
| `UNPROCESSED` | Lists envelopes in `COMPLETE` status that have not yet been pulled/allocated — used for monitoring backlogs |

Both `/report/download` (XLS) and `/report/data` (JSON) accept `date_from`, `date_to`, and `report_type` parameters.

## Database schema

Database: `bspayment` (PostgreSQL). Migrations managed by Liquibase (not Flyway, despite a stale `spring.flyway.enabled: true` in `application.yaml:47`).

| Table | Key columns | Purpose |
|-------|-------------|---------|
| `envelope` | `id`, `responsible_service_id`, `payment_status`, `date_created`, `date_updated` | Top-level envelope record |
| `envelope_case` | `id`, `ccd_reference`, `exception_record_reference`, `envelope_id` (FK), timestamps | Links envelope to CCD case (or exception record) |
| `envelope_payment` | `id`, `dcn_reference`, `envelope_payment_status`, `source`, `envelope_id` (FK), timestamps | Per-DCN payment slot; `source` is one of `Exela`, `Bulk_Scan`, `Both` |
| `payment_metadata` | `id`, `dcn_reference`, `bgc_reference`, `amount` (numeric 19,2), `currency`, `payment_method`, `date_banked`, timestamps | Exela financial data |
| `status_history` | `id`, `payment_status`, `envelope_id` (FK), timestamps | Audit trail of status transitions |

All columns with timestamps use `TIMESTAMP WITHOUT TIME ZONE`. The `payment_metadata` table has no FK to `envelope` — it is linked logically via `dcn_reference`.

**Data retention**: Payment data is retained for 7 years per HMCTS data retention policy.
<!-- CONFLUENCE-ONLY: not verified in source -->

## Configuration

Key application properties (`application.yaml`):

| Property | Description |
|----------|-------------|
| `trusted.s2s.service.names` | Comma-separated list of trusted S2S callers |
| `spring.datasource.url` | PostgreSQL connection; database name `bspayment` |
| `spring.flyway.enabled: true` | **Stale** — Liquibase is actually used (changelogs in `db/changelog/`) |
| `spring.jackson.deserialization.fail-on-unknown-properties: true` | Strict JSON deserialization; unknown fields cause 400 errors |
| `spring.jackson.mapper.accept-case-insensitive-enums: true` | Enum values in requests are case-insensitive |

## Examples

### Bulk scanning controller endpoints

```java
// Source: apps/payment/ccpay-bulkscanning-app/src/main/java/uk/gov/hmcts/reform/bulkscanning/controller/PaymentController.java

@RestController
@Tag(name = "Bulk Scanning Payment API")
public class PaymentController {

    // POST /bulk-scan-payments — initial envelope metadata from scanning supplier
    @PostMapping("/bulk-scan-payments")
    public ResponseEntity<PaymentResponse> consumeInitialMetaDataBulkScanning(
        @Valid @RequestBody BulkScanPaymentRequest bsPaymentRequest) {
        return new ResponseEntity<>(PaymentResponse.paymentResponseWith()
            .paymentDcns(paymentService.saveInitialMetadataFromBs(bsPaymentRequest))
            .build(), HttpStatus.CREATED);
    }

    // POST /bulk-scan-payment — financial details from Exela (different endpoint, note singular)
    @PostMapping("/bulk-scan-payment")
    public ResponseEntity<String> processPaymentFromExela(
        @Valid @RequestBody BulkScanPayment bulkScanPayment) {
        if (Optional.ofNullable(
                paymentService.getPaymentMetadata(bulkScanPayment.getDcnReference())).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("Payment DCN already exists");
        }
        paymentService.processPaymentFromExela(bulkScanPayment, bulkScanPayment.getDcnReference());
        return ResponseEntity.status(HttpStatus.CREATED).body("Created");
    }

    // PUT /bulk-scan-payments?exception_reference=... — link exception record to real CCD case
    @PutMapping("/bulk-scan-payments")
    public ResponseEntity updateCaseReferenceForExceptionRecord(
        @NotNull @RequestParam("exception_reference")
        @Size(min = 16, max = 16, message = "exception_reference Length must be 16 Characters")
            String exceptionRecordReference,
        @Valid @RequestBody CaseReferenceRequest caseReferenceRequest) {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON)
            .body(paymentService.updateCaseReferenceForExceptionRecord(
                exceptionRecordReference, caseReferenceRequest));
    }

    // PATCH /bulk-scan-payments/{dcn}/status/{status} — mark as PROCESSED
    @PatchMapping("/bulk-scan-payments/{dcn}/status/{status}")
    public ResponseEntity markPaymentAsProcessed(
        @NotEmpty @PathVariable("dcn") String dcn,
        @NotNull @PathVariable("status") PaymentStatus status) {
        paymentService.updatePaymentStatus(dcn, status);
        return ResponseEntity.status(HttpStatus.OK).body("Updated");
    }

    // DELETE /bulk-scan-payment/{dcn} — support/cleanup endpoint
    @DeleteMapping("/bulk-scan-payment/{dcn}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePayment(@PathVariable String dcn) {
        paymentService.deletePayment(dcn);
    }
}
```

### Site ID enum (hard-coded mapping)

```java
// Source: apps/payment/ccpay-bulkscanning-app/src/main/java/uk/gov/hmcts/reform/bulkscanning/model/enums/ResponsibleSiteId.java

public enum ResponsibleSiteId {
    AA07("Divorce"),
    AA08("Probate"),
    AA09("Financial Remedy"),
    ABA1("Divorce"),       // two site IDs map to Divorce (different PO Boxes)
    ABA5("Family Private Law");
}
```

## See also

- [Bulk Scan Payments](../explanation/bulk-scan-payments.md) — how the bulk-scan pipeline works end-to-end with banking reconciliation
- [Reconciliation](../explanation/reconciliation.md) — how Liberata pulls bulk-scan payment data via the APIM gateway
- [Architecture](../explanation/architecture.md) — `ccpay-bulkscanning-app` spoke description and APIM gateway
- [Glossary](glossary.md) — definitions for DCN, BGC slip, Envelope, Exela, Site ID, APIM
