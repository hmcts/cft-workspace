---
title: Judicial Booking
topic: judicial-booking
diataxis: explanation
product: am
audience: both
sources:
  - am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/data/BookingEntity.java
  - am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/domain/service/common/ParseRequestService.java
  - am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/CreateBookingController.java
  - am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/QueryBookingController.java
  - am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/DeleteBookingController.java
  - am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/util/ValidationUtil.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/JudicialBookingService.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/JudicialRefreshOrchestrator.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RequestMappingService.java
  - am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
  - am-role-assignment-batch-service:src/main/java/uk/gov/hmcts/reform/roleassignmentbatch/task/DeleteJudicialExpiredRecords.java
  - am-judicial-booking-service:src/main/resources/db/migration/V1_1__init_tables.sql
  - am-org-role-mapping-service:src/main/resources/validationrules/fr/fr-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/possessions/possessions-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/privatelaw/privatelaw-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/publiclaw/publiclaw-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/sscs/sscs-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/resources/validationrules/stcic/stcic-judicial-org-role-mapping.drl
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/constants/RoleAssignmentConstants.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/controller/testingsupport/RefreshJobsController.java
  - am-role-assignment-batch-service:src/main/resources/application.yaml
  - cnp-flux-config:apps/am/am-role-assignment-batch-service/prod.yaml
  - rpx-xui-webapp:src/app/app-utils.ts
  - rpx-xui-webapp:api/accessManagement/index.ts
  - rpx-xui-webapp:src/booking/containers/booking-home/booking-home.component.html
  - rpx-xui-webapp:src/booking/containers/utils/booking-error-handler.ts
  - rpx-xui-webapp:src/booking/containers/utils/refresh-booking-service-down/refresh-booking-service-down.component.html
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
  - apps/am/am-role-assignment-batch-service/src/main/java/uk/gov/hmcts/reform/roleassignmentbatch/task/DeleteJudicialExpiredRecords.java
  - apps/am/am-judicial-booking-service/src/main/resources/db/migration/V1_1__init_tables.sql
confluence:
  - id: "1507722499"
    title: "HLD - Judicial Booking Service - v1.2"
    last_modified: "unknown"
    space: "AM"
  - id: "1446904483"
    title: "Judicial Booking Mapping Rules"
    last_modified: "unknown"
    space: "AM"
  - id: "1504220456"
    title: "Judicial Bookings for Access Management"
    last_modified: "unknown"
    space: "AM"
  - id: "1614644354"
    title: "Introduction - Judicial Booking Service Release 3.0.0"
    last_modified: "unknown"
    space: "AM"
  - id: "1491649414"
    title: "3.2C Bookings for fee-paid JOHs"
    last_modified: "unknown"
    space: "DPM"
  - id: "1440498448"
    title: "DELETE /am/role-mapping/judicial/bookings/{bookingId}"
    last_modified: "unknown"
    space: "AM"
  - id: "1616388314"
    title: "Judicial Booking Onboarding"
    last_modified: "unknown"
    space: "WA"
