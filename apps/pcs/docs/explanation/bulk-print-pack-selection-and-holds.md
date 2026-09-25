---
title: Bulk Print Pack Selection and Holds
topic: bulk-print-pack-selection
diataxis: explanation
product: pcs
audience: both
sources:
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/task/BulkPrintScheduledTask.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/repository/ClaimActivityLogRepository.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/service/bulkprint/ClaimPackSelector.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/service/bulkprint/DefencePackSelector.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/service/bulkprint/PackSkipRules.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/service/caseworker/manageparty/AddPartyService.java
  - pcs-api:src/main/java/uk/gov/hmcts/reform/pcs/ccd/service/CaseIssueService.java
  - pcs-api:src/main/resources/application.yaml
---
# Bulk Print Pack Selection and Holds

The nightly bulk-print sweep (`BulkPrintScheduledTask`, a db-scheduler `RecurringTask`) works in two independent stages that are easy to conflate: a case-level **discovery** query decides which cases to look at, and a set of per-pack **selectors** (`ClaimPackSelector`, `DefencePackSelector`, `GenAppPackSelector`) decide what to actually send for each case. Only the selectors check whether a document has already been sent — the discovery query does not.

**Discovery has no upper bound in production.** The discovery query asks "has this case ever logged a `DOCUMENTS_CREATED`/`SUCCESS` row in `claim_activity_log`", with no filter for cases that are already fully sent. A time-bounded `lookbackHours` cutoff exists, but it's lower-environments-only — production always takes the unbounded branch, because a case's only `DOCUMENTS_CREATED` row can predate a general application filed months later, so a fixed lookback window would silently drop that case's later packs. The candidate list therefore keeps every case that has ever generated a document, not just the ones with outstanding work. This isn't a correctness problem — each selector independently re-derives what's still outstanding from `PACK_SENT` rows and correctly produces nothing for a finished case — but it means the sweep's per-night workload scales with total case history rather than with outstanding work.

**Pack holds (`PackSkipRules`) are recomputed fresh every sweep from ordinary business columns, with no separate "held" state stored anywhere.** Behind the `RELEASE_1_DOT_3` flag, the claim, defence, and gen-app packs can each be held for translation (Welsh language) or, for the claim and defence packs, for an expected general application or an outstanding help-with-fees reference on a counterclaim. There are two different kinds of hold signal underneath this, with very different lifecycles: a `case_flag`/`case_party_flag` row's `status` (the Welsh Communications flag) is released the normal way — a caseworker deactivates it via "Manage Case Flags" — but `claim.language_used`, `claim.gen_app_expected`, and the equivalent counterclaim/response/gen-app language and HWF columns are written once at submission and never updated by any other code path. Once one of those columns puts a pack on hold, only the flag-based half of the same `OR` condition can still change; the column itself has no release mechanism today.

**A defendant added to a case after issue never gets an access code.** `CaseIssueService` schedules access-code generation for every defendant at issue time, but the "Add Litigation Party" event (`AddPartyService.addParty`) only creates the party — it never schedules that same task. Since `ClaimPackSelector` withholds a defendant's claim pack until their access-code document exists, a defendant added after the case was issued has their claim pack held indefinitely, with nothing to ever unblock it.
