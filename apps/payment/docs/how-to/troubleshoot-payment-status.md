---
title: Troubleshoot Payment Status
topic: lifecycle
diataxis: how-to
product: payment
audience: both
sources:
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/CardPaymentController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/MaintenanceJobsController.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/controllers/ServiceRequestController.java
  - ccpay-payment-app:gov-pay-client/src/main/java/uk/gov/hmcts/payment/api/external/client/GovPayClient.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/service/govpay/GovPayDelegatingPaymentService.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/model/Payment.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/mapper/PBAStatusErrorMapper.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/domain/service/ServiceRequestDomainServiceImpl.java
  - ccpay-bubble:express/services/PayhubService.js
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/controllers/MaintenanceJobsController.java
  - apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientProxy.java
confluence:
  - id: "419299451"
    title: "Payment status"
    last_modified: "unknown"
    space: "RP"
  - id: "1791332488"
    title: "Callback Function - Manually sending Payment Status updates to a Service"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1815114088"
    title: "FAQ Service Support"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1794553680"
    title: "Payment Status Update LLD"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1958058001"
    title: "Service Callback LLD"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1973292244"
    title: "Real Time PBA Payments LLD"
    last_modified: "unknown"
    space: "DTSFP"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- A payment can appear stuck when its local DB status is `initiated` but GOV.UK Pay has already settled (success or failure) — the callback was missed or the status-update job has not run.
- Use `GET /card-payments/{reference}/statuses` to fetch the current GOV.UK Pay state via ccpay-payment-app (does **not** trigger a callback). Use `GET /card-payments/{internal-reference}/status` if you also want to re-trigger the service callback.
- The `PATCH /jobs/card-payments-status-update` endpoint bulk-reconciles all `initiated` card payments against GOV.UK Pay and publishes callbacks via Azure Service Bus topic `ccpay-service-callback-topic`.
- The `ccpay-function-node` Azure Function consumes the Service Bus topic and POSTs callbacks to the service endpoint; it retries up to 6 times (every 30 minutes) before dead-lettering.
- PBA payments stuck as `pending` may indicate a Liberata account-service timeout (Resilience4j `@TimeLimiter`) or PBA Config 1 (legacy mode that skips Liberata entirely).
- For stuck callbacks, a manual replay via `PUT` to the service's callback URL (with S2S token from `payment_app`) is the operational fallback.

## Prerequisites

- Access to `ccpay-payment-app` endpoints (requires a valid S2S token from one of the trusted services, e.g. `ccpay_bubble`, `xui_webapp`).
- IDAM token with `payments` role for PayBubble access.
- The payment reference (format `RC-XXXX-XXXX-XXXX-XXXX`) or the CCD case number.

## Step 1: Retrieve the payment status from ccpay-payment-app

There are two status endpoints with important behavioural differences:

| Endpoint | Controller | Triggers callback? | Use when |
| --- | --- | --- | --- |
| `GET /card-payments/{reference}/statuses` | `CardPaymentController` | No | Read-only check; safe for diagnosis without side effects |
| `GET /card-payments/{internal-reference}/status` | `ServiceRequestController` | **Yes** | Re-trigger the callback to the service while also fetching status |

**Important**: Calling `GET /card-payments/{reference}` (without `/statuses`) will update the payment status in the DB after checking GOV.UK Pay, but does **not** trigger a service callback. This means the Payment Status Update Job will subsequently skip this payment because it is no longer `initiated`. If you need the callback to fire, use the `/status` endpoint on `ServiceRequestController` instead.

1. Call the read-only status endpoint to see the payment's current state:

   ```
   GET /card-payments/{reference}/statuses
   Authorization: Bearer {idam_token}
   ServiceAuthorization: Bearer {s2s_token}
   ```

   This calls `CardPaymentController.retrievePaymentStatus()` which delegates to `GovPayDelegatingPaymentService` to fetch the latest state from GOV.UK Pay.

2. Examine the response. Key fields:
   - `status` — current GOV.UK Pay state (`created`, `started`, `submitted`, `capturable`, `success`, `failed`, `cancelled`, `error`)
   - `finished` — boolean indicating terminal state
   - `payment_id` — the GOV.UK Pay external reference (same as `Payment.externalReference` in the DB)

3. If the response shows `success` or `failed` but the service-team callback was not received, the issue is likely in the callback delivery chain: `ccpay-payment-app` -> `ccpay-service-callback-topic` (Azure Service Bus) -> `ccpay-function-node` (Azure Function) -> service endpoint.

