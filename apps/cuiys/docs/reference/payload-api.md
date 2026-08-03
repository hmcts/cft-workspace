---
title: CUIYS Payload API
topic: payload-api
diataxis: reference
product: cuiys
audience: both
sources:
  - cui-ra:src/main/constants/route.ts
  - cui-ra:src/main/routes.ts
  - cui-ra:src/main/controllers/apiController.ts
  - cui-ra:src/main/controllers/dataController.ts
  - cui-ra:src/main/controllers/reviewController.ts
  - cui-ra:src/main/schemas/InboundPayload.ts
  - cui-ra:src/main/interfaces/payload.ts
  - cui-ra:src/main/models/inboundPayload.ts
  - cui-ra:src/main/constants/headerParams.ts
  - cui-ra:src/main/constants/actions.ts
  - cui-ra:src/main/services/redis.ts
  - cui-ra:src/main/utilities/urlRoute.ts
  - cui-ra:config/default.json
status: draft
confluence:
  - id: "1680476343"
    title: "Payload Specification"
    space: "CUIRA"
  - id: "1712514145"
    title: "Developer Integration Guide"
    space: "CUIRA"
sources_sha:
  "cui-ra:src/main/constants/route.ts": "8733768f0ade2a82cd91e0d5ecddd9a0871a6bee"
  "cui-ra:src/main/routes.ts": "8733768f0ade2a82cd91e0d5ecddd9a0871a6bee"
  "cui-ra:src/main/controllers/apiController.ts": "3998070da7aa9dad78ae68c562f230e672300584"
  "cui-ra:src/main/controllers/dataController.ts": "3998070da7aa9dad78ae68c562f230e672300584"
  "cui-ra:src/main/controllers/reviewController.ts": "3998070da7aa9dad78ae68c562f230e672300584"
  "cui-ra:src/main/schemas/InboundPayload.ts": "3998070da7aa9dad78ae68c562f230e672300584"
  "cui-ra:src/main/interfaces/payload.ts": "3998070da7aa9dad78ae68c562f230e672300584"
  "cui-ra:src/main/models/inboundPayload.ts": "3998070da7aa9dad78ae68c562f230e672300584"
  "cui-ra:src/main/constants/headerParams.ts": "af8c0a719f3e5840a7add675da9c216802831467"
  "cui-ra:src/main/constants/actions.ts": "dab233536fe62820eec2723b3031c1f0cf9c8bcc"
  "cui-ra:src/main/services/redis.ts": "67093850ce8c0e3adbfbf688a00db340ac0fe75f"
  "cui-ra:src/main/utilities/urlRoute.ts": "661bd1051972ce9b8d23433fcbdaef1670170078"
  "cui-ra:config/default.json": "324d85792ffb142ce54f9263e03634e7b324aae9"
---
# CUIYS Payload API

The CUIYS microsite (`hmcts/cui-ra`, service name `cui_ra`) exposes exactly two
endpoints. An onboarding service `POST`s the flags it already holds and gets back
a one-time URL; it redirects the citizen's browser there; when the citizen
finishes, the microsite redirects the browser back to the service's `callbackUrl`
with an id the service `GET`s to retrieve the result.

