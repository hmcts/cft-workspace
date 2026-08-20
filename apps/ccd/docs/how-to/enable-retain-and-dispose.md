---
topic: retain-and-dispose
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/TTL.java@f87e5cbc49e4bd8c9448a8d5752e805c69d16ecf
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/EventPayload.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/DecentralisedConfigBuilder.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/Submit.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedeletion/TimeToLiveService.java@0afa06a9ffaa5094e0e715f414a0a885479696a9
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/CreateCaseEventService.java
  - ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/service/DecentralisedCreateCaseEventService.java
  - ccd-data-store-api:src/main/resources/application.properties
  - ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/data/CaseDataRepository.java
  - ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/parameter/DefaultParameterResolver.java
  - ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/service/remote/RemoteDisposeService.java
  - ccd-case-disposer:src/main/resources/application.yaml
  - ccd-case-disposer:charts/ccd-case-disposer/values.yaml@16ec1edc6922
status: reviewed
last_reviewed: 2026-07-01T12:47:00Z
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
sources_sha:
  ? "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/TTL.java@f87e5cbc49e4bd8c9448a8d5752e805c69d16ecf"
  : "f87e5cbc49e4bd8c9448a8d5752e805c69d16ecf"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/Event.java": "ac7903028377c2d50c8f1db55c4150eae2fa7414"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/EventPayload.java": "38ed5f63d1bd4cf8871e1dd9c7d677e425a240b7"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/DecentralisedConfigBuilder.java": "38ed5f63d1bd4cf8871e1dd9c7d677e425a240b7"
  "ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/api/callback/Submit.java": "d975f9829c1df4a0856e56c222d5137638d92f82"
  ? "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/casedeletion/TimeToLiveService.java@0afa06a9ffaa5094e0e715f414a0a885479696a9"
  : "0afa06a9ffaa5094e0e715f414a0a885479696a9"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/domain/service/createevent/CreateCaseEventService.java": "e3fca30b92506584a590ae203811d60202129d2d"
  "ccd-data-store-api:src/main/java/uk/gov/hmcts/ccd/decentralised/service/DecentralisedCreateCaseEventService.java": "e492e2aceaf88592e102b0363fddaa50ca4fc278"
  "ccd-data-store-api:src/main/resources/application.properties": "5daf60c31eeb61da276722c2639fa50d279a26a8"
  "ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/data/CaseDataRepository.java": "0fe304c9f7bd495b893bb01fb6a93e28c6776056"
  "ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/parameter/DefaultParameterResolver.java": "0fe304c9f7bd495b893bb01fb6a93e28c6776056"
  "ccd-case-disposer:src/main/java/uk/gov/hmcts/reform/ccd/service/remote/RemoteDisposeService.java": "08a9fb204ae66ce4de6d0590cf3d781b4fa89186"
  "ccd-case-disposer:src/main/resources/application.yaml": "3047d9abd2fc3e02c64ef0a8479ca265342b1c3a"
  "ccd-case-disposer:charts/ccd-case-disposer/values.yaml@16ec1edc6922": "16ec1edc692209cbd09216a28cb583b7b6d5687d"
---

# Enable Retain and Dispose

Retain and Dispose is CCD's case-retention feature: a `TTL` (time-to-live) field on
each case records when it may be deleted, and a separately-deployed batch job —
`ccd-case-disposer` — permanently removes cases (and their associated artefacts) once
that date passes. This page covers how a service team switches it on for a case type.

## TL;DR

- Add the platform-defined **`TTL`** complex field to your case type — by name, without
  redefining its sub-fields.
- To schedule deletion, set the field's **`SystemTTL`** to the date you want the case gone.
  CCD stores that as the case's `resolved_ttl`; the disposer deletes on/after it. No
  `TTLIncrement` needed.
- **`TTLIncrement`** on an event is an *optional* convenience for auto-extending retention
  on activity (`SystemTTL = today + increment`) — not a requirement for using the feature.
- Get your case type added to the disposer's **`DELETE_CASE_TYPES`** Flux env var — until
  this is done, *nothing is ever deleted*, regardless of TTL values. Roll out via
  **`SIMULATED_CASE_TYPES`** first.
- The **`TTLGuard`** (default 365 days) only constrains changes to **`Suspended`** and
  **`OverrideTTL`** — setting `SystemTTL` is never guarded, so use it for near-term deletion.