## Step 2: Check GOV.UK Pay directly (if needed)

If the ccpay-payment-app endpoint is unavailable or returning stale data:

1. Obtain the `externalReference` (GOV.UK Pay payment ID) from the `payment` table:

   ```sql
   SELECT external_reference, payment_status, date_created, s2s_service_name
   FROM payment
   WHERE reference = 'RC-XXXX-XXXX-XXXX-XXXX';
   ```

2. Use the GOV.UK Pay admin console or API. The `GovPayClient` calls `GET https://publicapi.payments.service.gov.uk/v1/payments/{govPayId}` (`GovPayClient.java:68-77`). You can replicate this manually with the appropriate GOV.UK Pay API key for the service (keys are mapped per-service via `ServiceToTokenMap` and stored under `gov.pay.auth.key.<service>` properties).

3. Compare GOV.UK Pay's reported state with the local DB `payment_status`. A mismatch confirms a missed callback or failed status-update job.

## Step 3: Inspect the payment database

Useful queries for diagnosing stuck or failed payments:

```sql
-- Find all initiated payments older than 1 hour (likely stuck)
SELECT p.reference, p.external_reference, p.date_created, p.s2s_service_name,
       ps.name AS status_name
FROM payment p
JOIN payment_status ps ON p.payment_status = ps.id
WHERE ps.name = 'initiated'
  AND p.date_created < NOW() - INTERVAL '1 hour';

-- Check the status history for a specific payment
SELECT sh.status, sh.date_created, sh.error_code, sh.message
FROM status_history sh
JOIN payment p ON sh.payment_id = p.id
WHERE p.reference = 'RC-XXXX-XXXX-XXXX-XXXX'
ORDER BY sh.date_created;

-- Check the payment_fee_link (service request) for callback URL
SELECT pfl.payment_reference, pfl.service_request_callback_url, pfl.ccd_case_number
FROM payment_fee_link pfl
JOIN payment p ON p.payment_link_id = pfl.id
WHERE p.reference = 'RC-XXXX-XXXX-XXXX-XXXX';
```

Key indexes to note: `ix_pay_ccd_case_number` (on `ccd_case_number`) and `ix_pay_payment_status_provider` (on `payment_status`, `payment_provider`) (`Payment.java:24-27`).

## Step 4: Use PayBubble for staff investigation

1. Navigate to PayBubble: `https://paybubble.{environment}.platform.hmcts.net/payment-history/{ccdCaseNumber}`

2. The UI shows:
   - All payment groups linked to the case
   - Individual payment statuses (card, PBA, telephony, bulk-scan)
   - Fee breakdown and remissions
   - Service request references

3. PayBubble proxies all calls through its Express BFF to `ccpay-payment-app`. The key route is the wildcard `GET /api/payment-history/*` which maps to `payhubUrl/${path}` (`PayhubService.js:219`). The individual payment detail view is available at `/payments/{reference}` which calls `GET /api/payments/{id}` -> `payhubUrl/payments/{id}` (`PayhubService.js:146`).

4. Check the LaunchDarkly flag `payment-status-update-fe` — if enabled (note: inverted logic in the UI — the flag being `true` means the feature is DISABLED), the status column may not refresh automatically.

## Step 5: Trigger the status-update job manually

If many payments are stuck in `initiated` status, trigger the batch reconciliation:

```
PATCH /jobs/card-payments-status-update
ServiceAuthorization: Bearer {s2s_token}
```

This endpoint (`MaintenanceJobsController.java:54`) is S2S-only (no user token required). It:
- Fetches all payments with `initiated` status via `paymentService.listInitiatedStatusPaymentsReferences()`
- Calls `delegatingPaymentService.retrieveWithCallBack()` for each, which queries GOV.UK Pay and updates the local DB
- Publishes status callbacks to `ccpay-service-callback-topic` for any payments that have reached a terminal state
- Uses `topicClientProxy.setKeepClientAlive(true)` for batch efficiency

**Scope limitation**: The job only processes online card payments with status `initiated`. It does not cover telephony payments, disputed/failed payments, or refunds. If a service has already called `GET /card-payments/{reference}` (which updates status but does not callback), the job will skip that payment because it is no longer `initiated`.

### Callback delivery chain

