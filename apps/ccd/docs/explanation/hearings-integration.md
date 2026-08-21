---
topic: hearings
audience: both
sources:
  - sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/controller/ServiceHearingsController.java
  - sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/service/HmcHearingApiService.java
  - sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/jms/listener/HmcHearingsEventTopicListener.java
  - sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/service/HearingsService.java
  - hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/HearingManagementController.java
  - hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/PartiesNotifiedController.java
  - hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/UnNotifiedHearingsController.java
  - hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/HearingActualsController.java
  - hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/HearingActualsManagementController.java
  - hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/LinkHearingGroupController.java
  - hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/LinkedHearingGroupController.java
  - hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/interceptors/HeaderProcessor.java
  - hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/config/DataStoreUrlManager.java
  - civil-service:src/main/java/uk/gov/hmcts/reform/civil/service/search/UnnotifiedHearingsSearchService.java
  - civil-service:src/main/java/uk/gov/hmcts/reform/civil/utils/HmcDataUtils.java
status: confluence-augmented
last_reviewed: 2026-08-20T00:00:00Z
confluence_checked_at: 2026-08-20T00:00:00Z
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
    title: "Hearings Integration"
    space: "RRFM"
    version: 31
    last_modified: "2026-08-02"
title: Hearings Integration (HMC)
diataxis: explanation
product: ccd
sources_sha:
  "sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/controller/ServiceHearingsController.java": "861b9728ec52f484cd67cf52ae535e294d913b47"
  "sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/service/HmcHearingApiService.java": "d50f364f4486ac9670af379ae6a4c07ca9dec465"
  "sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/jms/listener/HmcHearingsEventTopicListener.java": "d50f364f4486ac9670af379ae6a4c07ca9dec465"
  "sscs-tribunals-case-api:src/main/java/uk/gov/hmcts/reform/sscs/service/HearingsService.java": "6c32d1161fad34100629a45bab17ecd9a953e3bd"
  ? "hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/HearingManagementController.java"
  : "0bc687bf59a5bae74c9d9f3bae397c5f28c5664e"
  ? "hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/PartiesNotifiedController.java"
  : "5883017b6be19f0dc56deef1bfb5a64349f6ca23"
  ? "hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/UnNotifiedHearingsController.java"
  : "9931e730571e931982591fe1913b8591d3ee73aa"
  ? "hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/HearingActualsController.java"
  : "5c2a6bad955917f98ea9183c660873c216820b25"
  ? "hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/HearingActualsManagementController.java"
  : "5883017b6be19f0dc56deef1bfb5a64349f6ca23"
  ? "hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/LinkHearingGroupController.java"
  : "5883017b6be19f0dc56deef1bfb5a64349f6ca23"
  ? "hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/controllers/LinkedHearingGroupController.java"
  : "22529ef018d43095277fdf130c7667987d9265dc"
  "hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/interceptors/HeaderProcessor.java": "3d746be29dbd8181b6e485626034854e077c81f8"
  "hmc-cft-hearing-service:src/main/java/uk/gov/hmcts/reform/hmc/config/DataStoreUrlManager.java": "5c2a6bad955917f98ea9183c660873c216820b25"
  ? "civil-service:src/main/java/uk/gov/hmcts/reform/civil/service/search/UnnotifiedHearingsSearchService.java"
  : "17a4f4cc896dbc01115f6618b2f1062a7dfaa318"
  "civil-service:src/main/java/uk/gov/hmcts/reform/civil/utils/HmcDataUtils.java": "a9359f463a11d4130a71de643264d6db0e08dadf"
---

# Hearings Integration (HMC)

## TL;DR

