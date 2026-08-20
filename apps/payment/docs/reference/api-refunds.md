---
title: Api Refunds
topic: refunds
diataxis: reference
product: payment
audience: both
sources:
  - ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/controllers/RefundsController.java
  - ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/controllers/RefundsActionController.java
  - ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/services/RefundsServiceImpl.java
  - ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/services/RefundReviewServiceImpl.java
  - ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/services/RefundStatusServiceImpl.java
  - ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/dtos/requests/RefundRequest.java
  - ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/dtos/requests/RefundStatusUpdateRequest.java
  - ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/state/RefundState.java
  - ccpay-refunds-app:src/main/resources/application.yaml
  - ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/utils/RefundsUtil.java
  - ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/services/RefundNotificationServiceImpl.java
  - ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/util/RefundEligibilityUtil.java
  - ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/service/RefundRemissionEnableServiceImpl.java
  - ccpay-payment-app:api/src/main/resources/application.properties
  - ccpay-payment-api-gateway:cft-api-mgmt.tf
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/payment/ccpay-refunds-app/src/main/java/uk/gov/hmcts/reform/refunds/controllers/RefundsController.java
  - apps/payment/ccpay-refunds-app/src/main/java/uk/gov/hmcts/reform/refunds/state/RefundState.java
  - apps/payment/ccpay-refunds-app/src/main/java/uk/gov/hmcts/reform/refunds/services/RefundStatusServiceImpl.java
confluence:
  - id: "1912144311"
    title: "Refund Process Overview"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1952818350"
    title: "Refunds - Business Rules"
    last_modified: "2026-06-01"
    space: "DTSFP"
  - id: "1952816727"
    title: "Refunds - Journey & Status Validation Scenarios"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1891012960"
    title: "External API Specifications"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1952816733"
    title: "Refunds - Rejection Scenarios"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1775194669"
    title: "Refunds Notifications LLD"
    last_modified: "unknown"
    space: "DTSFP"
  - id: "1824149762"
    title: "GOV.UK Notify and templates"
    last_modified: "unknown"
    space: "DTSFP"
confluence_checked_at: "2026-08-20T00:00:00Z"
sources_sha:
  "ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/controllers/RefundsController.java": "98e5f4161db82b39d5e472d3ca4bbb212bfe6cd6"
  "ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/controllers/RefundsActionController.java": "98e5f4161db82b39d5e472d3ca4bbb212bfe6cd6"
  "ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/services/RefundsServiceImpl.java": "28db15967ec44a65d32c09ce24c48f55314833ac"
  "ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/services/RefundReviewServiceImpl.java": "8b0ba10ac9549aa89e87426f557dd00703eb0e77"
  "ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/services/RefundStatusServiceImpl.java": "32d397a4e5e2e1c6ca2ec2e66101a69845c9c0d7"
  "ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/dtos/requests/RefundRequest.java": "8b0ba10ac9549aa89e87426f557dd00703eb0e77"
  "ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/dtos/requests/RefundStatusUpdateRequest.java": "d0970d044fc5fdc0c510e8095f159c2c1fe19858"
  "ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/state/RefundState.java": "5255433fa96cb8303a667ee0660219befd1cdc10"
  "ccpay-refunds-app:src/main/resources/application.yaml": "fcda3a69f83a92e6cd7b8292a99a9bfa349090a3"
  "ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/utils/RefundsUtil.java": "1c8b7b924ea8aa9367a3c89bd489154ca5f62026"
  "ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/services/RefundNotificationServiceImpl.java": "3749385a4df78f606ecf839387fd0f26328d8709"
  "ccpay-payment-app:model/src/main/java/uk/gov/hmcts/payment/api/util/RefundEligibilityUtil.java": "a13eb9234676634eda91b7dbf48b0662eb89af67"
  "ccpay-payment-app:api/src/main/java/uk/gov/hmcts/payment/api/service/RefundRemissionEnableServiceImpl.java": "65bcad2ffb092e534b051dbb0349914658506a57"
  "ccpay-payment-app:api/src/main/resources/application.properties": "1908ddc16a3f086c816e17c1ff8b27bee4b8f414"
  "ccpay-payment-api-gateway:cft-api-mgmt.tf": "851a3bd62e0d7ff6a42288faecaef9b80f259be0"