After the status-update job (or a PBA payment action) publishes to `ccpay-service-callback-topic`:

1. The `ccpay-function-node` Azure Function picks up the message from the topic subscription.
2. It reads the `serviceCallbackUrl` property from the message and POSTs the payment status JSON to that URL with `ServiceAuthorization` header (S2S token for `payment_app`).
3. If the service responds with anything other than HTTP 2xx, the function retries up to **5 additional times** (6 total attempts), spaced **30 minutes apart**.
4. After all retries are exhausted, the message is dead-lettered.
<!-- CONFLUENCE-ONLY: The 6-attempt / 30-minute retry mechanic is documented in Confluence (Service Callback LLD) but the retry configuration lives in ccpay-function-node (not in ccpay-payment-app source). Not verified in source -->

### Common reasons a callback fails to arrive

| # | Scenario | Explanation |
| --- | --- | --- |
| 1 | Status already updated in DB | A prior `GET /card-payments/{reference}` call moved status from `initiated` to `success` without triggering a callback. The job now skips it. |
| 2 | Service Bus message lost | Rare; difficult to trace. Check Azure Service Bus metrics for the topic. |
| 3 | Service endpoint unreachable | The function-node retries 6 times then dead-letters. Check the service's health in the target environment. |
| 4 | No callback URL stored | No `service_callback_url` in `payment` table and no `service_request_callback_url` in `payment_fee_link`. The service must supply this when creating the payment or service request. |

### Where callback URLs are stored

| Endpoint | Callback source | Stored in |
| --- | --- | --- |
| `POST /service-request` | Request body field `call_back_url` | `payment_fee_link.service_request_callback_url` |
| `POST /service-request/{ref}/card-payments` | Query parameter `service-callback-url` | `payment.service_callback_url` |
| `POST /card-payments` (legacy) | Query parameter `service-callback-url` | `payment.service_callback_url` |
| `POST /service-request/{ref}/pba-payments` | Inherited from service request | `payment_fee_link.service_request_callback_url` |

## Step 6: Diagnose PBA payment failures

For PBA (credit account) payments stuck as `pending` or returned as `failed`:

### Determine PBA configuration mode

Services operate on one of two PBA configurations:

- **PBA Config 2** (current standard): PayHub calls Liberata in real-time to validate the PBA account before accepting the payment. Failures surface immediately.
- **PBA Config 1** (legacy): PayHub skips Liberata and sets payment status to `pending`. Reconciliation happens asynchronously later. A payment stuck as `pending` under Config 1 is expected behaviour until reconciliation completes.
<!-- CONFLUENCE-ONLY: The distinction between PBA Config 1 and Config 2 is documented in Confluence (Real Time PBA Payments LLD) but the config toggle mechanism is not clearly named in source code. not verified in source -->

### Check the Liberata account status (Config 2)

1. Call the account endpoint:

   ```
   GET /accounts/{pbaAccountNumber}
   ```

   Response codes indicate the issue (mapped by `PBAStatusErrorMapper.java`):
   - **410 Gone** — PBA account deleted (Liberata status `DELETED`, error code `CA-E0004`, message: "Your account is deleted")
   - **412 Precondition Failed** — PBA account on hold (Liberata status `ON_HOLD`, error code `CA-E0003`, message: "Your account is on hold")
   - **402 Payment Required** — insufficient funds (error code `CA-E0001`, message: "You have insufficient funds available")
   - **404 Not Found** — PBA number not recognised by Liberata
   - **504 Gateway Timeout** — Liberata did not respond in time

2. If the response is a timeout or 5xx, the Liberata service may be down. The `AccountServiceImpl` uses `@TimeLimiter(name = "retrievePbaAccountTimeLimiter")` and a Resilience4j `@CircuitBreaker`. Check Azure App Insights for `retrievePbaAccountTimeLimiter` exceptions.

3. **Lower environments note**: PBA accounts in Demo/AAT are **real production Liberata accounts** subject to real-world conditions (on-hold, deleted, insufficient funds). However, actual fund transfers only execute in Production — lower-environment PBA payments are financially harmless. If a PBA account is unavailable in a lower environment, raise a Slackbot ticket to Fee and Payments for a replacement account.
<!-- CONFLUENCE-ONLY: The fact that lower-environment PBA accounts are real production accounts is documented in FAQ Service Support. not verified in source -->

### Idempotency issues

For service-request PBA payments, check the `idempotency_keys` table — a previous attempt may have recorded a non-retryable response:

