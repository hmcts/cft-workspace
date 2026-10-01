---
title: Decentralised persistence and concurrent updates
topic: concurrent-updates
diataxis: explanation
product: et
audience: service-team
status: drafted
last_reviewed: 2026-09-30
sources:
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/CaseDataRepository.java
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/json/JsonBackedCCDConfig.java
  - et-ccd-callbacks:src/main/java/uk/gov/hmcts/ethos/replacement/docmosis/config/EtJsonCcdConfig.java
  - et-ccd-callbacks:src/main/java/uk/gov/hmcts/ethos/replacement/docmosis/domain/notifications/UpdateNotificationStateEvent.java
  - et-ccd-callbacks:src/main/java/uk/gov/hmcts/ethos/replacement/docmosis/domain/notifications/respondent/ViewAllNotificationsEvent.java
---

# Decentralised persistence and concurrent updates

ET case types are **decentralised** to et-cos. The prod rejection logs confirm this for `ET_EnglandWales` and `ET_Scotland`, and the cftlib config in `build.gradle` maps all seven ET case types, including the `_Multiple`, `_Listings` and `ET_Admin` types, to et-cos. CCD data-store still runs the event lifecycle, but the case row is stored in et-cos's own Postgres through the CCD SDK's `decentralised-runtime`. That's why concurrency rejections for ET are logged by et-cos rather than by data-store.

## How ET definitions reach the SDK

Definitions are still authored as JSON under `et-ccd-callbacks/ccd-definitions/`. At runtime, `EtJsonCcdConfig` loads them through the SDK's `JsonBackedCCDConfig`. Any `CCDConfig` bean can then replace an individual event with a **decentralised event**: a Java submit handler that runs in place of the default "write the whole case blob" behaviour.

JSON callbacks (`CallBackURLAboutToSubmitEvent`, `CallBackURLSubmittedEvent`) are also run in-process by the SDK. The Jenkins build dumps the merged result with `dumpCCDDefinitions`, so a definition change and the Java handler that replaces it always ship in the same build.

## Optimistic locking

Every event starts from a case `version`. On submit, `CaseDataRepository.upsertCase` updates the row only `where case_data.version = <submitted version>`. If another event has changed the case in between, no row matches, the event is rejected (the user sees a 409 / "unable to save your work"), and the SDK logs:

```
Rejecting event <submitted> for case <ref> due to concurrent update:
  submittedVersion=<n>, conflictingEvent=<blocker>, conflictingEventRevision=<rev>
```

`conflictingEvent` is the first event saved after the submitted version, meaning the one that won the race.

The detail that makes these conflicts fixable: **the version only increases when something actually changes**. That means the blob (when the handler returns data), the state, the TTL, or the security classification. A decentralised submit that returns no data (`SubmitResponse.defaultResponse()`) leaves `data` and `version` untouched. Such an event:

- **never blocks** other events, because it doesn't bump the version;
- **is never blocked**, because the version check still passes even when the submitted version is stale.

## Patterns for removing a conflict hotspot

| Situation | Pattern | Examples |
|---|---|---|
| The event is read-only: it renders a view in `aboutToStart` and writes nothing that matters | Replace it with a no-op decentralised event | `viewAllNotifications` ([#3494](https://github.com/hmcts/et-ccd-callbacks/pull/3494)) |
| The event records something small and independent (a status, a "viewed" marker) | Move that data into its own table and have the decentralised submit write the table instead of the blob. Merge the table back in when the case is read. | `hub_link_status` ([#3450](https://github.com/hmcts/et-ccd-callbacks/pull/3450)), async stitching into `digital_case_file` ([#3492](https://github.com/hmcts/et-ccd-callbacks/pull/3492)), `UPDATE_NOTIFICATION_STATE` into `notification_view` ([#3502](https://github.com/hmcts/et-ccd-callbacks/pull/3502) then [#3498](https://github.com/hmcts/et-ccd-callbacks/pull/3498)) |
| The event conflicts only with **itself** on the same case | Usually a duplicate request (double click, retry). Stop the duplicate at source; the rejection itself is correct. | `SUBMIT_CASE_DRAFT` (duplicate ET1 submissions from et-sya-frontend) |
| Two real edits to case data race each other | No cheap fix. The data has to move out of the blob, or the race has to be accepted. | `createReferral` vs `pseRespondentRespondToTribunal` |

### Staging a move into a table

When data moves from the blob into a table, ship the **reader first**: every pod must merge the table into the case it serves before any pod stops writing the blob. Otherwise an old pod shows stale blob data and can write it back into case history on its next event.

#3502 (reader, adds `V023__CreateNotificationView`) had to run on both prod clusters before #3498 (writer) merged. The writer PR also bumps `force_user_permissions_trigger` in `infrastructure/database-flexi.tf`, so that the DB reader groups get `SELECT` on the new table.

## Gotchas

- **Don't drop a JSON callback.** If the JSON definition for an event has an `aboutToSubmit` or `submitted` URL and a decentralised replacement doesn't, `JsonBackedCCDConfig` fails at startup with `Replacement for event '<id>' … drops callbacks`. Remove the URL from every JSON definition that declares it (England/Wales **and** Scotland) in the same change, along with the now-unused controller endpoint.
- **Bean names.** Claimant and respondent variants of an event often share a class name in different packages (`…notifications.respondent.ViewAllNotificationsEvent`). Two `@Component`s with the same simple name clash, so give the second a distinct name (for example `ClaimantViewAllNotificationsEvent`).
- **Unique `ethosCaseReference` in SDK integration tests.** `@CcdSdkTest` classes share one database, and ET has a unique index on `ethosCaseReference` per case type. Two test classes that seed the same reference fail with `DuplicateKeyException` on `uidx_case_data_ethoscasereference`, but only when they run together.

## Related

- [Find and fix concurrent-update conflict hotspots](../how-to/find-and-fix-concurrent-update-conflicts.md)
- [The citizen API lives in et-cos](citizen-api-in-et-cos.md)
