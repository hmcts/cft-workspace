# Possession Claims Service (PCS)

HMCTS service for handling possession claims. This directory groups two independently-built subprojects that together make up PCS:

- **`pcs-api/`** — Spring Boot 3.5 backend on Java 21, Gradle wrapper, Flyway-managed PostgreSQL. Serves REST endpoints (default port 3206, Swagger at `/swagger-ui.html`) and integrates with CCD, IDAM, S2S, and the Fee Register.
- **`pcs-frontend/`** — Express + TypeScript user-facing app on Node 18+ (Yarn), default port 3209. Uses Redis-backed sessions, OIDC auth via IDAM, nunjucks templates, and webpack bundling. Calls `pcs-api`.

## Working in this directory

Per the workspace root `CLAUDE.md`, each subproject is a standalone repo with its own VCS history and build system. Always `cd` into `pcs-api/` or `pcs-frontend/` before running `./gradlew` / `yarn` commands, and consult that subproject's own `README.md` for the canonical task list.

## Frontend ↔ CCD ↔ PCS-API communication

The PCS frontend talks to CCD for all case interactions in the "respond to claim" journey. PCS-API is registered as a decentralised CCD service: CCD invokes PCS-API as a callback whenever it needs to load case data, run mid-event validation, or apply an event submission.

### Mid-event draft saves → CCD `/validate`

Each form step's `beforeRedirect` hook sends the current defendant response DTO to **CCD** via:

```
POST {ccd.url}/case-types/{ctid}/validate?pageId=respondToPossessionDraftSavePage
```

CCD loads the case from PCS-API (via the decentralised `GET /ccd-persistence/cases` endpoint), merges the request `data` on top, and invokes PCS-API's mid-event callback at `/callbacks/mid-event?page=respondToPossessionDraftSavePage`. PCS-API validates and persists the draft data in its own draft table.

The frontend sends the **full `possessionClaimResponse` DTO** on every save — not a partial/incremental patch. Each step clones the existing DTO from the case data (via `prepareDefendantResponse` / `getDraftDefendantResponse` in `src/main/steps/utils/`), mutates the relevant fields (setting values or deleting stale ones), and sends the complete object back. This means:

- Every save is idempotent — the backend can replace the stored draft wholesale.
- The frontend is responsible for clearing fields that no longer apply (e.g. deleting a detail text field when the user switches a radio from "yes" to "no").
- Claimant-entered fields are stripped from the clone before sending so the defendant cannot overwrite them.

### Final submit → CCD events

The final submission uses CCD's standard two-phase event lifecycle:

1. **START** — `GET {ccd.url}/cases/{caseId}/event-triggers/respondPossessionClaim` — obtains a one-time event token.
2. **SUBMIT** — `POST {ccd.url}/cases/{caseId}/events` — sends the event token with minimal/empty data. The PCS-API backend (acting as a CCD callback) loads the persisted draft and applies it during the submitted callback.

### Configuration

- `ccd.url` — CCD Data Store API base URL (used for all case interactions: START/SUBMIT, case search, mid-event validate).
- `api.url` — PCS-API base URL (still used by the frontend for non-case endpoints such as `/info` and the `pcsApiService`, not for CCD case interactions).

Both are set in `pcs-frontend/config/default.json` and overridden per environment.
