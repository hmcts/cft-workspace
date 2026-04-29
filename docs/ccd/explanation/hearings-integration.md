---
topic: hearings
audience: both
sources:
  - sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/controller/ServiceHearingsController.java
  - sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/service/HmcHearingApiService.java
  - sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/jms/listener/HmcHearingsEventTopicListener.java
  - sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/service/HearingsService.java
status: confluence-augmented
last_reviewed: 2026-04-29T00:00:00Z
confluence_checked_at: 2026-04-29T00:00:00Z
confluence:
  - id: "1564516230"
    title: "Hearing Management Component (HMC)"
    space: "CME"
  - id: "1958066277"
    title: "Hearings Architecture - Main Case vs GA"
    space: "CRef"
  - id: "1624186077"
    title: "HMC Manual Integration - LLD"
    space: "CRef"
  - id: "1825037149"
    title: "Hearings (HMC) API"
    space: "RRFM"
---

# Hearings Integration (HMC)

## TL;DR

- HMC is the shared HMCTS component that brokers hearings between consuming services and List Assist (ILA). Services integrate with HMC, never with List Assist directly. Hearing data lives in HMC, not duplicated on the CCD case.
- The service exposes two inbound callbacks (`POST /serviceHearingValues`, `POST /serviceLinkedCases`) that ExUI/HMC invoke to fetch case data.
- The service calls HMC outbound through a Feign client at `${hmc.url}` for `/hearing`, `/hearings`, `/partiesNotified`, `/unNotifiedHearings`.
- The service listens on an Azure Service Bus topic for hearing state-change events; this listener is feature-flagged (`flags.hmc-to-hearings-api.enabled`).
- Every HMC call carries an `HMCTS_DEPLOYMENT_ID` header; `hmc.deployment-id` must be set in config.

## Where HMC sits

HMC is an integration and orchestration layer, not the hearing system itself. It accepts hearing requests, mediates the interface to downstream listing components (List Assist), holds hearing state, and pushes updates back to consuming services. A consuming service integrates once with HMC instead of building separate integrations to each downstream component.

```
service (CCD-backed)        ExUI (Hearing Management tab)
         \                         /
          \                       /
           +---------> HMC <-----+
                       |
                       v
                  List Assist (ILA)
```

The service is largely a **data provider** to HMC for case-specific values, plus a consumer of state-change events. ExUI calls the service's `/serviceHearingValues` endpoint when a Listing Officer opens the hearings tab; HMC books the hearing; outcome events flow back via the JMS topic and (in some services) polling `/unNotifiedHearings`.

## Callback endpoints the service exposes

HMC and ExUI drive the integration by calling back into the service API. Both endpoints accept a `ServiceHearingRequest` body containing `caseReference` and `hearingId` (the hearing ID may be null/empty/missing on first request).

| Endpoint | Purpose |
|---|---|
| `POST /serviceHearingValues` | Returns a `ServiceHearingValues` payload — all case data HMC needs to create or update a hearing. |
| `POST /serviceLinkedCases` | Returns cases linked to the given case + hearing pair. |

These are implemented in `ServiceHearingsController` (`ServiceHearingsController.java:36` and `:68`). Mapping from CCD case data to HMC payload fields lives in `helper/mapping/` — e.g. `HearingsRequestMapping`, `HearingsCaseMapping`, `HearingsAutoListMapping`.

### `ServiceHearingValues` shape

The response is a flat model of every case-specific value HMC needs. Confluence (Civil HMC LLD, EUI Hearings LLD) lists the canonical field set; the SSCS implementation matches the same XUI schema. Selected fields:

- Case meta: `hmctsServiceID`, `hmctsInternalCaseName`, `publicCaseName`, `caseDeepLink`, `caseManagementLocationCode`, `caseSLAStartDate`, `externalCaseReference`, `caserestrictedFlag`
- Hearing meta: `hearingType`, `hearingWindow` (`firstDateTimeMustBe` OR `dateRangeStart`/`dateRangeEnd`), `duration`, `hearingPriorityType`, `hearingChannels[]`, `hearingLocations[]`, `facilitiesRequired[]`, `numberOfPhysicalAttendees`, `hearingInWelshFlag`, `privateHearingRequiredFlag`, `autoListFlag`
- Categorisation: `caseCategories[]` with `categoryType` / `categoryValue` / `categoryParent`
- Listing: `listingComments`, `hearingRequester`, `leadJudgeContractType`, `judiciary`, `panelRequirements`
- Linking: `hearingIsLinkedFlag`
- Parties: `parties[]` with `partyID` (UUID, stable per party), `partyType` (`IND`/`ORG`), `partyRole`, `individualDetails` or `organisationDetails`, `unavailabilityRanges[]`/`unavailabilityDOW[]`
- Flags: `caseFlags { flags[], flagAmendURL }`, plus `caseAdditionalSecurityFlag` and `caseInterpreterRequiredFlag`
- ExUI driver: `screenFlow`, `vocabulary`

