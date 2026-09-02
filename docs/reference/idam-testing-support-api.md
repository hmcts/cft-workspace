---
title: IDAM testing-support API
topic: idam-testing-support-api
diataxis: reference
product: workspace
audience: both
sources:
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/UserController.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/RoleController.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/ServiceProviderController.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/UserProfileController.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/InvitationController.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/NotificationsController.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/AdminController.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/config/SecurityConfig.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/util/PrincipalHelper.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/service/TestingUserService.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/service/TestingSessionService.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/service/TestingUserProfileService.java
  - idam-testing-support-api:src/main/resources/application.yaml
  - idam-api:idam-api/src/main/java/uk/gov/hmcts/reform/idam/api/controllers/TestingSupportController.java
  - cnp-flux-config:apps/idam/idam-testing-support-api/aat.yaml
  - cnp-flux-config:apps/idam/idam-testing-support-api/demo.yaml
  - cnp-flux-config:apps/idam/idam-api/aat.yaml
  - cnp-flux-config:apps/idam/idam-api/preview.yaml
sources_sha:
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/UserController.java": "6b22b40645379e3777bcc208fc906e957a37e7a2"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/RoleController.java": "723e8c69b1667c24fa49d4e1ef14fc3bbca50ddf"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/ServiceProviderController.java": "4c606c1dccf3beb5b5fc57624991a63607666913"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/UserProfileController.java": "c812deeb328a412aad24ccb395a8c55cec7018e7"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/InvitationController.java": "36b66314616960d214c7654b39e34e0b7fb447b1"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/NotificationsController.java": "188195e0e1bcaffd4a08400ecf96d26ca9ccb54c"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/AdminController.java": "5c247bb1074a9f198b2f339e0b075cc88c555cad"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/config/SecurityConfig.java": "7535f1891ed6188d691c9e6f42a4fe19ac138902"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/util/PrincipalHelper.java": "2038aae8b1916f3c0d67f1adacadf5e933f8ad83"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/service/TestingUserService.java": "6b22b40645379e3777bcc208fc906e957a37e7a2"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/service/TestingSessionService.java": "10d4c8647ff0f19a9e52a17936d2d1944a17e832"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/service/TestingUserProfileService.java": "7b1c64e634a1e9fde9f0f5a5878a34d6c9001c5c"
  "idam-testing-support-api:src/main/resources/application.yaml": "6ab4cfea9ee39ae7de979f0b36b0f529df5febe8"
  "idam-api:idam-api/src/main/java/uk/gov/hmcts/reform/idam/api/controllers/TestingSupportController.java": "01528cc8a3134fa27b67978051b574739a9738f9"
  "cnp-flux-config:apps/idam/idam-testing-support-api/aat.yaml": "9206845f92b73ee20ddef7f8dd52e744d2f4e89a"
  "cnp-flux-config:apps/idam/idam-testing-support-api/demo.yaml": "115b21b5c5d91a888fbe279c9cfe5da7543d4efc"
  "cnp-flux-config:apps/idam/idam-api/aat.yaml": "5204d6501ba153f5d4da0db0b4ab3bb98dbf4193"
  "cnp-flux-config:apps/idam/idam-api/preview.yaml": "e45b819623eb09e7dad36577422de19f9533e662"
---
# IDAM testing-support API

`apps/idam/idam-testing-support-api` — creates and lifecycle-manages IDAM test data
(users, roles, OAuth clients) in non-production environments. Recipes:
[Create IDAM test users](../how-to/create-idam-test-users.md).

## Base URLs

```
https://idam-testing-support-api.<env>.platform.hmcts.net
```

Available for `aat`, `demo`, `ithc`, `perftest`, `preview`, `sandbox`. Public ingress — no VPN
required. Not deployed to prod.

## Endpoints

`Auth` column: **`profile`** = bearer token with the `profile` scope; **none** = unauthenticated;
**bearer** = any valid JWT (`permitAll` in the filter chain, but the handler dereferences the
principal, so a token is still needed in practice).

### Users

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/test/idam/users` | `profile` | Create. `201` + `User`. `409` if the email exists. |
| `PUT` | `/test/idam/users/{userId}` | `profile` | Create-or-update at a caller-chosen UUID. Idempotent — `409` on create is caught and retried as an update. |
| `GET` | `/test/idam/users/{userId}` | `profile` | Fetch by IDAM UUID. |
| `GET` | `/test/idam/users?email=` | `profile` | Fetch by email. |
| `DELETE` | `/test/idam/users/{userId}` | `profile` | Marks for removal on the next session cleanup pass — **not** an immediate delete. `204`. |
| `POST` | `/test/idam/burner/users` | **none** | 15-min lifespan, rate-limited, poison roles stripped. |
| `DELETE` | `/test/idam/burner/users/{userId}` | **none** | `force: true` header forces immediate removal. |

Request body for all create/update calls (`ActivatedUserRequest`):

```json
{
  "password": "Pa55word11",
  "user": {
    "id": "optional-uuid",
    "email": "user@mailnesia.com",
    "forename": "Test",
    "surname": "User",
    "roleNames": ["citizen"]
  }
}
```

`roleNames` must reference roles that already exist in IDAM.

### Roles and OAuth clients

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/test/idam/roles` | bearer | Create a role. Body: `Role`. |
| `DELETE` | `/test/idam/roles/{roleName}` | bearer | Mark for removal. |
| `POST` | `/test/idam/services` | bearer | Register an OAuth client. Body: `ServiceProvider`. On `409` the existing entity is *detached* from testing-support management and the conflict is rethrown. |
| `DELETE` | `/test/idam/services/{clientId}` | bearer | Mark for removal. |