---

## TL;DR

- `ccpay-refunds-app` exposes a REST API for creating, reviewing, resubmitting, and reconciling refunds against payments held in `ccpay-payment-app`.
- All endpoints require IDAM `Authorization` and S2S `ServiceAuthorization` headers; trusted S2S services: `payment_app`, `ccpay_bubble`, `api_gw`, `ccd_gw`, `xui_webapp`, `pcs_api`.
- Refund references follow the format `RF-NNNN-NNNN-NNNN-NNNN`.
- The state machine drives: Sent for approval -> Approved -> Accepted/Rejected/Expired; with branches for Update required, Cancelled, Reissued, Closed.
- LaunchDarkly flag `refunds-release` gates most user-facing endpoints (returns 503 when `true`); the Liberata callback and jobs endpoints are ungated.
- Refund eligibility (the post-payment waiting period) is decided in `ccpay-payment-app`, not here, behind the `refund-remission-lagtime-feature` flag; the thresholds are per payment method and configured in hours.
- Notifications are dispatched indirectly via `ccpay-notifications-service`, not GOV.UK Notify directly. Template selection depends on `refundInstructionType` (`SendRefund` vs `RefundWhenContacted`) and notification type (EMAIL vs LETTER).

## Endpoints

### Refund lifecycle

| Method | Path | Purpose | Controller location |
|--------|------|---------|-------------------|
| `POST` | `/refund` | Create a new refund | `RefundsController.java:138` |
| `GET` | `/refund` | List refunds by `?status=` or `?ccdCaseNumber=` | `RefundsController.java:163` |
| `PATCH` | `/refund/{reference}` | Update refund status (Liberata callback) | `RefundsController.java:236` |
| `PATCH` | `/refund/resubmit/{reference}` | Resubmit refund with updated reason/amount | `RefundsController.java:252` |
| `PATCH` | `/refund/{reference}/action/{reviewer-action}` | Review: approve, reject, or request update | `RefundsController.java:312` |
| `DELETE` | `/refund/{reference}` | Delete a refund | `RefundsController.java:344` |
| `GET` | `/refund/{reference}/status-history` | Retrieve status change history | `RefundsController.java:274` |
| `GET` | `/refund/{reference}/actions` | List available state-machine events | `RefundsController.java:328` |
| `POST` | `/refund/reissue-expired/{reference}` | Reissue an expired refund | `RefundsController.java:428` |

### Reconciliation and reporting

| Method | Path | Purpose | Controller location |
|--------|------|---------|-------------------|
| `GET` | `/refunds` | List approved refunds for Liberata reconciliation | `RefundsController.java:399` |
| `GET` | `/refund/refunds-report` | Date-range refund report | `RefundsController.java:456` |
| `GET` | `/refund/payment-failure-report` | Payment failure report (gated by `payment-status-update-flag`) | `RefundsController.java:202` |
| `PATCH` | `/payment/{paymentReference}/action/cancel` | Cancel refunds by payment reference | `RefundsActionController.java:37` |

### Jobs and notifications

| Method | Path | Purpose | Controller location |
|--------|------|---------|-------------------|
| `PATCH` | `/jobs/refund-notification-update` | Retry failed email/letter notifications | `RefundsController.java:378` |
| `GET` | `/refund/notifications/doc-preview` | Preview notification document (proxies to notifications service) | `RefundsController.java:289` |

## Request and response shapes

### POST /refund -- RefundRequest