confluence_checked_at: "2026-05-13T12:00:00Z"
sources_sha:
  "am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/data/BookingEntity.java": "3d9772cc831118b015b4a2ef2561e1d452d39706"
  "am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/domain/service/common/ParseRequestService.java": "a0524b1559c3649d1968355a4e74923661921fa2"
  "am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/CreateBookingController.java": "3d9772cc831118b015b4a2ef2561e1d452d39706"
  "am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/QueryBookingController.java": "3d9772cc831118b015b4a2ef2561e1d452d39706"
  "am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/controller/endpoints/DeleteBookingController.java": "1e0e29994093123b06bd2b86b19fd6b8b1e85110"
  "am-judicial-booking-service:src/main/java/uk/gov/hmcts/reform/judicialbooking/util/ValidationUtil.java": "3d9772cc831118b015b4a2ef2561e1d452d39706"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/JudicialBookingService.java": "df884872022dce37def76a71025b1b22e19e2635"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/JudicialRefreshOrchestrator.java": "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/service/RequestMappingService.java": "fdc432dbe5badb633ba4e240bfc2fb2ec5453602"
  "am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl": "c15c7771f4f24dbfecdc81514fe9f16c2546ed6c"
  "am-role-assignment-batch-service:src/main/java/uk/gov/hmcts/reform/roleassignmentbatch/task/DeleteJudicialExpiredRecords.java": "85ab735f7b60e74650e8a27dc8c473a6a750722d"
  "am-judicial-booking-service:src/main/resources/db/migration/V1_1__init_tables.sql": "910817b922d76c16f7c7a1cdf63105516b36b705"
  "am-org-role-mapping-service:src/main/resources/validationrules/fr/fr-judicial-org-role-mapping.drl": "080b61f9e21bcf71d7ffef41b25dfe83dcdda889"
  "am-org-role-mapping-service:src/main/resources/validationrules/possessions/possessions-judicial-org-role-mapping.drl": "f2c71dea6e9fc93641f7c24ceb6123d73d392f68"
  "am-org-role-mapping-service:src/main/resources/validationrules/privatelaw/privatelaw-judicial-org-role-mapping.drl": "1b2ec64659c7e77fe685e5853be198d1ec32f25b"
  "am-org-role-mapping-service:src/main/resources/validationrules/publiclaw/publiclaw-judicial-org-role-mapping.drl": "fcdfb1cea50ee1d860963eead015847111abc007"
  "am-org-role-mapping-service:src/main/resources/validationrules/sscs/sscs-judicial-org-role-mapping.drl": "75b324acbae0da519899d031d9b31e4a1e33b3f0"
  "am-org-role-mapping-service:src/main/resources/validationrules/stcic/stcic-judicial-org-role-mapping.drl": "3ccbdde742b4e7b15a2e2fea1f2e8b0a0f3a8f54"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/domain/model/constants/RoleAssignmentConstants.java": "7e4eb810bfd5adca1c0c9825960a6e1e5a9c8851"
  ? "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/controller/testingsupport/RefreshJobsController.java"
  : "c092ca0bb3566da4b89134b0c1392d9cbca2a23b"
  "am-role-assignment-batch-service:src/main/resources/application.yaml": "85ab735f7b60e74650e8a27dc8c473a6a750722d"
  "cnp-flux-config:apps/am/am-role-assignment-batch-service/prod.yaml": "65bd3d613151c3022fa81bdfe62a93ce33b88145"
  "rpx-xui-webapp:src/app/app-utils.ts": "eed279a4dd5502643063241d86c2911799acac38"
  "rpx-xui-webapp:api/accessManagement/index.ts": "ff76662ca439152d588ee2ff0e17025be3413fc7"
  "rpx-xui-webapp:src/booking/containers/booking-home/booking-home.component.html": "0cc0e9a4686b861db394bcc009c4b6681b24badd"
  "rpx-xui-webapp:src/booking/containers/utils/booking-error-handler.ts": "1bb90ae55466b4ca3bf2b1df1b0ac19b6fa8cd20"
  "rpx-xui-webapp:src/booking/containers/utils/refresh-booking-service-down/refresh-booking-service-down.component.html": "0cc0e9a4686b861db394bcc009c4b6681b24badd"
---

## TL;DR

- A judicial booking is a time-bounded record that assigns a fee-paid judge to a location/region for a date range, enabling location-scoped case access only while they are sitting.
- Stored by `am-judicial-booking-service` (JBS, port 4097) in its own PostgreSQL database.
- The primary consumer is `am-org-role-mapping-service` (ORM), which fetches active bookings during judicial role mapping and inserts them as Drools facts alongside judicial access profiles.
- Drools mapping rules join bookings with profiles on `userId` and use the booking's `locationId`/`regionId` to populate role assignment attributes (not as join conditions).
- Bookings use inclusive end dates internally (`endTime = endDate + 1 day at midnight UTC`), so a booking remains active until midnight UTC after the stated end date.
- The `bookable` attribute on an existing role assignment determines whether ExUI presents the Booking UI on login; the feature is opt-in per service.

