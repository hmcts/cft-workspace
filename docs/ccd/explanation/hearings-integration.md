---
topic: hearings
audience: both
sources:
  - sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/controller/ServiceHearingsController.java
  - sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/service/HmcHearingApiService.java
  - sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/jms/listener/HmcHearingsEventTopicListener.java
  - sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/service/HearingsService.java
status: needs-fix
last_reviewed: 2026-04-29T00:00:00Z
---

# Hearings Integration (HMC)

## TL;DR

- CCD-based services integrate with the Hearings Management Component (HMC) through two inbound callbacks and one outbound JMS topic listener.
- HMC calls `POST /serviceHearingValues` to fetch case-specific hearing data before creating or updating a hearing.
- HMC calls `POST /serviceLinkedCases` to retrieve cases linked to a given hearing.
- The service listens on an HMC JMS topic for hearing state-change events; this listener is feature-flagged (`flags.hmc-to-hearings-api.enabled`).
- The Feign client sends an `HMCTS_DEPLOYMENT_ID` header; `hmc.deployment-id` must be set in config.

## Callback endpoints the service exposes

HMC drives the integration by calling back into the service API. Both endpoints accept a `ServiceHearingRequest` body containing `caseReference` and `hearingId`.

| Endpoint | Purpose |
|---|---|
| `POST /serviceHearingValues` | Returns a `ServiceHearingValues` payload — all case data HMC needs to create or update a hearing. |
| `POST /serviceLinkedCases` | Returns cases linked to the given case + hearing pair. |

These are implemented in `ServiceHearingsController` (`ServiceHearingsController.java:36` and `:68`). The mapping from CCD case data to HMC payload fields is handled by helpers in the `helper/mapping/` package — e.g. `HearingsRequestMapping`, `HearingsCaseMapping`, `HearingsAutoListMapping`.

## Outbound calls to HMC

The service calls HMC via `HmcHearingApi`, a Feign client whose base URL is configured at `${hmc.url}`. `HmcHearingApiService` wraps the client and injects the `hmctsDeploymentId` header from `${hmc.deployment-id}` (`HmcHearingApiService.java:22`). IDAM bearer tokens are added per-request.

Key model types: `HearingRequestPayload`, `HearingCancelRequestPayload`, `HearingGetResponse`.

## Inbound HMC topic events

`HmcHearingsEventTopicListener` is a JMS listener that receives hearing state-change messages from HMC and delegates to `ProcessHmcMessageServiceV2` (`HmcHearingsEventTopicListener.java:30,66`).

The listener is **disabled by default**. It only activates when `flags.hmc-to-hearings-api.enabled=true` is set (`HmcHearingsEventTopicListener.java:26`). Incoming messages carry an `HmcMessage` with an `HmcStatus` field.

## Configuration checklist

| Property | Required | Notes |
|---|---|---|
| `hmc.url` | Yes | Base URL for HMC REST API |
| `hmc.deployment-id` | Yes | Sent as `HMCTS_DEPLOYMENT_ID` header; null value causes silent auth failure |
| `flags.hmc-to-hearings-api.enabled` | Yes (to receive events) | Activates `HmcHearingsEventTopicListener` |

## Integration test surface

SSCS uses `rse-cft-lib` (`bootWithCCD`) to run an embedded CCD stack locally, which allows callback endpoint testing without a full deployed environment. Post-deployment functional tests in `sscs-post-deployment-ft-tests` cover end-to-end flows including hearing creation.

<!-- TODO: research note insufficient for hearing-specific integration test class names or test module paths -->

## See also

- [`docs/ccd/explanation/callbacks.md`](callbacks.md) — how CCD invokes aboutToSubmit/submitted webhooks; same auth model applies to HMC callbacks
- [`docs/ccd/explanation/work-allocation.md`](work-allocation.md) — parallel feature-flag pattern for WA integration

## Glossary

| Term | Definition |
|---|---|
| HMC | Hearings Management Component — HMCTS platform service that schedules and manages hearings. |
| `ServiceHearingValues` | Response model returned to HMC containing all case-specific data needed to create or update a hearing. |
| `HmcMessage` | Inbound JMS message from HMC carrying a hearing ID and `HmcStatus` indicating a state change. |