Cleanup ordering matters here: users are deleted before roles, which is why both are owned by the
same session rather than expiring independently.

### Reference Data profiles

| Method | Path | Auth | Notes |
|---|---|---|---|
| `PUT` | `/test/cft/users/{userId}` | bearer | Create IDAM user **+** RD user profile **+** caseworker profile (when the roles match a caseworker pattern). The one-call option for caseworker fixtures. **Validates the email domain** — see below. |
| `GET` | `/test/rd/user-profiles/{userId}` | bearer | Read the `rd-user-profile-api` record. |
| `GET` | `/test/rd/caseworker-profiles/{userId}` | bearer | Read the `rd-caseworker-ref-api` record. |

Which profiles `PUT /test/cft/users/{userId}` creates is decided by `cft.categories.role-patterns`:

| Category | Role patterns |
|---|---|
| `CASEWORKER` | `caseworker-.*`, `caseworker`, `cwd-user` |
| `PROFESSIONAL` | `pui-.*`, `solicitor` |
| `JUDICIARY` | `judiciary` |

`409` with `INCONSISTENT` means IDAM and RD disagree about the user's status or ID — usually a
half-cleaned-up user from a previous run.

`PUT /test/cft/users/{userId}` **rejects disposable email domains** that `/test/idam/users`
accepts. `@mailnesia.com` returns:

```
400 {"errors":["Bad Request","You must add a valid email address",
     "3 : There is a problem with your request. Please check and try again"]}
```

Verified working in AAT: `@justice.gov.uk`, `@hmcts.net`. The two `GET /test/rd/...` endpoints
return `404` (`"Could not find resource from database"` / `"The Caseworker data could not be
found"`) when no profile exists, so they're a usable assertion that the write landed.

### Notifications and invitations

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/test/idam/notifications/latest/{emailAddress}` | `profile` | Latest GOV.UK Notify message to that address. Use for activation / reset links. |
| `GET` | `/test/idam/invitations?email=` | bearer | List invitations for an email. |
| `POST` | `/test/idam/invitations` | bearer | Create an invitation. |

### Admin

Cleanup triggers and bulk deletes, for operating the service rather than writing tests:

| Method | Path |
|---|---|
| `POST` | `/trigger/expiry/burner/users` |
| `POST` | `/trigger/expiry/sessions` |
| `DELETE` | `/admin/entities/users`, `/admin/entities/roles`, `/admin/entities/services`, `/admin/sessions` |

## Testing sessions and cleanup

Every entity created through a `profile`-scoped or bearer endpoint is attached to a **testing
session**, keyed on the `auditTrackingId` claim of the caller's JWT (falling back to the
principal's hash code when absent). When the session ages past its lifespan, the service deletes
everything attached to it in dependency order.

| Setting | Chart default | AAT | demo |
|---|---|---|---|
| `cleanup.session.lifespan` | `2h` | **`3h`** | **`90d`** |
| `cleanup.session.batch-size` | `20` | `50` | — |
| `cleanup.burner.lifespan` | `15m` | — | — |
| `cleanup.burner.batch-size` | `40` | `50` | — |
| `cleanup.user.strategy` | `ALWAYS_DELETE` | — | — |
| `cleanup.user.recent-login-duration` | `15m` | — | — |

**AAT is 3 hours, demo is 90 days.** That single difference decides where a fixture belongs.

### Cleanup strategies

- **`ALWAYS_DELETE`** (default, and what both AAT and demo use) — everything created in a session
  is deleted when the session expires.
- **`SKIP_RECENT_LOGINS`** — users whose last login falls inside
  `cleanup.user.recent-login-duration` are set to `DETACHED` instead, permanently leaving
  testing-support's management. Neither AAT nor demo enables this.

Two constraints from the service's README worth knowing if you ever tune these:
`recent-login-duration` cannot exceed `session.lifespan` (it's silently halved if it does), and
IDAM's `lastLoginDate` is only accurate to the hour, so `SKIP_RECENT_LOGINS` is meaningless with
a lifespan under 2 hours.

### Burner rate limit

`POST /test/idam/burner/users` is throttled at 1 token, refilled 1 per 3 minutes. Poison roles
listed in `creation.burner.poison-role-names` are silently stripped — AAT sets `crd-admin`.

## The legacy `idam-api` path

`POST /testing-support/accounts` on **`idam-api`** predates this service. In AAT, `idam-api`
forwards it here; elsewhere it writes to ForgeRock directly.

| Env | `TESTINGSUPPORTAPI_ENABLED` | Effect |
|---|---|---|
| aat | `true` | `/testing-support/accounts` proxies to `idam-testing-support-api` |
| preview | `false` | handled by `idam-api` itself |

A `useapi: true` request header forces the proxy even when the flag is off. The payload shape
differs from this API's (`roles: [{"code": "citizen"}]` vs `roleNames: ["citizen"]`).

`idam-api`'s testing-support controller also carries things with no equivalent here: PIN lookup
by user ID, bulk delete by test-data prefix (`TESTING_SUPPORT_BULKDELETE_ENABLED`, off in
perftest), pending-user self-registration, invitation expiry, Service Bus user-event peeking, and
a Pact state-change hook. Two endpoints — `deleteTestService` and `patchService` — are
`@Deprecated(since = "8.2.0", forRemoval = true)`.

Prefer this API for new code. `libs/rd-commons-lib`'s `IdamOpenId` still uses the legacy path and
is inherited by many RD/service-team functional tests.

## Related

- [Create IDAM test users in AAT and demo](../how-to/create-idam-test-users.md)
- [Create a professional organisation for testing](../how-to/create-test-organisations.md)
- [IDAM product overview](../../apps/idam/CLAUDE.md)
- [Environments](cnp-environments.md)