## Purpose and design intent

The judicial booking service is a **tactical, interim** solution allowing fee-paid judiciary to self-serve their bookings through ExUI when they log in. It is intended to be replaced by the Future Hearings Resource Management Tool, which would provide booking information from a centralised scheduling system without self-service.

The service exists for two reasons:

1. **Case access control** — to create organisational role assignments giving fee-paid judges access to the cases they need during the booking period.
2. **Audit** — to create a reviewable trail of self-serve bookings, ensuring no inappropriate access is being self-granted.

Without a booking, a fee-paid judge has access **only** to cases explicitly allocated to them via case roles (their "My Cases"). During a booking period, they additionally gain standard organisational access (e.g. work basket, task lists) scoped to the booking's location and region.
<!-- CONFLUENCE-ONLY: not verified in source -->

## Who this applies to

Fee-paid Judicial Office Holders (JOHs) within CFT, which include:

- Fee-paid judges (e.g. Deputy District Judges, Recorders, Deputy Circuit Judges)
- Tribunal panel members (medical, financial, disability-qualified)
- Family magistrates

Seven jurisdictions configure booking-based access — their rule files are the only ones that reference the `JudicialBooking` fact: civil, fr (financial remedy), possessions, privatelaw, publiclaw, sscs and stcic. Employment and IAC do not; their judicial rules derive location from the JRD appointment alone.

<!-- DIVERGENCE: Confluence lists Employment and IAC among the services configuring booking-based access. Neither jurisdiction's rule file references the `JudicialBooking` fact in source, while fr and possessions — absent from the Confluence list — both do. Source wins. -->

Services without fee-paid judges, or that wish all fee-paid judges to see all cases without a booking gate, do not need to configure this feature.
<!-- CONFLUENCE-ONLY: not verified in source -->

## What a booking represents

A booking answers: "Judge X is sitting at location Y in region Z from date A to date B." The booking captures only **where** and **when** — never **what** type of work. The data model is minimal:

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `userId` | String | IDAM user ID (UUID or legacy numeric) |
| `locationId` | String (nullable) | HMCTS base location code (EPIMS ID) |
| `regionId` | String (nullable) | HMCTS region code |
| `beginTime` | ZonedDateTime | Midnight UTC of `beginDate` |
| `endTime` | ZonedDateTime | Midnight UTC of `endDate + 1 day` (inclusive) |
| `created` | ZonedDateTime | Set at write time |

`locationId` and `regionId` are free-text strings with no foreign-key constraint against reference data. A booking may be region-only (no `locationId`), but a `locationId` without a `regionId` is rejected at validation time (`ValidationUtil.validateBookingRequest`).

### Inclusive date semantics

The `first_day` (beginDate) and `last_day` (endDate) represent an inclusive date range. Role assignments created from the booking must use `endDate + 1` as their end time. This approach was adopted because bookings have no start/end time, just dates, with all bookings starting and ending at midnight. For example:

| First Day of Booking | Tuesday 20th July |
|---------------------|-------------------|
| Role Assignment Begin | Tuesday 20th July, 00:00:00 UTC |
| Last Day of Booking | Thursday 22nd July |
| Role Assignment End | **Friday** 23rd July, 00:00:00 UTC |

## How bookings are created

A caller POSTs to `POST /am/bookings` with a `BookingRequestWrapper` body containing `beginDate` and `endDate` (both `LocalDate`). The service converts these to UTC timestamps: `beginDate` becomes midnight UTC on that day; `endDate` becomes midnight UTC of the following day (`ParseRequestService.java:50-51`). This makes the booking inclusive of the end date.

Key constraints:

- `beginDate` must not be in the past — backdating is rejected.
- `endDate` must not be before `beginDate`.
- `userId` defaults to the JWT subject if omitted; if supplied, it must match the JWT subject unless the caller's S2S service is in the bypass list.
- Authorised S2S callers: `am_judicial_booking_service`, `am_org_role_mapping_service`, `xui_webapp`.

### UX flow

When a judge in the `JUDICIAL` role category holds a role assignment carrying `bookable`, ExUI redirects them to a page headed "Work access" offering three radio options — `rpx-xui-webapp:src/booking/containers/booking-home/booking-home.component.html:5`, `:23`, `:71`, `:83`:

1. **Create a new booking** — captures location and dates, POSTs to JBS via the `/am/createBooking` node proxy, then calls ORM's `POST /am/role-mapping/judicial/refresh` through `refreshRoleAssignments` before routing to `/work/my-work/list` (`rpx-xui-webapp:api/accessManagement/index.ts:36-85`).
2. **Choose an existing booking** — skips the JBS write and calls `refreshRoleAssignments` only, which re-runs the mapping for a booking whose earlier refresh failed.
3. **View tasks and cases** — routes straight to the task and case lists with no JBS or ORM call, leaving existing bookings untouched.

The create and refresh legs fail separately. A failed create is routed by status code — 401/403 to `/not-authorised`, 500 to `/service-down`, anything else to `/booking-service-down`; a failed refresh always routes to `/refresh-booking-service-down` (`rpx-xui-webapp:src/booking/containers/utils/booking-error-handler.ts:13-35`). The refresh case is the damaging one: the booking is already stored, but no role assignments were derived from it, so the judge holds a booking that grants nothing. That page reads "Sorry, due to a system error when your booking was created you cannot access cases." and directs the judge to log out and re-select the booking — which re-enters at option 2 and retries the refresh (`rpx-xui-webapp:src/booking/containers/utils/refresh-booking-service-down/refresh-booking-service-down.component.html:6-9`).

<!-- DIVERGENCE: Confluence quotes the failure message as "It has not been possible to grant you access to all the cases you may need. Please log out and log back in again to try again." and names the third option "Access My Work". Source shows a different message on `/refresh-booking-service-down` and labels the third option "View tasks and cases". Source wins. -->

## The `bookable` attribute

`bookable` is written as the JSON **string** `"true"`, not a boolean. It controls which users see the Booking UI on ExUI login. In source it always appears as:

```java
attribute.put("bookable", JacksonUtils.convertObjectIntoJsonNode("true"));
```

ExUI accounts for both shapes — `isBookableAndJudicialRole` accepts `bookable === true || bookable === 'true'` — but a new consumer that tests only for the boolean will never see the flag (`rpx-xui-webapp:src/app/app-utils.ts:291-303`).

Eight rules across seven jurisdictions set it: `civil-judicial-org-role-mapping.drl:353` and `:387`, `fr-judicial-org-role-mapping.drl:150`, `possessions-judicial-org-role-mapping.drl:75`, `privatelaw-judicial-org-role-mapping.drl:245`, `publiclaw-judicial-org-role-mapping.drl:325`, `sscs-judicial-org-role-mapping.drl:474` and `stcic-judicial-org-role-mapping.drl:374`.

Every one of those rules sets it on a `fee-paid-judge` role assignment. No rule sets it on `hmcts-judiciary`, so a fee-paid judge whose only organisational role is `hmcts-judiciary` is not offered the Booking UI in any jurisdiction today.

## How ORM consumes bookings

During a judicial refresh (triggered by `POST /am/role-mapping/judicial/refresh` or a JRD Service Bus event), ORM's `JudicialRefreshOrchestrator`:

1. Retrieves judicial access profiles from JRD.
2. Calls `JudicialBookingService.fetchJudicialBookings` — which POSTs to `POST /am/bookings/query` with the same set of user IDs.
3. Passes both profiles and bookings to `RequestMappingService.createJudicialAssignments`.

