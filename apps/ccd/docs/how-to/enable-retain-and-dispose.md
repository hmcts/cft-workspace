---
topic: retain-and-dispose
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/TTL.java@f87e5cbc49e4bd8c9448a8d5752e805c69d16ecf
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedeletion/TimeToLiveService.java@0afa06a9ffaa5094e0e715f414a0a885479696a9
  - ccd-data-store-api:src/main/resources/application.properties
  - ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/data/CaseDataRepository.java
  - ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/parameter/DefaultParameterResolver.java
  - ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/service/remote/RemoteDisposeService.java
  - ccd-case-disposer:src/main/resources/application.yaml
  - ccd-case-disposer:charts/ccd-case-disposer/values.yaml@9fc420ba5e7b34c664988c8e41893cf1120a4be1
status: reviewed
last_reviewed: 2026-06-30T00:00:00Z
confluence:
  - id: "1525467847"
    title: "Case Retain and Disposal"
    space: "RCCD"
    last_modified: "v14 (canonical design reference)"
  - id: "1525469246"
    title: "Technical Setup Guide: Retain & Dispose Onboarding Configuration"
    space: "RCCD"
title: Enable Retain and Dispose
diataxis: how-to
product: ccd
---

# Enable Retain and Dispose

Retain and Dispose is CCD's case-retention feature: a `TTL` (time-to-live) field on
each case records when it may be deleted, and a separately-deployed batch job —
`ccd-case-disposer` — permanently removes cases (and their associated artefacts) once
that date passes. This page covers how a service team switches it on for a case type.

## TL;DR

- Add the platform-defined **`TTL`** complex field to your case type — by name, without
  redefining its sub-fields.
- Set **`TTLIncrement`** (days) on the events that should push the deletion date forward;
  on submit CCD sets `SystemTTL = today + increment`.
- Get your case type added to the disposer's **`DELETE_CASE_TYPES`** Flux env var — until
  this is done, *nothing is ever deleted*, regardless of TTL values.
- Roll out safely via **`SIMULATED_CASE_TYPES`** first — the disposer logs what it *would*
  delete without actually deleting.
- TTL changes are subject to the platform **`TTLGuard`** (default 365 days): you cannot
  suspend or override a case to a deletion date nearer than the guard.