- HMC is the shared HMCTS component that brokers hearings between consuming services and List Assist (ILA). Services integrate with HMC, never with List Assist directly. Hearing data lives in HMC, not duplicated on the CCD case.
- The service exposes two inbound callbacks (`POST /serviceHearingValues`, `POST /serviceLinkedCases`) that ExUI/HMC invoke to fetch case data.
- The service calls HMC outbound through a Feign client at `${hmc.url}` for `/hearing`, `/hearings`, `/partiesNotified`, `/unNotifiedHearings`. HMC itself is in this workspace (`apps/hmc/hmc-cft-hearing-service`), so the exact paths, verbs, path variables and required query parameters are verifiable — see [Outbound calls to HMC](#outbound-calls-to-hmc). Every path except `POST /hearing` and the multi-case reads is scoped by hearing id, not case reference.
- The service listens on an Azure Service Bus topic for hearing state-change events; this listener is feature-flagged (`flags.hmc-to-hearings-api.enabled`).
- The `HMCTS_DEPLOYMENT_ID` header is **optional and conditional**, not universal: HMC rejects it with a 400 unless deployment-id support is switched on in HMC itself. Only send it if the service is on a separate deployment.

## Where HMC sits

HMC is an integration and orchestration layer, not the hearing system itself. It accepts hearing requests, mediates the interface to downstream listing components (List Assist), holds hearing state, and pushes updates back to consuming services. A consuming service integrates once with HMC instead of building separate integrations to each downstream component.

Three reasons it exists as a separate component rather than as case fields on each service's case type:

1. **Collections.** Manage Cases handles arrays/collections of case data poorly, and a case can have many hearings with many versions each.
2. **Supplier risk.** The Scheduling & Listing platform behind HMC could be replaced; the abstraction layer localises the blast radius of that change.
3. **Ready-made journeys.** Where a manual listing process is needed, HMC provides a standard journey a service can adopt as-is, with the option to build a bespoke one instead.

HMC is the **system of record** for four things a consuming service should therefore not try to model on the case:

- every version of every hearing *request* (the original plus each change request)
- every version of every hearing *response*
- hearing-level actuals — not case or session actuals — including the feed to SDP for MI reporting
- every version of every linked hearing group

<!-- CONFLUENCE-ONLY: rationale and system-of-record list from page 1825037149 (v31); the request/response/linked-group versioning is visible in the HMC schema, the SDP MI feed is not verifiable from the controller layer. -->

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

The HMC API surface, read off the controllers in `hmc-cft-hearing-service` at `origin/master`. Note that the resource paths are **hearing-id-scoped** — only creation and the multi-case reads take no `{id}`:

| Method + path | Purpose | Success | Required role |
|---|---|---|---|
| `POST /hearing` | Create a hearing request (`HearingRequest` body) | 201 | `hearing-manager` on the case |
| `PUT /hearing/{id}` | Update an existing request (`UpdateHearingRequest`) | **201**, not 200 | `hearing-manager` |
| `DELETE /hearing/{id}` | Cancel — takes a `DeleteHearingRequest` **body**, so it is not a bare DELETE | 200 | `hearing-manager` |
| `GET /hearing/{id}` | Fetch a hearing request | 204 / 200 (see below) | `hearing-viewer` (+ `listed-hearing-viewer`) |
| `GET /hearings/{ccdCaseRef}` | All hearings for one case; optional `?status=` filter | 200 | via case access |
| `POST /hearings` | All hearings for a **list** of cases, paginated (`caseTypeId` query param + a body of case references, page size and offset) | 200 | via case access |
| `GET /unNotifiedHearings/{hmctsServiceCode}` | Hearing responses HMC believes the service has not yet acted on | 200 | S2S |
| `PUT /partiesNotified/{id}` | Service tells HMC it has actioned a response | 200 | `hearing-manager` |
| `GET /partiesNotified/{id}` | Read back what has already been notified | 200 | `hearing-manager` |
| `GET /hearingActuals/{id}` | Read hearing actuals | 200 | `hearing-viewer` **and** `listed-hearing-viewer` |
| `PUT /hearingActuals/{id}` | Save hearing actuals (incremental — repeatable during the hearing day) | 200 | `hearing-manager` |
| `POST /hearingActualsCompletion/{id}` | Commit the actuals and move the hearing to its outcome state | 200 | `hearing-manager` |
| `POST /linkedHearingGroup` | Validate and create a link group | 201 | `hearing-manager` on **every** hearing in the group |
| `PUT /linkedHearingGroup` | Update a link group — the group id is a `?id=` **query** param here, not a path variable | 200 | `hearing-manager` on every hearing in the group |
| `GET /linkedHearingGroup/{id}` | Read a link group | 200 | S2S only |
| `DELETE /linkedHearingGroup/{id}` | Delete a link group | 200 | S2S only |

Sources: `HearingManagementController.java:80`, `:111`, `:129`, `:151`, `:170`, `:188`, `:237`;
`UnNotifiedHearingsController.java:34`; `PartiesNotifiedController.java:46`, `:65`;
`HearingActualsController.java:31-40`; `HearingActualsManagementController.java:39-55`;
`LinkHearingGroupController.java:45`, `:62`, `:81`, `:92-98`; `LinkedHearingGroupController.java:24`.
The role names are the constants in `AccessControlServiceImpl` — `hearing-manager`,
`hearing-viewer`, `listed-hearing-viewer` — and are matched against the caller's AM role
assignments for the hearing's case, so a service integrating with HMC needs those roles
granted through Role Assignment, not just an S2S allow-list entry.

<!-- DIVERGENCE: the Possessions onboarding table on Confluence 1825037149 lists the surface as four unparameterised resources — `/hearing` taking all four verbs, `/hearings` GET-only, `/partiesNotified` and `/unNotifiedHearings`. Against source: `/hearing` is `/hearing/{id}` for GET/PUT/DELETE, `/hearings` is `/hearings/{ccdCaseRef}` for the single-case read and also accepts POST for the multi-case read, and `/partiesNotified` and `/unNotifiedHearings` are `{id}`- and `{hmctsServiceCode}`-scoped respectively. The verb semantics in the Confluence table (POST create, PUT update, DELETE cancel, GET pull) match source. Source wins. -->

Three shapes here catch integrators out:

- **`POST /hearings` is a read.** The multi-case variant is a POST only because the case-reference list, page size and offset travel in the body (`HearingManagementController.java:237-252`). `GET /hearings?ccdCaseRefs=…` does the same job and is marked `@Deprecated(forRemoval = true)` (`:214-222`) — do not build against it.
- **`GET /hearing/{id}` has two modes.** By default it returns the hearing and checks that the caller holds `hearing-viewer` on the case (plus `listed-hearing-viewer` when the hearing status is `LISTED`). With `?isValid=true` it skips case access entirely and answers 204 for "this hearing id exists", but only for one specific inbound S2S service — anyone else gets a 401 (`HearingManagementController.java:87-108`). It is an internal existence probe, not a service-facing endpoint.
- **`PUT /hearing/{id}` answers 201**, not 200 (`:170-171`) — a client asserting 200 on update will fail.

Two asymmetries in the link-group endpoints are worth knowing before wiring anything to them: the update takes its group id as a query parameter while the read and delete take it in the path, and neither the read nor the delete performs any case-level access check at all — they are S2S-only (`LinkedHearingGroupController.java:24-31`, `LinkHearingGroupController.java:81-89`), whereas create and update verify `hearing-manager` on every hearing in the group.

Every write carries `ServiceAuthorization`.

### `HMCTS_DEPLOYMENT_ID` is conditional, and it is a routing switch

`POST /hearing` and `PUT /hearing/{id}` accept an `HMCTS_DEPLOYMENT_ID` header declared `required = false` (`HearingManagementController.java:119-124`, `:177-183`), and both call `verifyDeploymentIdEnabled` before doing any work (`:306-314`). That check cuts both ways:

- if HMC has deployment-id support **enabled**, the value must be at most 40 characters, else 400 `"HMCTS deployment id must not be more than 40 …"`
- if HMC has it **disabled**, sending the header at all is a 400 `"HMCTS deployment id is not required"`

So a service that unconditionally stamps the header onto every HMC call will fail against an HMC instance where the feature is off. Send it only when the service actually runs on its own deployment, and treat it as something to agree with the HMC team rather than a header to set by default.

What the flag switches on is host overriding. When it is enabled, HMC's `HeaderProcessor` interceptor lets the *incoming request* redirect HMC's own outbound calls to CCD data-store and Role Assignment, taking the target URL from configurable per-service headers, checking it against an allow-list policy, and writing an override audit record; when disabled it always uses the statically configured hosts (`HeaderProcessor.java:39-45`, `:51-58`). The header names and defaults are config (`ccd.data-store.*`, `role-assignment.*` — `DataStoreUrlManager.java:18-27`), not constants. This is the mechanism that lets one HMC serve deployments with their own data-store and AM instances — see [CCD decentralisation](decentralisation.md).

`/hearingActuals`, `/hearingActualsCompletion` and `/linkedHearingGroup` exist in the API but are in practice driven from ExUI rather than from service code. <!-- CONFLUENCE-ONLY: ExUI-only ownership stated on page 1825037149 (v31); nothing in the controllers restricts them to ExUI, so a service can call them if it needs to. -->

Key model types in SSCS: `HearingRequestPayload`, `HearingCancelRequestPayload`, `HearingGetResponse`, `HearingsGetResponse`, `HmcUpdateResponse`.

### Acknowledging responses: `/unNotifiedHearings` and `/partiesNotified`

These two endpoints are a pair, and the parameters are where the contract actually lives.

`GET /unNotifiedHearings/{hmctsServiceCode}` is keyed on the **HMCTS service code**, not on a case or a hearing, and takes a time window: `hearing_start_date_from` is mandatory, `hearing_start_date_to` optional, both formatted `yyyy-MM-dd HH:mm:ss`, plus an optional repeatable `hearingStatus` filter (`UnNotifiedHearingsController.java:34-48`). It returns hearing ids and a total count — so a service polling it is asking "which hearings starting in this window have I not dealt with yet?".

`PUT /partiesNotified/{id}` then closes the loop, and it requires two query parameters that are easy to miss: `version` (the hearing request version the service acted on) and `received` (the response's received timestamp, `yyyy-MM-dd'T'HH:mm:ss`) — both mandatory (`PartiesNotifiedController.java:55-67`). HMC uses that pair to decide whether this response has already been acknowledged; getting them wrong is what produces the "I already notified this" and "I keep re-notifying" classes of bug. The `PartiesNotified` body carries a free-form `serviceData` blob, which is the service's own scratch space — see how civil uses it below.

## Inbound HMC topic events

`HmcHearingsEventTopicListener` is a JMS listener (Azure Service Bus, configured by `azure.service-bus.hmc-to-hearings-api.topicName` / `.subscriptionName`) that receives hearing state-change messages from HMC and delegates to `ProcessHmcMessageServiceV2` (`HmcHearingsEventTopicListener.java:41-46,66`). Incoming messages carry an `HmcMessage` with `caseId`, `hearingId`, and an `HmcStatus` field on `hearingUpdate`.

The listener is **disabled by default**. It only activates when `flags.hmc-to-hearings-api.enabled=true` is set (`HmcHearingsEventTopicListener.java:25`).

### The polling alternative (civil)

Civil takes a different shape — instead of the topic listener, `civil-service` polls HMC on a schedule. Both patterns are valid; which one a service uses is a design choice, not a platform requirement.

The poll is a plain Spring `@Scheduled` task, `AutomatedHearingNoticeScheduler`, driven by `scheduler.automated-hearing-notice.cronExpression`. On each run it authenticates as the system-update user and calls `GET /unNotifiedHearings/{hmctsServiceCode}` once per service id in `scheduler.automated-hearing-notice.serviceIds`, with `hearingStartDateFrom` set to **now minus seven days** and no upper bound, collecting the returned hearing ids (`UnnotifiedHearingsSearchService.java:32-56`). The seven-day window is the effective catch-up horizon: a response the service fails to acknowledge for longer than that stops being returned.

Change detection then decides whether each hearing needs a fresh notice. `requiresNewHearingNotice()` returns true if the service has never notified this hearing, or if `hearingScheduleChangedSinceLastNotification()` finds that the number of hearing days differs from what was recorded, or that any day's venue id or start/end times differ (`HmcDataUtils.java:126-155`). Two details matter:

- the comparison is against `serviceData` the service itself stored on the previous `PUT /partiesNotified` — HMC holds no opinion about what "changed" means, each service defines that
- HMC returns hearing times in UTC and civil runs them through `convertFromUTC` before comparing (`HmcDataUtils.java:135-140`), so a service that compares raw HMC timestamps against locally-stored local times will see spurious changes every summer

Separately, `hasAlreadyNotifiedResponse()` guards against re-notifying: it compares the request version and the response-received timestamp against what was last recorded (`HmcDataUtils.java:98-114`) — the same two values that `PUT /partiesNotified/{id}` requires as query parameters.

## Configuration checklist

| Property | Required | Notes |
|---|---|---|
| `hmc.url` | Yes | Base URL for HMC REST API |
| `hmc.deployment-id` | Yes | Sent as `HMCTS_DEPLOYMENT_ID` header; null causes silent auth failure |
| `flags.hmc-to-hearings-api.enabled` | Yes (to receive events) | Activates `HmcHearingsEventTopicListener` |
| `azure.service-bus.hmc-to-hearings-api.topicName` | Yes (to receive events) | Service Bus topic name for HMC events |
| `azure.service-bus.hmc-to-hearings-api.subscriptionName` | Yes (to receive events) | Per-service subscription on the HMC topic |

If the service polls instead of listening, the equivalent settings are a cron expression and the list of HMCTS service codes to poll for — in civil, `scheduler.automated-hearing-notice.cronExpression` and `scheduler.automated-hearing-notice.serviceIds` (`UnnotifiedHearingsSearchService.java:29-30`). Names are per-service; there is no platform-wide convention for them.

## Integration test surface

SSCS uses `rse-cft-lib` (`bootWithCCD`) to run an embedded CCD stack locally, which allows callback endpoint testing without a full deployed environment. Post-deployment functional tests in `sscs-post-deployment-ft-tests` cover end-to-end flows including hearing creation.

<!-- TODO: research note insufficient for hearing-specific integration test class names or test module paths -->

## See also

- [`apps/ccd/docs/explanation/callbacks.md`](callbacks.md) — how CCD invokes aboutToSubmit/submitted webhooks; same auth model applies to HMC callbacks
- [`apps/ccd/docs/explanation/work-allocation-integration.md`](work-allocation-integration.md) — parallel feature-flag pattern for WA integration; WA also creates Listing Officer tasks (`ScheduleHMCHearing`) tied to hearing events
- [`apps/ccd/docs/explanation/case-flags.md`](case-flags.md) — case-flag codes (`PF*`, `RA*`, `SM*`, `CF*`) consumed by the hearings payload
- [`apps/ccd/docs/explanation/linked-cases.md`](linked-cases.md) — the case-linking model behind the `POST /serviceLinkedCases` callback and `hearingIsLinkedFlag`
- [`apps/ccd/docs/explanation/decentralisation.md`](decentralisation.md) — what `HMCTS_DEPLOYMENT_ID` and the data-store/AM host overrides are for
- [Next Hearing Date](next-hearing-date.md) — how hearing data from HMC is cached onto the case as `nextHearingDetails` and kept current by the batch updater

## Glossary

See [Glossary](../reference/glossary.md) for term definitions used in this page.
