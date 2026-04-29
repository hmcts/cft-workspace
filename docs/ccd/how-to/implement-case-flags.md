---
topic: case-flags
audience: both
sources:
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/Flags.java
  - ccd-config-generator:sdk/ccd-config-generator/src/main/java/uk/gov/hmcts/ccd/sdk/type/FlagDetail.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/dto/ccd/CaseData.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/models/caseflags/AllPartyFlags.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/caseflags/CaseFlagsController.java
  - service-prl:prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/services/caseflags/CaseFlagsWaService.java
examples_extracted_from:
  - apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/caseflags/CaseFlagsController.java
status: reviewed
last_reviewed: "2026-04-29T00:00:00Z"
---

# Implement Case Flags

## TL;DR

- Case Flags are CCD's built-in mechanism for attaching named flags (e.g. reasonable adjustments, language needs, vulnerability markers) to a case or to individual parties.
- The core complex type is `Flags` (annotated `@ComplexType(name="Flags", generate=false)`), containing a collection of `FlagDetail` items each with a `status` field.
- Add a `Flags caseFlags` field to your case-data class for case-level flags; add a holder class (like `AllPartyFlags`) with one `Flags` field per party for party-level flags.
- A management event wired to `/caseflags/*` callbacks drives the flag lifecycle: `about-to-start` collects `"Requested"` flags, `about-to-submit` validates and updates them, `submitted` closes any related WA tasks.
- XUI renders flag history automatically from the CCD event audit trail — no extra tab configuration is needed for history.
- Flag status `"Requested"` is a magic string (not an enum) — spell it exactly.

## Prerequisites

- `ccd-config-generator` SDK on the classpath (provides `uk.gov.hmcts.ccd.sdk.type.Flags` and `FlagDetail`).
- A `CCDConfig<T,S,R>` implementation and a case-data class `T`.
- If integrating with Work Allocation: `wa-task-management-api` reachable and `task-management.api.url` configured.

## Step 1 — Add the `Flags` field for case-level flags

Add a `Flags` field directly to your case-data class. PRL uses the field name `caseFlags`
(`CaseData.java:714`):

```java
import uk.gov.hmcts.ccd.sdk.type.Flags;

// inside your CaseData class
@CCD(label = "Case Flags")
private Flags caseFlags;
```

The `Flags` type is a pre-built CCD complex type (`Flags.java` annotated
`@ComplexType(name="Flags", generate=false)`). You do **not** need to define it in your own
spreadsheet — the definition is built in.

## Step 2 — Add party-level flags

Create a holder class with one `Flags` field per party. PRL calls this `AllPartyFlags`
(`AllPartyFlags.java`):

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AllPartyFlags {

    @CCD(label = "Applicant 1 flags")
    private Flags applicant1Flags;

    @CCD(label = "Respondent 1 flags")
    private Flags respondent1Flags;

    // add further parties as needed
}
```

Then reference the holder from your case-data class (`CaseData.java:786`):

```java
@CCD(label = "All party flags")
private AllPartyFlags allPartyFlags;
```

Field names inside `AllPartyFlags` are iterated at runtime via Java reflection
(`CaseFlagsWaService.java:115-117`). Rename fields with care — the names must stay
consistent with any callback service code that reads them.

## Step 3 — Define the flag management event

Register a CCD event that covers the flag review workflow. The event needs three callback
hooks, all handled by your controller:

```java
builder.event("REVIEW_FLAGS")
    .name("Review flags")
    .aboutToStartCallback(this::reviewFlagsAboutToStart)   // collect Requested flags
    .aboutToSubmitCallback(this::reviewFlagsAboutToSubmit) // validate & update
    .submittedCallback(this::reviewFlagsSubmitted)         // close WA tasks
    .fields()
        .page("flagReview")
        .field(CaseData::getAllPartyFlags)
        .field(CaseData::getCaseFlags);
```

## Step 4 — Implement the callback handlers

### `about-to-start`

Scan all `Flags` fields for items whose `FlagDetail.status` equals `"Requested"` and
populate a working wrapper so the caseworker sees only open items. PRL collects these into
`ReviewRaRequestWrapper.selectedFlags` (`CaseFlagsWaService.java:105-142`).

### `about-to-submit`

Validate that the most recently modified flag is no longer `"Requested"`. Update the flag
in place on the case-data object and return the updated data
(`CaseFlagsController.java:125-152`).

### `submitted`

If **all** flags are resolved (none remain `"Requested"`), fire a WA task-close event.
PRL fires `CaseEvent.CLOSE_REVIEW_RA_REQUEST_TASK` (`CaseFlagsWaService.java:51-75`).

### Work Allocation task creation (optional)

To trigger a WA review task when a new flag is raised, publish an internal Spring event
from a separate `setup-wa-task` callback endpoint
(`CaseFlagsWaService.java:43-48`). Gate further closes on `isCaseFlagsTaskCreated == YES`
(`CaseFlagsWaService.java:60`).

## Step 5 — Wire up the controller endpoint

Map your callbacks to URL paths matching the CCD event definition. PRL uses
`/caseflags/about-to-start`, `/caseflags/about-to-submit`, and `/caseflags/submitted`
(`CaseFlagsController.java:109,125,154`).

Secure each endpoint with both JWT (`Authorization`) and S2S token checks following the
`AbstractCallbackController` pattern (`AbstractCallbackController.java`).

## Step 6 — Configure the CCD event to call the endpoints

In your `CCDConfig.configure()`, point the event callbacks at your service's base URL.
If using the SDK's `setCallbackHost`, this happens automatically at generation time
(`ConfigBuilder.java:53`).

If registering callbacks explicitly in the CCD definition spreadsheet, set:

| Column | Value |
|---|---|
| `AboutToStartURL` | `https://<service>/caseflags/about-to-start` |
| `AboutToSubmitURL` | `https://<service>/caseflags/about-to-submit` |
| `SubmittedURL` | `https://<service>/caseflags/submitted` |