Inside `RequestMappingService.getRoleAssignments` (line 200), bookings are inserted as facts into the Drools `StatelessKieSession` alongside access profiles and feature flags:

```java
commands.add(CommandFactory.newInsertElements(judicialBookings));
```

### Drools rule pattern

Booking-dependent rules join on `userId` only. The booking's `locationId` and `regionId` are used to **set** attributes on the resulting role assignment, not as additional join conditions:

```drools
$joh: JudicialOfficeHolder(office in ("CIVIL Deputy District Judge-Fee-Paid", ...))
$bk:  JudicialBooking(userId == $joh.userId)
then
   attribute.put("primaryLocation", $bk.getLocationId() != null ?
       $bk.getLocationId() : $joh.getPrimaryLocation());
   attribute.put("baseLocation", $bk.getLocationId());
   attribute.put("region", $bk.getRegionId());
   // Role assignment begin/end times come from the booking:
   .beginTime($bk.getBeginTime())
   .endTime($bk.getEndTime())
```
<!-- DIVERGENCE: Confluence says mapping rules join bookings with profiles on userId/locationId/regionId, but am-org-role-mapping-service:src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl:106 shows rules join only on userId; locationId and regionId are used to populate role assignment attributes. Source wins. -->

The resulting role assignment is time-bounded to the booking period (beginTime/endTime), so the judge's organisational access is automatically scoped to the booking duration.

As an additional benefit, recalculation of booking-derived role assignments happens whenever:
- A booking is created and ORM is invoked.
- A full refresh is triggered (e.g. rule change, daily batch).
- The judge's reference data changes (appointment or authorisation added/removed).

### Booking-independent roles vs booking-dependent roles

For fee-paid judges, ORM rules typically produce **two** sets of roles:

1. **Booking-independent** (e.g. `fee-paid-judge` with `bookable: true`) — always present, enables the Booking UI, but typically has no `region`/`baseLocation` set (or limited work types).
2. **Booking-dependent** (e.g. `deputy-district-judge`) — only created when a matching `JudicialBooking` fact exists, scoped to the booking's location and time range, with full work types.

### Resilience

ORM is registered in JBS's `bypass-userid-validation-for-services` config, allowing it to query bookings for any user without the JWT subject check. The Feign client includes `@Retryable` with 3 attempts and 500ms initial delay with multiplier 3 (`JudicialBookingService.java:27`). If JBS is entirely unreachable, the response falls back to an empty booking list — roles are mapped without location context.
<!-- DIVERGENCE: Confluence says bypass-userid-validation includes xui_webapp, but am-judicial-booking-service:src/main/resources/application.yaml:117 shows only am_org_role_mapping_service. xui_webapp is authorised for S2S but does NOT bypass userId validation. Source wins. -->

## Mapping rules overview

From the "Judicial Booking Mapping Rules" Confluence page, key principles for how bookings map to role assignments:

| Principle | Detail |
|-----------|--------|
| Bookings and roles are different concepts | Booking "roles" are jobs; role assignment roles are individual responsibilities with access permissions |
| One booking produces multiple role assignments | A single booking can result in several role assignments for the same user |
| Half-open intervals | Role assignment begin/end are always half-open: begin is inclusive, end is exclusive |
| Authorisations are copied, not matched | Judicial authorisations (ticket codes) are copied into role assignments and applied by CCD, not used as booking match conditions |
| `@ContractType` | One of exactly three literals — `Salaried`, `Fee-Paid`, `Voluntary` (`RoleAssignmentConstants.java:33-35`) |
| Unset attributes mean no restriction | If an attribute (e.g. `@Location`) is not relevant, it should not be set — setting it would limit access to that single court |

## Lifecycle and expiry

JBS only returns bookings where `endTime > now()` (via `BookingRepository.findByUserIdInAndEndTimeGreaterThan`). This includes **future** bookings that have not yet started. Expired bookings remain in the database but are invisible to query consumers.