- If a completed matching request already exists (same hash), PayHub returns the previously saved response.
- If a conflicting request exists (same idempotency key, different details), PayHub returns `409 CONFLICT`.
- If a record exists with status `pending`, the payment is still in progress — PayHub returns `425 Too Early`.

```sql
SELECT idempotency_key, request_hashcode, response_code, response_body, response_status
FROM idempotency_keys
WHERE idempotency_key = '{key}';
```

## Step 7: Check the dead-letter queue

If service-request CPO (Case Payment Orders) update messages failed to deliver:

```
PATCH /jobs/dead-letter-queue-process
ServiceAuthorization: Bearer {s2s_token}
```

This endpoint (`ServiceRequestController.java:288`) reprocesses messages from:
```
ccpay-service-request-cpo-update-topic/subscriptions/serviceRequestCpoUpdateSubscription/$deadletterqueue
```

The implementation (`ServiceRequestDomainServiceImpl.java:489-531`):
1. Opens a `RECEIVEANDDELETE` connection to the dead-letter sub-queue.
2. Reads messages one at a time.
3. Only reprocesses messages whose properties contain `503` (service unavailable) — other failures are discarded.
4. Resubmits matching messages back to the main topic for re-delivery to the CPO update service.

**Note**: This DLQ is specifically for the `ccpay-service-request-cpo-update-topic` (which feeds `ccpay-service-request-cpo-update-service`), **not** for the `ccpay-service-callback-topic` (which feeds `ccpay-function-node` for service callbacks). Dead-lettered service callbacks must be replayed manually — see Step 8.

## Step 8: Manually replay a service callback

If the `ccpay-function-node` exhausted all retries and dead-lettered the callback message, or if the service bus message was lost entirely, you can manually replay the callback by POSTing directly to the service's callback endpoint.

### Gather the callback payload

Run this query to assemble the JSON body (replace the service request reference):

```sql
SELECT
  pfl.payment_reference AS service_request_reference,
  pfl.ccd_case_number,
  p.amount AS service_request_amount,
  CASE
    WHEN p.payment_status = 'success' THEN 'Paid'
    WHEN p.payment_status = 'failed' THEN 'Not paid'
    WHEN p.payment_status = 'cancelled' THEN 'Not paid'
    WHEN p.payment_status = 'error' THEN 'Not paid'
    WHEN p.payment_status = 'declined' THEN 'Not paid'
    ELSE 'ERROR - Please check!'
  END AS service_request_status,
  p.amount AS payment_amount,
  p.reference AS payment_reference,
  p.payment_method,
  p.case_reference,
  p.pba_number AS account_number,
  COALESCE(p.service_callback_url, pfl.service_request_callback_url) AS callback_url
FROM payment_fee_link pfl
JOIN payment p ON pfl.id = p.payment_link_id
WHERE pfl.payment_reference = '{service-request-reference}';
```

### Send the callback

```bash
curl --location --request PUT '{callback_url}' \
  --header 'Content-Type: application/json' \
  --header 'ServiceAuthorization: {s2s_token_for_payment_app}' \
  --data '{
    "service_request_reference": "{service_request_reference}",
    "ccd_case_number": "{ccd_case_number}",
    "service_request_amount": {amount},
    "service_request_status": "Paid",
    "payment": {
      "payment_amount": {amount},
      "payment_reference": "{RC-reference}",
      "payment_method": "{card|payment by account}",
      "case_reference": "{case_reference}",
      "account_number": "{pba_number_or_empty}"
    }
  }'
```

The service should respond with HTTP 200. If successful, the case should progress from the payment stage in the Manage Case application.

**To obtain a valid S2S token for `payment_app`**: Either generate one via the S2S API, or temporarily enable `SERVICE_LOGGING_ENABLED=true` in `ccpay-functions-node` config (via `cnp-flux-config`) and capture a recent S2S header from a successful callback log entry.
<!-- CONFLUENCE-ONLY: The manual replay procedure and S2S token capture method are from Confluence operational documentation. not verified in source -->

## Verify

After taking corrective action:

1. Re-query the payment status:
   ```
   GET /card-payments/{reference}/statuses
   ```
   Confirm the `status` field reflects the expected terminal state (`success` or `failed`).

2. Check the `status_history` table for the payment to confirm a new row was inserted with the updated status.

