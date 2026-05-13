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

Services that currently configure booking-based access include: **Civil**, **Private Law**, **Public Law**, **ST CIC**, **Employment**, **IAC**, and **SSCS**. These are the services whose Drools rules contain `JudicialBooking` fact references.

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

When a fee-paid judge logs into ExUI, the UI checks whether the user has any current role assignment with a `bookable: true` attribute. If so, the Booking UI is presented with three options:

1. **Create a new booking** — capture location and dates, then:
   - ExUI retrieves the region from Location Reference Data for the selected location.
   - Creates the booking by calling JBS.
   - Invokes ORM to recalculate the user's organisational roles.
   - Redirects to the landing page.
2. **Continue with an existing booking** — re-invokes ORM (to handle any prior mapping failure), then redirects.
3. **Access My Work** — redirects directly without additional processing.

If the booking creation succeeds but the ORM invocation fails, the user can log out and back in, choose "continue with existing booking", and ORM will be re-invoked. An error message instructs: "It has not been possible to grant you access to all the cases you may need. Please log out and log back in again to try again."
<!-- CONFLUENCE-ONLY: not verified in source -->

## The `bookable` attribute

The `bookable` attribute is a Boolean value set in a role assignment's additional attributes. It controls which users see the Booking UI on ExUI login.

Services configure their ORM Drools rules to emit `bookable: true` on at least one organisational role for the relevant subset of fee-paid users. In source, this appears as:

```java
attribute.put("bookable", JacksonUtils.convertObjectIntoJsonNode("true"));
```

Services currently setting `bookable: true`: Civil, Private Law, Public Law, ST CIC, SSCS.

For users who may not receive any other organisational roles (common for fee-paid judiciary), the `bookable` attribute can be added to the standard `hmcts-judiciary` role.
<!-- CONFLUENCE-ONLY: not verified in source -->

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
| `@ContractType` | Set to `SALARIED` or `Fee-Paid` on the role assignment |
| Unset attributes mean no restriction | If an attribute (e.g. `@Location`) is not relevant, it should not be set — setting it would limit access to that single court |

## Lifecycle and expiry

JBS only returns bookings where `endTime > now()` (via `BookingRepository.findByUserIdInAndEndTimeGreaterThan`). This includes **future** bookings that have not yet started. Expired bookings remain in the database but are invisible to query consumers.

### Retention and purge

The `am-role-assignment-batch-service` (a daily Kubernetes CronJob) purges expired booking records directly from the `booking` table using:

```sql
DELETE from booking b where b.end_time < (current_date - ?) + '00:00:00'::time
```

The retention period is configurable via `spring.judicial.days` (default: **730 days / 2 years**). This aligns with the business requirement that booking data be retained for 2 years to support audit review.

### Delete endpoint

A `DELETE /am/bookings/{userId}` endpoint exists for per-user cleanup (e.g. offboarding), but it is marked `@Hidden` and excluded from the published Swagger spec.

A `DELETE /am/role-mapping/judicial/bookings/{bookingId}` endpoint was documented in Confluence for ORM (to delete role assignments by booking reference), but this was explicitly marked as "out of scope from MVP" and does **not** exist in the current ORM source code.
<!-- CONFLUENCE-ONLY: not verified in source -->

## Security considerations

| # | Concern | Mitigation |
|---|---------|-----------|
| 1 | Judiciary are trusted to self-serve | Bookings may be audited; judicial users are informed of this |
| 2 | Booking alone does not grant access | Access only results from role assignments created by service-specific ORM mapping rules |
| 3 | Any user can create a booking for themselves | Only fee-paid judiciary have mapping rules that produce role assignments from bookings; other users' bookings have no effect |
| 4 | Inappropriate or long bookings | Business accepted the risk for a tactical mechanism; a configurable upper limit on duration was planned |
| 5 | Audit | The immutable booking table acts as its own audit log; bookings are retained for 2 years |

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