```json
{
  "paymentReference": "RC-1234-5678-9012-3456",
  "refundReason": "RR001",
  "ccdCaseNumber": "1234567890123456",
  "refundAmount": 100.00,
  "paymentAmount": 250.00,
  "feeIds": "1,2,3",
  "serviceType": "Divorce",
  "paymentMethod": "card",
  "paymentChannel": "online",
  "contactDetails": {
    "email": "user@example.com",
    "notificationType": "EMAIL"
  },
  "refundFees": [
    {
      "feeId": 1,
      "code": "FEE0001",
      "version": "1",
      "volume": 1,
      "refundAmount": 100.00
    }
  ]
}
```

Source: `ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/dtos/requests/RefundRequest.java:32-75`

### Response -- RefundResponse

Returns the generated refund reference:

```json
{
  "refundReference": "RF-1234-5678-9012-3456"
}
```

### PATCH /refund/{reference} -- RefundStatusUpdateRequest (Liberata callback)

```json
{
  "status": "ACCEPTED",
  "reason": "Refund processed successfully"
}
```

Valid `status` values: `ACCEPTED`, `REJECTED`, `EXPIRED`.

Special case: when `status = "REJECTED"` and `reason = "Unable to apply refund to Card"`, the service internally sets the refund to APPROVED with `refundInstructionType = "RefundWhenContacted"` (`RefundStatusServiceImpl.java:132-144`).

### PATCH /refund/resubmit/{reference} -- ResubmitRefundRequest

Used to update the reason or amount before re-approval.

### PATCH /refund/{reference}/action/{reviewer-action}

The `{reviewer-action}` path variable accepts: `APPROVE`, `REJECT`, `UPDATEREQUIRED`.

Constraint: the reviewer must not be the same IDAM user who created the refund (`RefundReviewServiceImpl.java:140-150`).

### GET /refunds (Liberata reconciliation)

Query parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | String | No | Start of date range (supports `yyyy-MM-dd`, `dd-MM-yyyy`, ISO) |
| `end_date` | String | No | End of date range |
| `refund_reference` | String | No | Filter by specific reference |

Response shape (`RefundLiberataResponse`):

```json
{
  "refunds": [
    {
      "reference": "RF-1234-5678-9012-3456",
      "reason": "RR001",
      "instructionType": "card",
      "dateApproved": "2024-01-15T10:30:00",
      "totalRefundAmount": 100.00,
      "fees": [],
      "payment": {}
    }
  ]
}
```

Source: `ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/dtos/responses/RefundLiberata.java:26-36`

## Refund state machine

The state machine is defined in `RefundState.java` with the following transitions:

| Current state | Event | Next state |
|---------------|-------|------------|
| Sent for approval | APPROVE | Approved |
| Sent for approval | REJECT | Rejected |
| Sent for approval | UPDATEREQUIRED | Update required |
| Update required | SUBMIT | Sent for approval |
| Approved | ACCEPT | Accepted |
| Approved | REJECT | Rejected |
| Approved | CANCEL | Cancelled |
| Any non-terminal | CANCEL | Cancelled |

Terminal states: Accepted, Rejected, Cancelled, Expired, Reissued, Closed.

Source: `ccpay-refunds-app:src/main/java/uk/gov/hmcts/reform/refunds/state/RefundState.java:8-133`

## Refund reason codes

Reason codes are stored in the `refund_reasons` table. Active codes run from `RR001` to `RR037`, excluding deleted codes `RR013` and `RR018`.

| Code | Notable examples |
|------|-----------------|
| `RR001`-`RR004` | Original seed reasons |
| `RR036` | Retrospective remission |
| `RR037` | Overpayment |

The `reason` column on the `refunds` table stores the raw code string (e.g. `RR036`), not a foreign key -- the FK constraint was explicitly dropped in `db.changelog-0.4.yaml:63`.

## Database schema

Core tables in the `refunds` PostgreSQL database:

| Table | Purpose |
|-------|---------|
| `refunds` | Primary refund records |
| `status_history` | Audit trail of status changes (FK to `refunds.id`) |
| `refund_reasons` | Lookup: code, name, description, recently_used flag |
| `refund_status` | Lookup: valid status names |
| `rejection_reasons` | Lookup: rejection reason codes RE001-RE005 |
| `refund_fees` | Fee breakdown per refund |

Key columns on `refunds`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | BIGINT | PK |
| `ccd_case_number` | VARCHAR | 16-digit case reference |
| `amount` | DECIMAL | Refund amount |
| `reason` | VARCHAR | Refund reason code (e.g. `RR001`) |
| `refund_status` | VARCHAR | FK to `refund_status.name` |
| `reference` | VARCHAR | `RF-NNNN-NNNN-NNNN-NNNN` format |
| `payment_reference` | VARCHAR | Source payment reference |
| `service_type` | VARCHAR | e.g. Divorce, Probate |
| `refund_instruction_type` | VARCHAR | e.g. `RefundWhenContacted` |
| `notification_sent_flag` | VARCHAR | `SENT`, `EMAIL_NOT_SENT`, `LETTER_NOT_SENT` |
| `contact_details` | JSON | `{email, addressLine, city, county, country, postalCode, notificationType, templateId}` |

## Authentication and feature flags

All endpoints require:
- `Authorization` header: IDAM user JWT
- `ServiceAuthorization` header: S2S token from a trusted service

