---
title: Find and fix concurrent-update conflict hotspots
topic: concurrent-updates
diataxis: how-to
product: et
audience: service-team
status: drafted
last_reviewed: 2026-09-30
sources:
  - ccd-config-generator:sdk/decentralised-runtime/src/main/java/uk/gov/hmcts/ccd/sdk/impl/CaseDataRepository.java
---

# Find and fix concurrent-update conflict hotspots

Use this to find which ET events most often cause "unable to save your work" (409) rejections, and to decide which fix pattern applies. For background, see [Decentralised persistence and concurrent updates](../explanation/decentralised-persistence-and-concurrent-updates.md).

## 1. Rank the blockers

Run this against the `et-prod` App Insights component (resource group `et-prod`, subscription `DCD-CFTAPPS-PROD`, app id `da230f13-2e4d-45d7-b366-b47ba649b6f0`):

```kusto
traces
| where timestamp > ago(7d)
| where message has "due to concurrent update"
| extend LocalTime = datetime_utc_to_local(timestamp, "Europe/London")
| where hourofday(LocalTime) between (7 .. 18)   // working hours, UK time
| parse message with "Rejecting event " SubmittedEvent " for case " CaseRef " due to concurrent update: submittedVersion=" SubmittedVersion ", conflictingEvent=" Blocker ", conflictingEventRevision=" ConflictingRevision
| where isnotempty(Blocker)
| summarize Count = count() by Blocker
| order by Count desc
| as Blockers
| union (Blockers | summarize Count = sum(Count) | extend Blocker = "Total blockers")
| order by Count desc
```

From the CLI, **always pass `--offset`**. Without it, `az monitor app-insights query` silently limits the query to the last hour, whatever `ago()` says:

```bash
az monitor app-insights query --app da230f13-2e4d-45d7-b366-b47ba649b6f0 --offset 7d --analytics-query "$(cat conflicts.kql)" -o table
```

## 2. Check whether a fix has already landed

Break the top blockers down by day. A fix shows up as a clear step down after its deploy date:

```kusto
traces
| where timestamp > ago(8d)
| where message has "due to concurrent update"
| parse message with * "conflictingEvent=" Blocker ", conflictingEventRevision=" *
| summarize n = count() by Blocker, bin(timestamp, 1d)
| order by Blocker asc, timestamp asc
```

## 3. See what each blocker blocks

```kusto
traces
| where timestamp > ago(7d)
| where message has "due to concurrent update"
| parse message with "Rejecting event " SubmittedEvent " for case " CaseRef " due to concurrent update: submittedVersion=" * ", conflictingEvent=" Blocker ", conflictingEventRevision=" *
| where Blocker == "<event id>"
| summarize n = count(), cases = dcount(CaseRef) by SubmittedEvent
| order by n desc
```

- **The blocker only rejects itself** (`SubmittedEvent == Blocker`): look for duplicate requests. Join the rejections' `operation_Id` to `requests` to find the originating front-end route, and look at the gaps between repeated requests for the same case. Sub-second gaps suggest double navigation; gaps of a few seconds while a slow request is in flight suggest repeat clicks.
- **The blocker rejects other events**: read the blocker's definition and callbacks, then work through step 4.

## 4. Pick the pattern

1. **Does the event change anything that matters?** Some events only render a view in `aboutToStart` and clear it again in `aboutToSubmit`, for example `viewAllNotifications`. Replace these with a no-op decentralised event:

   ```java
   builder.decentralisedEvent(EVENT_ID, payload -> SubmitResponse.defaultResponse()).forAllStates();
   ```

2. **Does it write something small and independent?** For example a "viewed" marker or a link status. Move that data into its own table and write it from the decentralised submit. Ship the reader first and the writer second (see "Staging a move into a table" in the explanation page).
3. **Is it a real edit that races other real edits?** There's no cheap fix. Record it and move on unless it's a significant share of the total.

## 5. Implement it

- Add the `CCDConfig` bean next to its domain (for example `domain/notifications/...`), covering both `ET_EnglandWales` and `ET_Scotland`.
- If the JSON event declares `CallBackURLAboutToSubmitEvent` or `CallBackURLSubmittedEvent`, delete those URLs from **both** jurisdictions' JSON and remove the unused controller endpoint and its test. Otherwise startup fails with "drops callbacks".
- Add a `@CcdSdkTest` integration test, modelled on `ViewAllNotificationsEventIntegrationTest`, that asserts:
  - the raw blob and `blobVersion` are unchanged after submit;
  - a submit at a stale revision (`.atRevision(0)`) still succeeds.

  Use an `ethosCaseReference` that no other integration test uses.
- Run the tests:

  ```bash
  ./gradlew :integration --tests '<YourEvent>IntegrationTest'
  ```

## 6. Confirm in prod

After the deploy, rerun step 2. The blocker should drop to zero, or close to it.