### Retention and purge

The `am-role-assignment-batch-service` (a daily Kubernetes CronJob) purges expired booking records directly from the `booking` table using:

```sql
DELETE from booking b where b.end_time < (current_date - ?) + '00:00:00'::time
```

The retention window is 730 days, from `days: ${DAYS:730}` (`am-role-assignment-batch-service:src/main/resources/application.yaml:45`). Prod deploys that same value and runs the CronJob at 22:00 daily — `cnp-flux-config:apps/am/am-role-assignment-batch-service/prod.yaml:8` and `:15`. A negative value aborts the task rather than deleting every row (`DeleteJudicialExpiredRecords.java:55-58`).

### Delete endpoint

A `DELETE /am/bookings/{userId}` endpoint exists for per-user cleanup (e.g. offboarding). It returns 204 and is annotated `@Hidden`, so it is live but excluded from the published Swagger spec (`DeleteBookingController.java:17-41`). JBS exposes no `PUT` or `PATCH` on bookings, so a stored booking can be deleted but not amended.

ORM has no booking-delete endpoint. Its only `@DeleteMapping` is `/am/testing-support/jobs/{jobId}` (`RefreshJobsController.java:126`), so the `DELETE /am/role-mapping/judicial/bookings/{bookingId}` route documented in Confluence was never built.

## Security considerations

| # | Concern | Mitigation |
|---|---------|-----------|
| 1 | Judiciary are trusted to self-serve | Bookings may be audited; judicial users are informed of this |
| 2 | Booking alone does not grant access | Access only results from role assignments created by service-specific ORM mapping rules |
| 3 | Any user can create a booking for themselves | Only fee-paid judiciary have mapping rules that produce role assignments from bookings; other users' bookings have no effect |
| 4 | Inappropriate or long bookings | Business accepted the risk for a tactical mechanism; a configurable upper limit on duration was planned |
| 5 | Audit | The booking table is the only record of a self-serve booking; rows are retained 730 days and then hard-deleted with no audit trail written |

<!-- DIVERGENCE: Confluence describes the booking table as immutable, with no update or delete in initial scope, serving as its own audit log. Source has a live (Swagger-hidden) `DELETE /am/bookings/{userId}` and a nightly purge that removes rows outright, so the table is neither immutable nor a durable audit log beyond the retention window. Source wins. -->

## NFR: volume estimates

The upper limit is approximately **one booking per day per fee-paid judge**. Based on RSU data from Confluence, daily volumes across all regions are approximately 50-80 bookings per day for DDJs and Recorders combined (Civil and Family), with tribunal bookings managed separately per service.
<!-- CONFLUENCE-ONLY: not verified in source -->

## Examples

### Fee-paid judicial role that requires a JudicialBooking (Civil deputy district judge, real source)

This is the actual production rule pattern. Stage 2 matches the `JudicialOfficeHolder` produced by Stage 1 and also requires a `JudicialBooking` fact to be present. The booking provides `locationId` and `regionId` for the role assignment attributes; without a booking, the rule simply does not fire and no role assignment is created.