## What XUI shows for flag history

XUI reads the CCD event audit trail to display flag history. Each time a flag management
event completes, CCD appends an audit entry. XUI renders these entries in the case history
tab automatically — no additional tab or field configuration is needed.

The `FlagDetail` items themselves retain their individual history because the `Flags`
collection uses `ListValue` wrappers (each item has a stable `id`). XUI surfaces the
before/after diff of each `FlagDetail` per event entry.

## Gotchas

- **`"Requested"` is a plain string**, not an enum — a typo silently breaks the whole
  flag lifecycle (`CaseFlagsWaService.java:38`).
- **Reflection on `AllPartyFlags`**: field names like `applicant1Flags` are used as
  strings at runtime (`CaseFlagsWaService.java:115`). Rename fields only with a
  coordinated code change.
- **`@ComplexType(name="Flags", generate=false)`** means the SDK does not emit a
  definition spreadsheet row for `Flags` — it relies on the type being pre-loaded in CCD.
  Do not attempt to redefine it.
- **`isCaseFlagsTaskCreated`** must be set to `YesOrNo.YES` before the `submitted`
  handler will attempt to close a WA task (`CaseFlagsWaService.java:60`).
- **Deep-copy flags before mutating** — PRL uses a Jackson round-trip to avoid mutating
  the originals (`CaseFlagsWaService.java:242-248`).

## Verify

1. Trigger the flag management event on a test case via XUI or the CCD data-store API.
   Confirm the event appears in the case history tab with a before/after diff showing the
   flag status change.
2. Check that a flag left in `"Requested"` status causes `about-to-submit` to return a
   validation error and block submission.

## Example

### config-generator form — `CaseFlagsController` callback handlers (prl)

```java
// from apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/caseflags/CaseFlagsController.java
@RestController
@RequestMapping("/caseflags")
public class CaseFlagsController extends AbstractCallbackController {
    private static final String REQUESTED = "Requested";

    // ...

    @PostMapping("/about-to-start")
    public AboutToStartOrSubmitCallbackResponse handleAboutToStart(
            @RequestHeader("Authorization") String authorisation,
            @RequestBody CallbackRequest callbackRequest) {
        CaseData caseData = CaseUtils.getCaseData(callbackRequest.getCaseDetails(), objectMapper);
        caseFlagsWaService.setSelectedFlags(caseData);
        Map<String, Object> caseDataMap = callbackRequest.getCaseDetails().getData();
        caseDataMap.put(WA_ALL_SELECTED_FLAGS, caseData.getReviewRaRequestWrapper().getSelectedFlags());
        return AboutToStartOrSubmitCallbackResponse.builder().data(caseDataMap).build();
    }

    @PostMapping(path = "/about-to-submit", consumes = APPLICATION_JSON, produces = APPLICATION_JSON)
    public AboutToStartOrSubmitCallbackResponse handleAboutToSubmit(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorisation,
            @RequestHeader(PrlAppsConstants.SERVICE_AUTHORIZATION_HEADER) String s2sToken,
            @RequestBody CallbackRequest callbackRequest) {
        CaseData caseData = CaseUtils.getCaseData(callbackRequest.getCaseDetails(), objectMapper);
        Element<FlagDetail> mostRecentlyModified = caseFlagsWaService.validateAllFlags(caseData);
        List<String> errors = new ArrayList<>();
        Map<String, Object> caseDataMap = callbackRequest.getCaseDetails().getData();
        if (REQUESTED.equals(mostRecentlyModified.getValue().getStatus())) {
            errors.add("Please select status other than Requested");
        } else {
            caseFlagsWaService.searchAndUpdateCaseFlags(caseData, caseDataMap, mostRecentlyModified);
        }
        return AboutToStartOrSubmitCallbackResponse.builder().errors(errors).data(caseDataMap).build();
    }

    @PostMapping("/submitted")
    public ResponseEntity<SubmittedCallbackResponse> handleSubmitted(
            @RequestHeader("Authorization") String authorisation,
            @RequestBody CallbackRequest callbackRequest) {
        CaseData caseData = CaseUtils.getCaseData(callbackRequest.getCaseDetails(), objectMapper);
        caseFlagsWaService.checkAllRequestedFlagsAndCloseTask(caseData);
        return ok(SubmittedCallbackResponse.builder().build());
    }
}
```

<!-- source: apps/prl/prl-cos-api/src/main/java/uk/gov/hmcts/reform/prl/controllers/caseflags/CaseFlagsController.java:44-161 -->

## See also

- [Case flags](../explanation/case-flags.md) — conceptual overview of the flags model and lifecycle
- [Implement reasonable adjustments](implement-reasonable-adjustments.md) — extending case flags for reasonable adjustment workflows