Some flags are **derived** from CCD case-flag codes rather than held directly: e.g. Civil sets `caseAdditionalSecurityFlag = true` when `PF0007` is active, auto-adds the `Secure Dock` facility when `PF0019` is set, and rolls `vulnerableFlag` true when any of `PF0002`, `RA0026`, `RA0033` are active. <!-- CONFLUENCE-ONLY: derivation rules from Civil HMC LLD; per-service mapping varies — see each service's `HearingsCaseMapping` / equivalent for the exact rules. -->

## Outbound calls to HMC

The service calls HMC via `HmcHearingApi`, a Feign client whose base URL is configured at `${hmc.url}`. `HmcHearingApiService` wraps the client and injects the `HMCTS_DEPLOYMENT_ID` header from `${hmc.deployment-id}` (`HmcHearingApiService.java:26-27`). IDAM bearer tokens and S2S service-auth tokens are added per-request.

The HMC API surface a consuming service typically uses (from the Possessions onboarding notes — confirmed against SSCS's `HmcHearingApi` methods):

| Path | Verbs | Purpose |
|---|---|---|
| `/hearing` | POST / PUT / DELETE / GET | Create / update / cancel / fetch a hearing request |
| `/hearings` | GET | List all hearings for a case ref (filter by `HmcStatus`) |
| `/partiesNotified` | PUT / GET | Service confirms it has actioned a hearing response (sent notice, cancellation, etc.) |
| `/unNotifiedHearings` | GET | HMC reports hearing responses the service has not yet acknowledged |

`/hearingActuals`, `/hearingActualsCompletion`, and `/linkedHearingGroup` exist but are typically driven from ExUI rather than service code. <!-- CONFLUENCE-ONLY: ExUI-only ownership not verified in source; some services may call these directly. -->

Key model types in SSCS: `HearingRequestPayload`, `HearingCancelRequestPayload`, `HearingGetResponse`, `HearingsGetResponse`, `HmcUpdateResponse`.

## Inbound HMC topic events

`HmcHearingsEventTopicListener` is a JMS listener (Azure Service Bus, configured by `azure.service-bus.hmc-to-hearings-api.topicName` / `.subscriptionName`) that receives hearing state-change messages from HMC and delegates to `ProcessHmcMessageServiceV2` (`HmcHearingsEventTopicListener.java:41-46,66`). Incoming messages carry an `HmcMessage` with `caseId`, `hearingId`, and an `HmcStatus` field on `hearingUpdate`.

The listener is **disabled by default**. It only activates when `flags.hmc-to-hearings-api.enabled=true` is set (`HmcHearingsEventTopicListener.java:25`).

Civil takes a different shape — instead of (or alongside) the topic listener, civil-service polls `GET /unNotifiedHearings/{serviceCode}` from a Camunda scheduler, then runs change-detection (`HmcDataUtils.hearingDataChanged()` checks number of days, location EPIMS ID, and start/end times) before regenerating notices and PUT-ing `/partiesNotified`. <!-- CONFLUENCE-ONLY: Civil polling architecture from "Hearings Architecture - Main Case vs GA" page; SSCS source uses topic-listener pattern. Both patterns are valid; pick whichever the service has wired up. -->

## Configuration checklist

| Property | Required | Notes |
|---|---|---|
| `hmc.url` | Yes | Base URL for HMC REST API |
| `hmc.deployment-id` | Yes | Sent as `HMCTS_DEPLOYMENT_ID` header; null causes silent auth failure |
| `flags.hmc-to-hearings-api.enabled` | Yes (to receive events) | Activates `HmcHearingsEventTopicListener` |
| `azure.service-bus.hmc-to-hearings-api.topicName` | Yes (to receive events) | Service Bus topic name for HMC events |
| `azure.service-bus.hmc-to-hearings-api.subscriptionName` | Yes (to receive events) | Per-service subscription on the HMC topic |

## Integration test surface

SSCS uses `rse-cft-lib` (`bootWithCCD`) to run an embedded CCD stack locally, which allows callback endpoint testing without a full deployed environment. Post-deployment functional tests in `sscs-post-deployment-ft-tests` cover end-to-end flows including hearing creation.

<!-- TODO: research note insufficient for hearing-specific integration test class names or test module paths -->

## See also

- [`docs/ccd/explanation/callbacks.md`](callbacks.md) — how CCD invokes aboutToSubmit/submitted webhooks; same auth model applies to HMC callbacks
- [`docs/ccd/explanation/work-allocation.md`](work-allocation.md) — parallel feature-flag pattern for WA integration; WA also creates Listing Officer tasks (`ScheduleHMCHearing`) tied to hearing events
- [`docs/ccd/explanation/case-flags.md`](case-flags.md) — case-flag codes (`PF*`, `RA*`, `SM*`, `CF*`) consumed by the hearings payload

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.