```drool
// Source: apps/am/am-org-role-mapping-service/src/main/resources/validationrules/civil/civil-judicial-org-role-mapping.drl
rule "civil_deputy_district_judge_org_role"
when
  $f:  FeatureFlag(status && flagName == FeatureFlagEnum.CIVIL_WA_2_1.getValue())
  $joh: JudicialOfficeHolder(office in ("CIVIL Deputy District Judge-Fee-Paid",
                                        "CIVIL Deputy District Judge - Sitting in Retirement-Fee-Paid",
                                        "CIVIL District Judge (sitting in retirement)-Fee-Paid"))
  $bk: JudicialBooking(userId == $joh.userId)
then
   Map<String,JsonNode> attribute = new HashMap<>();
   attribute.put("contractType", JacksonUtils.convertObjectIntoJsonNode("Fee-Paid"));
   attribute.put("jurisdiction", JacksonUtils.convertObjectIntoJsonNode("CIVIL"));
   attribute.put("primaryLocation", JacksonUtils.convertObjectIntoJsonNode($bk.getLocationId() != null ?
       $bk.getLocationId():$joh.getPrimaryLocation()));
   attribute.put("baseLocation", JacksonUtils.convertObjectIntoJsonNode($bk.getLocationId()));
   attribute.put("region", JacksonUtils.convertObjectIntoJsonNode($bk.getRegionId()));
   attribute.put("workTypes", JacksonUtils.convertObjectIntoJsonNode("decision_making_work,applications," +
                                                                     "multi_track_decision_making_work," +
                                                                     "intermediate_track_decision_making_work"));
  insert(
      RoleAssignment.builder()
      .actorIdType(ActorIdType.IDAM)
      .actorId($joh.getUserId())
      .roleCategory(RoleCategory.JUDICIAL)
      .roleType(RoleType.ORGANISATION)
      .roleName("deputy-district-judge")
      .grantType(GrantType.STANDARD)
      .classification(Classification.PUBLIC)
      .readOnly(false)
      .beginTime($bk.getBeginTime())
      .endTime($bk.getEndTime())
      .attributes(attribute)
      .authorisations($joh.getTicketCodes())
      .build());
      logMsg("Rule : civil_deputy_district_judge_org_role");
end;
```

Key points visible in the real source:
- `$bk: JudicialBooking(userId == $joh.userId)` — join is on userId only; `locationId`/`regionId` are read from the booking to populate attributes, not used as join conditions.
- `beginTime`/`endTime` come from `$bk` (the booking period), not from the judicial appointment.
- `primaryLocation` falls back to `$joh.getPrimaryLocation()` when `$bk.getLocationId()` is null (region-only bookings).

### JBS booking table schema (real source)

```sql
// Source: apps/am/am-judicial-booking-service/src/main/resources/db/migration/V1_1__init_tables.sql
CREATE TABLE booking(
    id uuid NOT NULL,
    user_id text NOT NULL,
    location_id text,
    region_id text,
    begin_time timestamp NOT NULL,
    end_time timestamp NOT NULL,
    created timestamp NOT NULL,
    CONSTRAINT booking_pkey PRIMARY KEY (id)
);
```

`location_id` and `region_id` are nullable — a booking can cover a whole region without specifying a specific court. `end_time` is stored as `endDate + 1 day at midnight UTC` (half-open interval). There are no foreign-key constraints on location/region codes.

### Batch purge: judicial booking deletion query (real source)

```java
// Source: apps/am/am-role-assignment-batch-service/src/main/java/uk/gov/hmcts/reform/roleassignmentbatch/task/DeleteJudicialExpiredRecords.java
public int deleteJudicialBookingRecords(int days) {
    Object[] params = {days};
    int[] types = {Types.INTEGER};
    String deleteSql = "DELETE from booking b where b.end_time < (current_date - ? ) + '00:00:00'::time";
    return jdbcTemplate.update(deleteSql, params, types);
}
```

The `days` value defaults to 730 (2 years). Bookings are hard-deleted with no audit trail written. The `+ '00:00:00'::time` suffix anchors the cutoff at midnight on the computed date, matching the half-open interval convention used when booking `endTime` values are stored.

## See also

- [Org Role Mapping Flow](org-role-mapping-flow.md) — how ORM orchestrates the full judicial refresh, including the two-stage Drools rule evaluation that consumes bookings
- [Architecture](architecture.md) — JBS endpoint reference, database schema, and how JBS fits within the AM component diagram
- [Batch Jobs](batch-jobs.md) — the purge batch that hard-deletes expired booking records from the JBS database
- [Drools Rules](drools-rules.md) — the `JudicialBooking` fact and how fee-paid rules join on `userId` to derive location-scoped role assignments