> **Source of truth.** This page is reconciled against `cui-ra` source, not the
> Confluence [Payload Specification](https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1680476343).
> Where they diverge, the code wins — see [Corrections to the Confluence spec](#corrections-to-the-confluence-spec).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/payload` | Hand the microsite the flags already held, get a redirect URL back. |
| `GET`  | `/api/payload/:id` | Retrieve the citizen's completed / amended flags. |

Both live under `/api/*`, which is guarded by S2S service-token validation
(`routes.ts`, `constants/route.ts`).

## Authentication

Two lowercase headers — **not** `Authorization` / `ServiceAuthorization` bearer headers:

| Header | Value | Required on |
|---|---|---|
| `service-token` | S2S token from `rpe-service-auth-provider`. The calling microservice must be in the CUIYS allowlist (`prl_citizen_frontend`, `pcs_frontend`, extendable via `S2S_ALLOWED_SERVICES`). | `POST` **and** `GET` |
| `idam-token` | The citizen's IDAM token (used to look up their Case Flags reference data). | `POST` only |

`GET /api/payload/:id` requires only a valid `service-token`; it does not check
`idam-token` (`routes.ts`, `apiController.ts`).

## POST /api/payload

### Request body

Validated by the `InboundPayloadSchema` AJV schema (`schemas/InboundPayload.ts`);
`additionalProperties: false`, so unknown fields are rejected with `400`.

| Field | Required | Notes |
|---|---|---|
| `hmctsServiceId` | ✅ | Service id used to fetch the flag reference data. |
| `callbackUrl` | ✅ | URL the browser is redirected to on completion/cancel. Must contain a `:id` placeholder (see [Callback](#callback-and-redirect-flow)). Domain-whitelisted. |
| `logoutUrl` | ✅ | URL for the service's sign-out. Domain-whitelisted. |
| `masterFlagCode` | ✅ | Master flag id, e.g. `RA0001` for Reasonable Adjustments. |
| `correlationId` | ✅ | Opaque; echoed back unchanged in the GET response. |
| `existingFlags` | ✅ | The party's current flags. Required even when empty — must still carry `partyName` and `roleOnCase` so the microsite can render the party's name. See [Flag schema](#flag-schema). |
| `language` | ❌ | `en` or `cy`. **Optional** (defaults handled by the microsite). |

### Response

**`201 Created`** with:

```json
{ "url": "https://<cuiys-host>/dc/p/<uuid>" }
```

The service redirects the citizen's browser to this `url`. The path is
`/dc/p/:id` (`constants/route.ts`), **not** `/api/payload/:id`.

The posted payload is stored in Redis under the `<uuid>` with a **1-hour TTL**
(`services/redis.ts`, `EX: 3600`).

### Error responses

| Status | Meaning |
|---|---|
| `400` | Missing/invalid body, or unknown `hmctsServiceId` (no ref data). |
| `401` | Missing/invalid `idam-token`. |
| `403` | Missing/invalid `service-token` (S2S guard). |
| `503` | Downstream resource unavailable. |

## GET /api/payload/:id

`:id` is the uuid the microsite appended to the `callbackUrl`. Returns `200` with
the completed payload (`OutboundPayload`, `models/inboundPayload.ts`):

```json
{
  "action": "submit",
  "correlationId": "<echoed from POST>",
  "flagsAsSupplied": { "...": "..." },
  "replacementFlags": { "...": "..." }
}
```

| Field | Notes |
|---|---|
| `action` | `submit` or `cancel` (`constants/actions.ts`). On `cancel`, ignore the payload — make no changes. |
| `correlationId` | Echoed unchanged from the POST. The service **must** verify it belongs to the currently logged-in user. |
| `flagsAsSupplied` | Present when at least one supplied flag was cancelled in the microsite. Contains **all** originally-supplied flags with updated statuses. Apply via the **manage flag** event *before* any create-flag event. |
| `replacementFlags` | Present when at least one flag was added. Contains all supplied flags (updated for cancellations) plus new ones. Apply via the **create flag** event *after* any manage-flag event. |

The GET **does not delete** the record — it expires with its 1-hour TTL. It is
therefore idempotent within that window.

### Error responses

`400` (bad request), `401`, `403`, `404` (id not found / expired), `406`.

## Flag schema

The flag detail object (`interfaces/payload.ts` `PayloadFlagData`; runtime
validation in `schemas/InboundPayload.ts` `detailsSchema`):

| Field | Notes |
|---|---|
| `name`, `name_cy` | Flag name (English / Welsh). |
| `subTypeValue`, `subTypeValue_cy` | Selected sub-type value (max 80). |
| `subTypeKey` | Code for the selected sub-type. |
| `otherDescription`, `otherDescription_cy` | User-defined flag name (max 80). |
| `flagComment`, `flagComment_cy` | User comment (max 200 — enforced by the microsite for EXUI parity, not by CCD). |
| `flagUpdateComment` | Comment on approve/reject/change. |
| `dateTimeCreated`, `dateTimeModified` | ISO date-time. |
| `path` | Array of `{ id, name }` locating the flag in the flag tree. |
| `hearingRelevant` | `Yes` / `No`. |
| `flagCode` | Universally unique flag code. |
| `status` | Flag status. |
| `availableExternally` | `Yes` / `No` — settable/viewable by external parties. |

Container shape: `existingFlags` / `flagsAsSupplied` / `replacementFlags` each
carry `partyName`, `roleOnCase`, and `details[]`, where each detail is
`{ id, value: <flagDetail> }` (`interfaces/payload.ts`).

## Callback and redirect flow

1. Service `POST`s → gets `url` = `<host>/dc/p/<uuid>` → redirects browser there.
2. `GET /dc/p/:id` hydrates the session, deletes the inbound Redis key, then
   `301`-redirects into the journey (`/journey/flags/display/:id` when there are
   no existing flags, else `/home/overview`) — `dataController.ts`.
3. On **submit** the microsite stores an `OutboundPayload` under a fresh uuid and
   `301`-redirects the browser to `callbackUrl` with `:id` substituted. On
   **cancel** it does the same with a cancel payload and a `302`
   (`reviewController.ts`, `utilities/urlRoute.ts`).
4. The service's callback route retrieves the payload via `GET /api/payload/:id`
   and continues its own journey. This route should do no UI — it fetches, then
   redirects the user onward.

`callbackUrl` **must** contain a `:id` token; `UrlRoute` replaces it with the
uuid. Examples: `service.com/callback/:id`, `service.com/sub/:id/callback`.

`callbackUrl` and `logoutUrl` are whitelisted to `.service.gov.uk`,
`.platform.hmcts.net`, and `localhost` (`config/default.json`).

## Environments

| Environment | Base URL |
|---|---|
| Prod | `https://manage-your-support-for-hmcts-services.service.gov.uk/` |
| AAT | `https://cui-ra.aat.platform.hmcts.net/` |
| Demo | `https://cui-ra.demo.platform.hmcts.net/` |

The S2S microservice name is `cui_ra`. Reference data is read from
`rd-commondata-api` using the caller's `idam-token`.

## Corrections to the Confluence spec

The [Payload Specification](https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1680476343)
and [Developer Integration Guide](https://tools.hmcts.net/confluence/pages/viewpage.action?pageId=1712514145)
are stale or contradictory in these places — the code is authoritative:

- **Success status is `201`, not `200`.** The POST returns `201 Created`.
- **No `/{language}/correlationId=...` redirect URL.** The service is handed a
  plain `url` (`<host>/dc/p/<uuid>`); the language/correlationId path form does
  not exist in code.
- **Auth headers are lowercase `idam-token` / `service-token`**, not
  `Authorization` / `ServiceAuthorization`.
- **`GET` does not delete the record** — it relies on the 1-hour TTL, so it is
  safely repeatable within the window.
- **`language` is optional**; the other six body fields are required.
- The `PayloadOutbound` interface misspells the field as `flagAsSupplied`
  (singular); the serialized value is **`flagsAsSupplied`** (plural). Consume the
  plural form.