3. If the payment reached `success`, verify the service-team callback was delivered by checking the Azure Service Bus topic `ccpay-service-callback-topic` subscription metrics — or ask the consuming service team to confirm receipt.

## Reference: Payment status mapping

The following table maps statuses across the three systems. Use this to interpret what state a payment is in when troubleshooting.

| CCD status | PayHub DB status | GOV.UK Pay status | PCI-PAL status | Meaning |
| --- | --- | --- | --- | --- |
| Awaiting payment | `initiated` | `created` / `started` / `submitted` | NOT RECEIVED | User has not completed payment |
| Payment successful | `success` | `success` | SUCCESS | Payment completed |
| Payment failed | `failed` / `declined` | `failed` | DECLINE | Rejected (fraud, 3DS, insufficient funds) |
| Payment failed | `timeout` | `timed out` | NOT RECEIVED | User did not complete within 1 hour |
| Payment failed | `cancelled` | `cancelled` | CANCELLED | User or service cancelled |
| Payment failed | `error` | `error` | ERROR | GOV.UK Pay or provider error |

For PBA payments specifically:
| PayHub status | Liberata status | Error code | HTTP response |
| --- | --- | --- | --- |
| `success` | `ACTIVE` (sufficient balance) | — | 201 |
| `failed` | `ACTIVE` (insufficient balance) | `CA-E0001` | 402 |
| `failed` | `ON_HOLD` | `CA-E0003` | 412 |
| `failed` | `DELETED` | `CA-E0004` | 410 |
| `pending` | (Config 1 — Liberata not called) | — | 201 |

For service request status values returned in callbacks:
| `service_request_status` | Meaning |
| --- | --- |
| `Paid` | All fees fully covered |
| `Partially paid` | Some but not all fees covered |
| `Not paid` | No successful payment |
| `Disputed` | Active chargeback or bounced cheque (first ping from Liberata, no representment outcome yet) |

## Examples

### Batch status-update job implementation

```java
// Source: apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/controllers/MaintenanceJobsController.java

@PatchMapping(value = "/jobs/card-payments-status-update")
public void updatePaymentsStatus() {
    List<Reference> referenceList = paymentService.listInitiatedStatusPaymentsReferences();

    // Hold ASB connection open for the whole batch to avoid per-message connection overhead
    if (topicClientProxy != null && !referenceList.isEmpty()) {
        topicClientProxy.setKeepClientAlive(true);
    }

    referenceList.stream()
        .filter(reference -> {
            try {
                PaymentFeeLink paymentFeeLink =
                    delegatingPaymentService.retrieveWithCallBack(reference.getReference());
                return paymentFeeLink != null;
            } catch (Exception e) {
                LOG.error("Error while updating payment status for reference {}",
                    reference.getReference(), e);
                return false;
            }
        })
        .count();

    if (topicClientProxy != null) {
        topicClientProxy.setKeepClientAlive(false);
        topicClientProxy.close();
    }
}
```

### TopicClientProxy: publish-side retry with linear backoff

```java
// Source: apps/payment/ccpay-payment-app/api/src/main/java/uk/gov/hmcts/payment/api/servicebus/TopicClientProxy.java

private static final int MESSAGE_SEND_MAX_RETRY_COUNT = 3;

private void send(TopicClient client, IMessage message)
        throws InterruptedException, ServiceBusException {
    int attempt = 0;
    while (attempt < MESSAGE_SEND_MAX_RETRY_COUNT) {
        try {
            client.send(message);
            break;
        } catch (ServiceBusException | InterruptedException e) {
            attempt++;
            if (attempt >= MESSAGE_SEND_MAX_RETRY_COUNT) throw e;
            Thread.sleep(1000L * attempt); // 1s, 2s then throws
        }
    }
}
```

## See also

- [Payment Lifecycle](../explanation/payment-lifecycle.md) — status transitions, apportionment, and failure types
- [Payment Status Callbacks](../reference/payment-status-callbacks.md) — ASB topics, `ccpay-functions-node` retry, and failure scenarios
- [GOV.UK Pay Integration](../explanation/govuk-pay-integration.md) — `GovPayClient` circuit breakers, status polling, and the 90-minute session window
- [Reference: API Payments](../reference/api-payments.md) — status endpoints, job endpoints, and error code tables
- [Glossary](../reference/glossary.md) — definitions for ccpay-functions-node, Service Request, PBA, ASB, PayBubble
