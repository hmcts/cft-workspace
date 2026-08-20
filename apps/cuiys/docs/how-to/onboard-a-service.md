---
title: Onboard a Service to CUIYS
topic: onboarding
diataxis: how-to
product: cuiys
audience: both
sources:
  - cui-ra:src/main/controllers/apiController.ts
  - cui-ra:src/main/controllers/dataController.ts
  - cui-ra:src/main/controllers/reviewController.ts
  - cui-ra:config/default.json
status: draft
confluence:
  - id: "1933858855"
    title: "CUIYS Onboarding Guide"
    last_modified: "2026-05-13T00:00:00Z"
    space: "CUIRA"
  - id: "1933858875"
    title: "CUIYS Onboarding - Context and Background"
    last_modified: "unknown"
    space: "CUIRA"
confluence_checked_at: "2026-08-20T00:00:00Z"
sources_sha:
  "cui-ra:src/main/controllers/apiController.ts": "3998070da7aa9dad78ae68c562f230e672300584"
  "cui-ra:src/main/controllers/dataController.ts": "3998070da7aa9dad78ae68c562f230e672300584"
  "cui-ra:src/main/controllers/reviewController.ts": "3998070da7aa9dad78ae68c562f230e672300584"
  "cui-ra:config/default.json": "324d85792ffb142ce54f9263e03634e7b324aae9"
---
# Onboard a Service to CUIYS

This is the service-team recipe for integrating a citizen UI with the CUIYS
microsite so citizens can request Reasonable Adjustments. For the concepts, read
the [CUIYS Overview](../explanation/overview.md) first; for the wire contract, keep
the [Payload API reference](../reference/payload-api.md) open while coding.

## Before you start

- [ ] Your service is **already on Case Flags v2.1** with RA flags defined in
      reference data. CUIYS reads/writes flags — it does not add them.
- [ ] Read [CUIYS Onboarding - Context and Background](https://tools.hmcts.net/confluence/spaces/CUIRA/pages/1933858875).
- [ ] Complete the **Service analysis template** (Excel; supplied by the Common
      Components Service Manager) — hint text, additional information, flag config.
- [ ] Your onboarding **Jira ticket + subtasks** exist (cloned from the template
      `CUIRA-304`), and the tracking Confluence page from the template.
- [ ] Your service's S2S microservice name is on the CUIYS allowlist
      (`S2S_ALLOWED_SERVICES`) — request this from the CUIYS team if not.

## 1. Add the "Your Support" entry point

On the **Case Overview** screen, add a menu item that takes the citizen to a new
*Your Support* screen. Show a status against it (e.g. `Optional`, changing to
`Submitted` once adjustments exist).

## 2. Build the "Your Support" interstitial

Create a service-owned page that:

- explains, in your service's context, what support can be requested;
- lets the citizen decide whether to continue;
- has a *Start now* button that triggers the CUIYS hand-off (step 3).

CUIYS supplies no content here — design it, put it through usability testing, and
provide English and Welsh versions.

## 3. Hand off to CUIYS

On *Start now*:

1. `POST /api/payload` to the CUIYS environment URL with:
   - headers `service-token` (S2S) and `idam-token` (the citizen's IDAM token);
   - body: `hmctsServiceId`, `callbackUrl` (containing a `:id` placeholder),
     `logoutUrl`, `masterFlagCode` (e.g. `RA0001`), `correlationId`,
     `existingFlags` (the party's current flags — include `partyName` and
     `roleOnCase` even when there are none), and optionally `language`.
2. On `201`, redirect the citizen's browser to the returned `url`.

See [Payload API → POST](../reference/payload-api.md#post-apipayload) for the full
schema and status codes. Note the success code is **`201`**, and the headers are
lowercase `service-token` / `idam-token`.

## 4. Build the callback route

CUIYS redirects the browser back to your `callbackUrl` with `:id` substituted.
This route must **not render UI**. Instead:

1. `GET /api/payload/:id` (header: `service-token`) to fetch the result.
2. Verify the returned `correlationId` belongs to the logged-in citizen.
3. If `action` is `cancel`, make no changes.
4. If `action` is `submit`:
   - if `flagsAsSupplied` is present, trigger the **manage flag** event first (it
     carries all originally-supplied flags with updated statuses);
   - if `replacementFlags` is present, trigger the **create flag** event *after*
     the manage-flag event.
5. Redirect the citizen to the next screen in your journey.

Handle the cancel path too — the citizen may click *Cancel* at any point, which
also returns them to `callbackUrl`.

## 5. Build the confirmation screen

The screen the citizen lands on after their flags are stored. It confirms what was
captured and has a *Continue to next step* button that moves them on through your
service's journey.

## 6. Supply CUIYS configuration (via Jira tickets)

Raise tickets to the CUIYS PET with the service-specific content. Send updated
versions post-go-live the same way.

| Configuration | What to supply | Template ticket |
|---|---|---|
| Generic service info | English + Welsh HTML block for the contact-details footer | `CUIRA-308` |
| Flag-specific info | JSON files with additional info per flag / flag category | `CUIRA-311` |
| Footer links | English + Welsh HTML for privacy policy and T&Cs | `CUIRA-312` |

## 7. Update supporting materials

- Update **training materials** to cover the new screens and flow.
- Review whether your **work allocation** configuration needs updating.

## Effort (high-level, from the CUIYS team)

**Onboarding service side:** Analysis/BA 2d (assuming flag config already in ref
data), Dev & Test 16d, ITHC 5d, Perf 5d — **~28 days**.

**CUIYS team side:** Dev ~10d for the first service (dropping to ~5d thereafter),
Testing 5d — **~15 days** for the first onboarding.

## See also

- [CUIYS Overview](../explanation/overview.md)
- [Payload API reference](../reference/payload-api.md)
- Postman collection: attached to the Confluence
  [Developer Integration Guide](https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1712514145)