- **Decentralised services** must additionally run their own garbage-collection cron —
  the disposer purges only CCD-owned data, not your service-side store. See
  [Decentralised services](#decentralised-services).

## Prerequisites

- A case type wired via `CCDConfig<CaseData, State, UserRole>` (SDK) or a JSON/Excel
  definition.
- Knowledge of which business events represent "activity" that should extend retention.
- For the disposer config step: access to the relevant `cnp-flux-config` environment, or
  a platform/CCD team contact who can make the change.

## 1. Add the TTL field to your case type

`TTL` is a platform-defined complex type (`@ComplexType(name = "TTL")` in
`TTL.java`). You reference it by name — you do **not** declare its sub-fields in your own
`ComplexTypes` tab.

Its three sub-fields:

| Sub-field | Type | Meaning |
|---|---|---|
| `SystemTTL` | `LocalDate` | System-maintained deletion date, driven by `TTLIncrement` on events |
| `OverrideTTL` | `LocalDate` | Caseworker override; **takes precedence** over `SystemTTL` |
| `Suspended` | `YesOrNo` | `Yes` pauses deletion indefinitely; empty is treated as `No` |

**SDK** — declare a `TTL` field on your `CaseData`:

```java
import uk.gov.hmcts.ccd.sdk.type.TTL;

@CCD(label = "Time to live")
private TTL ttl;
```

**JSON/Excel** — add a `CaseField` of type `TTL` to the case type in the usual way.

The resolved deletion date is computed by `TimeToLiveService` and written to the
`resolved_ttl` column on the case row: if `Suspended` is `Yes` (or empty-resolving-to-no
logic aside) the resolved TTL is null and the case **cannot** be deleted; otherwise
`OverrideTTL` beats `SystemTTL`. If both are null the case cannot be deleted.

## 2. Set the TTL on significant events

The normal way to move the deletion date is `TTLIncrement` on an event definition. When
the event is submitted, CCD sets `SystemTTL = today + TTLIncrement`.

**SDK** — chain `.ttlIncrement(days)` on the event builder (`Event.java`):

```java
configBuilder.event("submitApplication")
    .forStateTransition(Draft, Submitted)
    .name("Submit application")
    .ttlIncrement(90)        // retain for 90 days from submission
    .grant(CREATE_READ_UPDATE, CASE_WORKER);
```

**JSON** — set the `TTLIncrement` column (integer days) on the `CaseEvent` tab.

You can also let a caseworker event write `OverrideTTL` or `Suspended` directly, but those
changes are constrained by the guard (next section).

### The TTL guard

`TimeToLiveService` enforces `ttl.guard` (env `TTL_GUARD`, **default 365 days**,
configured in `ccd-data-store-api`'s `application.properties`). If an event changes
`Suspended` or `OverrideTTL` such that the resolved deletion date would be sooner than
`today + TTLGuard`, the event is **rejected**. This stops a case being fast-tracked to
near-term deletion by mistake. CCD also rejects any callback (`AboutToStart`, `MidEvent`,
`AboutToSubmit`) that alters TTL sub-field values.

## 3. Register the case type with the disposer

This is the step that's easy to forget — **TTL on a case does nothing on its own.** The
`ccd-case-disposer` job only queries case types it has been explicitly told about:

```sql
-- CaseDataRepository.findExpiredCases
SELECT c FROM CaseDataEntity c
WHERE c.resolvedTtl < CURRENT_DATE
  AND c.caseType IN :queryCaseTypes
ORDER BY c.resolvedTtl DESC
```

`:queryCaseTypes` comes from two comma-separated Flux env vars on the
`ccd-case-disposer` deployment (`DefaultParameterResolver`):

| Env var | Helm/property | Effect |
|---|---|---|
| `DELETE_CASE_TYPES` | `deletable.case.types` | Case types deleted for real |
| `SIMULATED_CASE_TYPES` | `simulated.case.types` | Case types logged but **not** deleted (dry run) |

Both default to empty, so by default **no case is ever deleted**. A case type must not be
in both lists at once — the disposer treats that as a misconfiguration and aborts the run.

To onboard:

1. Raise a change to add your case type to `SIMULATED_CASE_TYPES` in the target
   `cnp-flux-config` environment.
2. Let it run (the job is a Kubernetes `CronJob`, default schedule `0 22 * * *` — 22:00
   UTC nightly) and review the logs to confirm only the cases you expect are picked up.
3. Once confident, move the case type from `SIMULATED_CASE_TYPES` to `DELETE_CASE_TYPES`.

The Flux pod picks up changed env vars within ~15 minutes of the commit.

## 4. (Optional) Add suspend / override caseworker events

If business rules require holding a case (legal hold, ongoing dispute) or bringing
deletion forward, add a case event whose `AboutToSubmit` sets `TTL.Suspended = Yes` or
`TTL.OverrideTTL`. Remember the guard applies to both.

## What the disposer deletes

For each qualifying case (and only if every linked case also qualifies — all-or-none),
`RemoteDisposeService` removes the case across the estate, not just the CCD row:

- Elasticsearch index entry
- Documents in CDAM / document store
- Role assignments in AM (`am-role-assignment-service`)
- WA tasks (optional; off by default)
- Hearing recordings (`em-hrs-api`)
- Case events, case-event significant items, case-link rows
- The `case_data` row itself
- A Log & Audit notification

A per-run cap (`CCD_DISPOSER_REQUEST_LIMIT`, default 1000) and a wall-clock `cut-off-time`
bound how much one run does.

## Linked cases

A case is only deleted if all cases linked to it (via the `case_link` table, traversed
recursively) are *also* expired **and** in the same deletion list. If a non-expired case —
or one whose type isn't registered for deletion — links to your case, neither is deleted.
Keep this in mind when a case type links to long-lived cases.

## Decentralised services

For [decentralised services](../explanation/decentralisation.md) the authoritative case
data lives in the service's own database; CCD holds only a pointer row. CCD remains the
**TTL authority** — TTL changes still flow through CCD's event pipeline, the guard still
applies, and `resolvedTTL` is still computed by CCD and returned in the
`DecentralisedCaseEvent`. The disposer purges the **pointer row and CCD-owned artefacts**
only — it sends **no delete callback** to your service, and the `/ccd-persistence`
contract has no DELETE endpoint.

You are therefore responsible for cleaning up your own store. The approved pattern is a
**pull-based garbage-collection cron** on your service:

1. Periodically query your local store for rows where your copy of `resolved_ttl < today`.
2. For each, call CCD's GET-case API as a system user.
3. **404** → the pointer has been disposed → delete the local data.
4. **200** → still live (TTL extended, or disposal hasn't run yet) → leave it, re-check
   next cycle.

Persist CCD's `resolved_ttl` exactly as supplied and echo it back unchanged on subsequent
events. See [Retain-and-dispose for decentralised cases](../explanation/decentralisation.md#retain-and-dispose-for-decentralised-cases)
and the [`resolvedTTL` handling](../reference/decentralised-callbacks.md#resolvedttl-handling)
reference for the full responsibility split.

## Verify

- After adding the field and an increment event, fire the event locally
  ([cftlib](debug-with-cftlib.md)) and confirm the case's `resolved_ttl` is populated
  (inspect via the data-store DB or the case-data API).
- In a non-prod environment, register the case type under `SIMULATED_CASE_TYPES` and
  confirm the disposer log lists the expected cases without deleting them.

## Related

- [Data types — TTL](../explanation/data-types.md#ttl-time-to-live) — field model
- [Field types reference](../reference/field-types.md) — TTL entry
- [JSON definition format](../reference/json-definition-format.md) — `TTLIncrement` column
- [Config-generator API](../reference/config-generator-api.md) — `ttlIncrement(Integer days)`
- [Decentralisation](../explanation/decentralisation.md) — decentralised retention