`PATCH /refund/*` is the exception. It used to be `permitAll()`; since CME-896 it is
gated by `RefundStatusUpdateAuthorizationManager`, which admits either a user token
holding `payments-refund`/`payments-refund-approver`, **or** a fully anonymous request
whose S2S token resolves to the `ccpay_gw` microservice. A user token without a refund
role is rejected even alongside a valid `ccpay_gw` S2S token, because the gateway
branch only applies when there is no authenticated user at all. See
[Refunds flow](../explanation/refunds-flow.md#idam-roles-and-security).

### Rate limiting

Every endpoint on `RefundsController` and `RefundsActionController` is rate-limited —
both classes carry a class-level `@RateLimiter(name = "refundsApi")`, so the budget is
shared across the whole API rather than per endpoint. Over the limit, `ExceptionHandlers`
returns **429 Too Many Requests** with the body `Too many requests`.

| Setting | Env var | Default |
|---|---|---|
| Requests per period | `REFUNDS_API_RATE_LIMIT_FOR_PERIOD` | 10 |
| Refresh period | `REFUNDS_API_RATE_LIMIT_REFRESH_PERIOD` | `1s` |
| Wait for a permit | `REFUNDS_API_RATE_LIMIT_TIMEOUT_DURATION` | `0` |

A timeout of `0` means a caller over the limit fails immediately rather than blocking
for a permit. Ten requests per second is a low ceiling for a batch reconciliation
sweep — raise it per environment rather than assuming the default accommodates you.

`ccpay-payment-app` is rate-limited separately and behaves differently under load;
see [Payments API](api-payments.md#rate-limiting).

Feature flags:

| Flag | Effect |
|------|--------|
| `refunds-release` | When `true`, returns 503 on most user-facing endpoints. Does NOT gate Liberata callback or jobs. |
| `payment-status-update-flag` | Gates `/refund/payment-failure-report` endpoint |

## Business rules and eligibility

A refund becomes possible when money has already been taken and the balance turns out to be in the payer's favour — an overpayment, a payment made in error, a case withdrawn after payment, or a retrospective remission that creates a refundable balance.

Refunds are governed by business rules that determine when a refund is permitted:

| Condition | Requirement |
|-----------|-------------|
| Payment status | Must be **successful** |
| Lag period | A per-payment-method waiting period must have elapsed since the payment was last updated (see below) |
| Overall balance | Must be positive (overpayment exists) |
| Concurrent assessments | Only one refund assessment per payment at a time |

### Lag period

The lag period is **not** enforced in `ccpay-refunds-app` — it is decided upstream in `ccpay-payment-app`, which
computes a per-payment `refundEnable` flag that PayBubble uses to decide whether to offer the refund action at
all. `RefundRemissionEnableServiceImpl.returnRefundEligible()` requires the payment to be `success` **and** the
lag period to have elapsed **and** the caller to hold the service-specific refund role. The elapsed time is
measured in whole hours from `payment.date_updated`
(`api/src/main/java/uk/gov/hmcts/payment/api/service/RefundRemissionEnableServiceImpl.java:75-80`), then compared
against a per-payment-method threshold in `RefundEligibilityUtil.getRefundEligiblityStatus()`.

The thresholds are configured in **hours**, not days:

| Payment method | Property | Default | Equivalent |
|---|---|---|---|
| `card` (including telephony, which is a channel on a card payment) | `card.lag.time` | 144 | 6 days |
| `cash` | `cash.lag.time` | 120 | 5 days |
| `cheque` | `cheques.lag.time` | 480 | 20 days |
| `postal order` | `postalorders.lag.time` | 480 | 20 days |
| `payment by account` | `pba.lag.time` | 96 | 4 days |

Source: `RefundEligibilityUtil.java:10-54`, `application.properties:224-228`.

The whole lag check is behind the LaunchDarkly flag **`refund-remission-lagtime-feature`**, which defaults to
`false`. With the flag off, eligibility falls back to "payment is `success` and the caller holds the refund role"
and no waiting period applies at all — so an environment where refunds appear immediately is not necessarily
misconfigured, it may simply have the flag off. The same flag and the same lag calculation also gate *remission*
eligibility via `returnRemissionEligible()`.

<!-- DIVERGENCE: Confluence "Refunds - Business Rules" (page 1952818350) gives the lag period as a two-row table — "Telephony / Online Card: 5 days" and "Bulk Scan / Allocation: 20 days". Source disagrees on the card figure (144 hours = 6 days, not 5) and covers five payment methods rather than two, with cash at 5 days and PBA at 4. Source wins. -->

### Assessment period

A refund assessment period begins when the request is "Sent for Approval" and ends when it is approved by a team leader. During this window, no additional refund requests for the same payment may be initiated; once the assessment completes, a fresh request may be raised if the balance still warrants one.

**Key constraints:**

- Upfront remissions are **not refundable**
- Retrospective remissions require at least one successful payment before creating a refundable balance — failed payments alone do not enable one
- The maximum refund is limited by both the remission amount and the apportioned payment amount, so refund calculations must respect the payment apportionment rules
- The remission amount and refund amount are not always equal
- A refund may still be rejected downstream for processing or settlement reasons — see the Payit journey below

The refund workflow is a two-role separation of duties: a **Requestor** creates and submits the request, and an **Approver** (team leader) approves, rejects, or sends it back for revision. Source enforces the separation by refusing a review from the IDAM user who created the refund (`RefundReviewServiceImpl.java:140-150`).

<!-- CONFLUENCE-ONLY: the positive-balance rule, the one-assessment-per-payment rule, and the apportionment ceiling come from Confluence "Refunds - Business Rules" (DTSFP, page 1952818350); they are not expressed as a single named check in either ccpay-refunds-app or ccpay-payment-app. -->

## Refund instruction types

When a refund is created, the `refundInstructionType` is determined by the payment method and channel:

| Condition | Instruction type |
|-----------|-----------------|
| Bulk scan channel + cash/postal order/cheque | `RefundWhenContacted` |
| All other payment methods | `SendRefund` |

Source: `RefundsServiceImpl.java:228-235`

Additionally, when Liberata rejects a refund with reason `"Unable to apply refund to Card"`, the system automatically:
1. Sets `refundInstructionType` to `RefundWhenContacted`
2. Resets the refund status to `APPROVED` (by "System user")
3. This triggers the "Payit" journey where the payer is contacted to provide bank details

Source: `RefundStatusServiceImpl.java:132-146`

## Notification template selection

Notification templates are selected by `RefundsUtil.getTemplate()` based on a matrix of `refundInstructionType` and `notificationType`:

| Instruction type | Notification type | Template (Azure secret) | GOV.UK Notify name |
|-----------------|-------------------|------------------------|-------------------|
| `SendRefund` | EMAIL | `notifications-email-card-pba-template-id` | Offer and Send Email |
| `SendRefund` | LETTER | `notifications-letter-card-pba-template-id` | Offer and Send Letter |
| `RefundWhenContacted` (generic) | EMAIL | `notifications-email-cheque-po-cash-template-id` | Offer and Contact Email |
| `RefundWhenContacted` (generic) | LETTER | `notifications-letter-cheque-po-cash-template-id` | Offer and Contact Letter |
| `RefundWhenContacted` + reason = "Unable to apply refund to Card" | EMAIL | `notifications-email-refund-when-contacted-template-id` | Refund When Contacted |
| `RefundWhenContacted` + reason = "Unable to apply refund to Card" | LETTER | `notifications-letter-refund-when-contacted-template-id` | Refund When Contacted Letter |

Source: `RefundsUtil.java:47-85`, `application.yaml:159-169`

### Notification flags

The `notification_sent_flag` column on the `refunds` table tracks delivery status:

| Flag value | Meaning |
|-----------|---------|
| `SENT` | Notification successfully sent via GOV.UK Notify |
| `EMAIL_NOT_SENT` | Email dispatch failed (5xx from notifications service) |
| `LETTER_NOT_SENT` | Letter dispatch failed (5xx from notifications service) |
| `NOT_APPLICABLE` | Refund was rejected; no notification required |
| `ERROR` | Unexpected error during notification |

A scheduled mop-up job (`PATCH /jobs/refund-notification-update`) runs periodically and retries any refund where `notification_sent_flag` is `EMAIL_NOT_SENT` or `LETTER_NOT_SENT`.

Source: `RefundNotificationServiceImpl.java:133-203`, `NotificationServiceImpl.java:247-297`

## External API exposure (APIM)

Liberata accesses the refunds API through Azure API Management (mTLS gateway). The external base URL is:

```
https://cft-mtls-api-mgmt-appgw.platform.hmcts.net/refunds-api/
```

Externally published endpoints for Liberata:

| Method | External path | Internal endpoint | Purpose |
|--------|--------------|-------------------|---------|
| `GET` | `/refunds-api/refunds?start_date=...&end_date=...` | `GET /refunds` | Reconciliation: list approved refunds |
| `PATCH` | `/refunds-api/refund/{reference}` | `PATCH /refund/{reference}` | Status callback (Accepted/Rejected/Expired) |

<!-- DIVERGENCE: Confluence "External API Specifications" page lists the status callback as "POST https://cft-mtls-api-mgmt-appgw.platform.hmcts.net/refunds-api/refund/{reference}" but the source code (RefundsController.java:236) uses @PatchMapping. Source wins. -->

The APIM configuration for the payments product is in `ccpay-payment-api-gateway/cft-api-mgmt.tf`. The refunds product is configured as a separate APIM product (`refunds`) with its own Liberata subscription key.

Source: `ccpay-payment-api-gateway:cft-api-mgmt-subscriptions.tf`, Confluence "External API Specifications"

## Payit refund journey (happy path)

<!-- CONFLUENCE-ONLY: not verified in source -->

When a card refund is rejected by Liberata (original card expired/cancelled), the system triggers the Payit journey:

1. **Refund created** -- Caseworker initiates refund (status: "Sent for Approval")
2. **Team Leader approves** -- Status changes to "Approved", refund sent to Liberata
3. **Liberata accepts** -- Status: "Accepted"
4. **Card refund fails** -- Liberata calls back with status `REJECTED`, reason `"Unable to apply refund to Card"`
5. **Auto-approved for Payit** -- System automatically resets to "Approved" with `refundInstructionType = RefundWhenContacted`
6. **Liberata accepts into Payit** -- Status: "Accepted" again
7. **Offer and Contact notification** -- Email/letter sent to payer with link to `https://bparefunds.liberata.com`
8. **Payer claims refund** -- Payer provides bank details via Payit portal

For **offline payment refunds** (cash/cheque/postal order), the journey starts at step 6 directly since `refundInstructionType` is set to `RefundWhenContacted` at creation time.

The Payit link (`https://bparefunds.liberata.com`) requires the payer to quote both their payment reference and refund reference.

## Examples

### Refund state machine transitions

```java
// Source: apps/payment/ccpay-refunds-app/src/main/java/uk/gov/hmcts/reform/refunds/state/RefundState.java

public enum RefundState {

    SENTFORAPPROVAL {
        @Override
        public RefundEvent[] nextValidEvents() {
            return new RefundEvent[]{RefundEvent.APPROVE, RefundEvent.REJECT, RefundEvent.UPDATEREQUIRED};
        }

        @Override
        public RefundState nextState(RefundEvent event) {
            switch (event) {
                case APPROVE:        return APPROVED;
                case REJECT:         return REJECTED;
                case UPDATEREQUIRED: return NEEDMOREINFO;
                case CANCEL:         return CANCELLED;
                default:             return this;
            }
        }
    },
    APPROVED {
        @Override
        public RefundState nextState(RefundEvent refundEvent) {
            switch (refundEvent) {
                case ACCEPT: return ACCEPTED;
                case REJECT: return REJECTED;
                case CANCEL: return CANCELLED;
                default:     return this;
            }
        }
    },
    // Terminal states: ACCEPTED, REJECTED, CANCELLED (all return `this` on any event)
    ;
}
```

### Liberata callback: ACCEPTED triggers notification dispatch

```java
// Source: apps/payment/ccpay-refunds-app/src/main/java/uk/gov/hmcts/reform/refunds/services/RefundStatusServiceImpl.java

if (statusUpdateRequest.getStatus().getCode().equals(ACCEPTED)) {
    refund.setRefundStatus(RefundStatus.ACCEPTED);
    refund.setStatusHistories(Arrays.asList(
        getStatusHistoryEntity(LIBERATA_NAME, RefundStatus.ACCEPTED, LIBERATA_REASON)));

    // Resolve contact details from notification service and dispatch GOV.UK Notify message
    Notification notificationDetails = notificationService.getNotificationDetails(headers, originalRefundReference);
    // ...
    String templateId = refundsUtil.getTemplate(refund, statusUpdateRequest.getReason());
    notificationService.updateNotification(headers, refund, null, templateId);

} else if (statusUpdateRequest.getReason().equalsIgnoreCase(
        RefundsUtil.REFUND_WHEN_CONTACTED_REJECT_REASON)) {
    // Special case: card refund failed — auto-approve for PayIt journey
    refund.setRefundInstructionType(RefundsUtil.REFUND_WHEN_CONTACTED);
    refund.setRefundStatus(RefundStatus.APPROVED);
    refund.setUpdatedBy(SYSTEM_USER);
}
```

## See also

- [Refunds Flow](../explanation/refunds-flow.md) — full lifecycle explanation with state machine diagram and PayIt journey
- [Reconciliation](../explanation/reconciliation.md) — how Liberata's refund reconciliation integrates with the APIM gateway
- [Architecture](../explanation/architecture.md) — `ccpay-refunds-app` and `ccpay-notifications-service` spoke descriptions
- [Glossary](glossary.md) — definitions for Liberata, PayIt, RF reference, S2S