- **Decentralised services** set `SystemTTL` in their event handler and must additionally
  run their own garbage-collection cron — the disposer purges only CCD-owned data. See
  [Decentralised services](#decentralised-services).

## Prerequisites

- A case type wired via `CCDConfig<CaseData, State, UserRole>` (SDK) or a JSON/Excel
  definition.
- A decision on when cases should be deleted — either a fixed retention date/period you set
  as `SystemTTL`, or (optionally) the business events that should extend retention.
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

## 2. Set the deletion date

The only sub-field you normally set is **`SystemTTL`** — the date the case becomes eligible
for deletion. CCD resolves the effective date (`TimeToLiveService.getResolvedTTL`) as:

| Case state | `resolved_ttl` (what the disposer reads) |
|---|---|
| Not suspended | `OverrideTTL` if set, otherwise `SystemTTL` |
| `Suspended = Yes` | `null` — never deleted |

So "delete this case on date X" means: set `SystemTTL = X`, leave `OverrideTTL` unset, keep
`Suspended = No`. You do **not** need `TTLIncrement` for this.

### Decentralised services (set it in your handler)

The case data is owned by your service, so you set the field in the event handler and CCD
computes `resolved_ttl` from the value you return. With the field declared on your case
model (step 1), set it in a `start`/`submit` handler:

```java
private PCSCase start(EventPayload<PCSCase, State> payload) {
    var caseData = payload.caseData();

    caseData.setRetainAndDisposeTimeToLive(
        TTL.builder()
           .systemTTL(LocalDate.now().plusYears(6))  // delete 6 years from now
           .suspended(YesOrNo.NO)
           .build()
    );

    return caseData;   // returned data is persisted; CCD reads TTL from it
}
```

`EventPayload.caseData()` gives you the current case data; the object you return is
persisted, and CCD reads the TTL field from it to compute `resolved_ttl` on its pointer row
(`DecentralisedCreateCaseEventService` sends it as `DecentralisedCaseEvent.resolvedTtl`). To
reschedule, set a new `SystemTTL` on a later event; to hold indefinitely, set
`.suspended(YesOrNo.YES)`.

> **Not yet demonstrated in a live decentralised service.** As of writing no decentralised
> service (including PCS) sets TTL from a handler — the real TTL-setting examples in the
> estate are all centralised. The mechanics are verified against data-store source, but
> confirm `resolved_ttl` lands on the pointer in a test environment before relying on it.

### Centralised services

For a centralised case type the TTL field lives in CCD's own data. You **cannot** set it
from an `AboutToSubmit` callback — CCD rejects any callback that changes the TTL field (see
[the guard](#the-ttl-guard)). Set it either by making the field writable on the event
(`CaseEventToFields`) so the submitted data carries the value, or with `TTLIncrement` (next
section) for the common "extend on activity" case.

## 3. (Optional) Auto-extend retention with `TTLIncrement`

If you want each significant event to push the deletion date forward automatically — "keep
this case for 90 days after the last activity" — set `TTLIncrement` (days) on the event. On
submit CCD sets `SystemTTL = today + TTLIncrement`. This is a convenience layer on top of
step 2, not a requirement.

**SDK** — chain `.ttlIncrement(days)` on the event builder (`Event.java`):

```java
configBuilder.event("submitApplication")
    .forStateTransition(Draft, Submitted)
    .name("Submit application")
    .ttlIncrement(90)        // retain for 90 days from submission
    .grant(CREATE_READ_UPDATE, CASE_WORKER);
```

**JSON** — set the `TTLIncrement` column (integer days) on the `CaseEvent` tab.

An event with no `TTLIncrement` leaves the TTL field untouched
(`updateCaseDetailsWithTTL` is a no-op without one), so mixing increment events with
events/handlers that set `SystemTTL` directly is fine — only increment-configured events
overwrite it.

### The TTL guard

`TimeToLiveService` enforces `ttl.guard` (env `TTL_GUARD`, **default 365 days**, in
`ccd-data-store-api`'s `application.properties`). The guard **only** applies to changes in
**`Suspended`** or **`OverrideTTL`**: if either changes such that the resolved deletion date
would be sooner than `today + TTLGuard`, the event is **rejected**. Setting **`SystemTTL`**
is *not* guarded — which is why it's the field to use for near-term deletion. CCD also
rejects any callback (`AboutToStart`, `MidEvent`, `AboutToSubmit`) that alters TTL
sub-field values.

## 4. Register the case type with the disposer

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

## 5. Suspend, reschedule or cancel a scheduled deletion

- **Reschedule** — set a new `SystemTTL` on a later event (no guard).
- **Hold indefinitely** (legal hold, ongoing dispute) — set `Suspended = Yes`; `resolved_ttl`
  becomes null and the case is never picked up. Resume by setting `Suspended = No`, but the
  guard then applies — the resulting deletion date must be at least `TTLGuard` days out.
- **`OverrideTTL`** — a caseworker override that beats `SystemTTL`. Also guarded, so it
  can't bring deletion inside the guard window; prefer `SystemTTL` for near-term dates.

In a decentralised service these are all just field writes in your event handler, exactly
as in [step 2](#decentralised-services-set-it-in-your-handler). In a centralised service
they come from the submitted event data (a callback cannot change TTL).

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

## Decentralised services: cleaning up your own data

Setting the TTL in a decentralised service is covered in
[step 2](#decentralised-services-set-it-in-your-handler). This section is about the *other*
half — what happens at disposal time.

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

- Run the event that sets `SystemTTL` locally ([cftlib](debug-with-cftlib.md)) and confirm
  the case's `resolved_ttl` column matches the date you set (inspect via the data-store DB
  or the case-data API). For a decentralised case, check it landed on the CCD pointer row,
  not just in your own store.
- In a non-prod environment, register the case type under `SIMULATED_CASE_TYPES` and
  confirm the disposer log lists the expected cases without deleting them.

## Related

- [Data types — TTL](../explanation/data-types.md#ttl-time-to-live) — field model
- [Field types reference](../reference/field-types.md) — TTL entry
- [JSON definition format](../reference/json-definition-format.md) — `TTLIncrement` column
- [Config-generator API](../reference/config-generator-api.md) — `ttlIncrement(Integer days)`
- [Decentralisation](../explanation/decentralisation.md) — decentralised retention
