---
title: Create IDAM test users in AAT and demo
topic: create-idam-test-users
diataxis: how-to
product: workspace
audience: both
sources:
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/UserController.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/config/SecurityConfig.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/service/TestingSessionService.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/util/PrincipalHelper.java
  - idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/service/TestingUserService.java
  - idam-testing-support-api:src/main/resources/application.yaml
  - idam-testing-support-api:README.md
  - cnp-flux-config:apps/idam/idam-testing-support-api/aat.yaml
  - cnp-flux-config:apps/idam/idam-testing-support-api/demo.yaml
  - cnp-flux-config:apps/idam/idam-api/aat.yaml
  - pcs-frontend:bin/dev/createIdamUser.sh
sources_sha:
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/controllers/UserController.java": "6b22b40645379e3777bcc208fc906e957a37e7a2"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/config/SecurityConfig.java": "7535f1891ed6188d691c9e6f42a4fe19ac138902"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/service/TestingSessionService.java": "10d4c8647ff0f19a9e52a17936d2d1944a17e832"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/util/PrincipalHelper.java": "2038aae8b1916f3c0d67f1adacadf5e933f8ad83"
  "idam-testing-support-api:src/main/java/uk/gov/hmcts/cft/idam/testingsupportapi/service/TestingUserService.java": "6b22b40645379e3777bcc208fc906e957a37e7a2"
  "idam-testing-support-api:src/main/resources/application.yaml": "6ab4cfea9ee39ae7de979f0b36b0f529df5febe8"
  "idam-testing-support-api:README.md": "d13acc99ba8524a8d6b3231b4b680d397ef2ba4f"
  "cnp-flux-config:apps/idam/idam-testing-support-api/aat.yaml": "9206845f92b73ee20ddef7f8dd52e744d2f4e89a"
  "cnp-flux-config:apps/idam/idam-testing-support-api/demo.yaml": "115b21b5c5d91a888fbe279c9cfe5da7543d4efc"
  "cnp-flux-config:apps/idam/idam-api/aat.yaml": "5204d6501ba153f5d4da0db0b4ab3bb98dbf4193"
  "pcs-frontend:bin/dev/createIdamUser.sh": "22ca0050fe543484b4134a8b0119b9c66e22dbf4"
---
# Create IDAM test users in AAT and demo

Create a test user with arbitrary roles in a non-production environment, using
`idam-testing-support-api`. Two HTTP calls: get a client-credentials token, then POST the user.

The **big gotcha** is cleanup: in AAT your user is deleted after ~3 hours. See
[Cleanup and session lifespan](#cleanup-and-session-lifespan) before you build anything that
assumes a user still exists.

## Prerequisites

- `az login` done, and read access to your service's `<product>-<env>` Key Vault (to fetch the
  IDAM client secret). See [Subscriptions](../reference/cnp-environments.md#azure-subscriptions).
- `curl` and `jq`.
- **No VPN needed** — `*.platform.hmcts.net` ingress hosts are publicly resolvable.

The snippets below read `/proc/sys/kernel/random/uuid` for unique emails and user IDs rather than
`uuidgen`, which is **not installed in the devcontainer**. `python3 -c 'import uuid;print(uuid.uuid4())'`
also works if you're on a non-Linux host.

## Steps

### 1. Get a client-credentials token

`POST /test/idam/users` is an OAuth2 resource-server endpoint requiring the `profile` scope
(`SCOPE_profile` in `SecurityConfig.java`). Any IDAM client your service already owns will do —
you don't need a special testing client.

Set these four for your own service — there is no workspace-wide default:

```bash
ENV=aat               # or demo
PRODUCT=CHANGE_ME     # Key Vault prefix — the dir name under apps/
CLIENT_ID=CHANGE_ME   # your service's registered IDAM client
SECRET_NAME=CHANGE_ME # see below — naming is not uniform
```

Find `CLIENT_ID` and `SECRET_NAME` by listing the vault, since neither follows a reliable
convention across products:

```bash
az keyvault secret list --vault-name "$PRODUCT-$ENV" -o tsv --query "[].name" | grep -i idam
```

Common shapes are `<service>-idam-secret`, `idam-secret`, and `<service>-idam-client-secret`.
Then:

```bash
CLIENT_SECRET=$(az keyvault secret show \
  --vault-name "$PRODUCT-$ENV" --name "$SECRET_NAME" \
  --query value -o tsv)

TOKEN=$(curl -s -X POST "https://idam-web-public.$ENV.platform.hmcts.net/o/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=client_credentials' \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "client_secret=$CLIENT_SECRET" \
  --data-urlencode 'scope=profile roles' \
  | jq -r .access_token)
```

Confirm the token came back with the `profile` scope — without it, the create call 403s:

```bash
echo "$TOKEN" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | jq -c '{scope,tokenName}'
```

You can also use a **password grant** for a known human user instead of client credentials; some
products keep `idam-system-user-name` / `idam-system-user-password` in their vault for exactly
this. Either works — client credentials avoids depending on another user's account staying alive.

### 2. Create the user

```bash
curl -s -X POST "https://idam-testing-support-api.$ENV.platform.hmcts.net/test/idam/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "password": "Pa55word11",
    "user": {
      "email": "my-test-user-'"$(cat /proc/sys/kernel/random/uuid)"'@mailnesia.com",
      "forename": "Test",
      "surname": "User",
      "roleNames": ["citizen"]
    }
  }' | jq .
```

`201` returns the created `User` including its `id` (the IDAM UUID — this is what CCD, AM, and
RD refer to the user by). `409` means the email already exists.

Roles in `roleNames` **must already exist in IDAM**. If yours doesn't, create it first with
`POST /test/idam/roles` (see [step 5](#5-optional-create-a-role-or-register-a-client)).

Use a disposable-inbox domain (`@mailnesia.com` is the workspace convention) if you need to
read activation or invitation emails.

### 3. Log in as the user

The password you supplied is set and the account is activated immediately — there's no email
activation step for users created this way.

```bash
curl -s -X POST "https://idam-web-public.$ENV.platform.hmcts.net/o/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=password' \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "client_secret=$CLIENT_SECRET" \
  --data-urlencode "username=my-test-user-...@mailnesia.com" \
  --data-urlencode 'password=Pa55word11' \
  --data-urlencode 'scope=openid profile roles' | jq -r .access_token
```

### 4. Reseed idempotently at a fixed UUID

For a fixture set you re-run repeatedly, generate the UUID yourself and `PUT` instead of
`POST`. `PUT /test/idam/users/{userId}` creates the user, and on `409` falls back to updating —
so it's safe to re-run.

```bash
USER_ID=$(cat /proc/sys/kernel/random/uuid)
curl -s -X PUT "https://idam-testing-support-api.$ENV.platform.hmcts.net/test/idam/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"password":"Pa55word11","user":{"email":"fixture-1@mailnesia.com","forename":"Fixture","surname":"One","roleNames":["caseworker"]}}'
```

Pin the UUIDs in a committed JSON file so downstream fixtures (CCD case data, AM role
assignments) can reference stable user IDs. `apps/finrem/finrem-ccd-definitions/create_idam_id_scripts/`
does this — see [Worked examples](#worked-examples).

### 5. (Optional) create a role, or register a client

```bash
# Create an IDAM role
curl -s -X POST "https://idam-testing-support-api.$ENV.platform.hmcts.net/test/idam/roles" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"my-new-role","description":"scratch role"}'

# Register an OAuth client (service provider)
curl -s -X POST "https://idam-testing-support-api.$ENV.platform.hmcts.net/test/idam/services" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"clientId":"my-client","clientSecret":"...","redirectUris":["https://localhost:3000/oauth2/callback"],"scope":"openid profile roles"}'
```

Both are session-scoped and cleaned up with the same lifespan as users.

### 6. (Optional) create the RD profiles too

A bare IDAM user is invisible to Reference Data. If the journey you're testing reads
`rd-user-profile-api` or `rd-caseworker-ref-api` (most caseworker and judicial journeys do),
use `PUT /test/cft/users/{userId}` instead of `PUT /test/idam/users/{userId}`. It creates the
IDAM user **and** the matching user profile, plus a caseworker profile when the roles look like
a caseworker.

```bash
curl -s -X PUT "https://idam-testing-support-api.$ENV.platform.hmcts.net/test/cft/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"password":"Pa55word11","user":{"email":"doc-cw-1@justice.gov.uk","forename":"Case","surname":"Worker","roleNames":["caseworker"]}}'
```

> **This endpoint validates the email domain — `@mailnesia.com` is rejected.** Reference Data
> applies its own validation, so a disposable-inbox address that works fine on
> `/test/idam/users` fails here with `400 "You must add a valid email address"`. Use
> `@justice.gov.uk` (or `@hmcts.net`); both are accepted. The trade-off is that you can no longer
> read the mailbox, so pair this with
> `GET /test/idam/notifications/latest/{email}` if you need the email content.

Verify the profiles landed — a `200` from both means RD is populated:

```bash
curl -s "https://idam-testing-support-api.$ENV.platform.hmcts.net/test/rd/user-profiles/$USER_ID" -H "Authorization: Bearer $TOKEN"
curl -s "https://idam-testing-support-api.$ENV.platform.hmcts.net/test/rd/caseworker-profiles/$USER_ID" -H "Authorization: Bearer $TOKEN"
```

Which profiles get created is driven by role-name patterns in the service's
`cft.categories.role-patterns` config — `caseworker-.*` / `cwd-user` → caseworker,
`pui-.*` / `solicitor` → professional, `judiciary` → judicial. Note `caseworker` alone is enough;
a bare `caseworker` role produced both a user profile and a caseworker profile in AAT.

## Cleanup and session lifespan

Every entity you create is owned by a **testing session**, keyed off the `auditTrackingId`
claim in your bearer token (`PrincipalHelper.getSessionKey`). When the session expires, the
service deletes everything attached to it, in dependency order.

| Env | `CLEANUP_SESSION_LIFESPAN` | Practical effect |
|---|---|---|
| **AAT** | `3h` | Test users disappear after ~3 hours. Fine for a test run; useless for a fixture. |
| **demo** | `90d` | Effectively persistent. **Use demo for long-lived / demo-day users.** |
| default (chart) | `2h` | Applies anywhere the env doesn't override it. |

The strategy is `ALWAYS_DELETE` in both AAT and demo. The alternative,
`SKIP_RECENT_LOGINS`, detaches users who logged in recently rather than deleting them — but
neither environment sets it, so don't rely on "I logged in, so it survived".

Consequences worth internalising:

- **Don't put a long-lived shared test account in AAT via this API.** It will vanish. Either use
  demo, or reseed it from a script/pipeline on every run.
- A new token each run means a new session, so yesterday's users aren't adopted by today's
  session — they just expire on their own clock.
- `DELETE /test/idam/users/{userId}` doesn't delete immediately; it marks the entity for removal
  on the session's cleanup pass.

### Burner users

`POST /test/idam/burner/users` needs **no authentication** at all, and its users get a 15-minute
lifespan. It's rate-limited (1 token, refilled every 3 minutes) and strips "poison" roles —
`crd-admin` is stripped in AAT. Good for a throwaway login in a smoke test; wrong for anything
else.

```bash
curl -s -X POST "https://idam-testing-support-api.$ENV.platform.hmcts.net/test/idam/burner/users" \
  -H 'Content-Type: application/json' \
  -d '{"password":"Pa55word11","user":{"email":"burn-1@mailnesia.com","forename":"B","surname":"U","roleNames":["citizen"]}}'
```

`DELETE /test/idam/burner/users/{userId}` (also unauthenticated) removes one early; pass
`force: true` as a header to force it.

## Reading the activation / invitation email

`GET /test/idam/notifications/latest/{emailAddress}` returns the most recent GOV.UK Notify
message sent to that address — the way to grab an activation or password-reset link in an
automated test without a real mailbox.

## Don't use the legacy endpoint

`POST /testing-support/accounts` on **`idam-api`** is the old route. It still works in AAT
because `idam-api` proxies it through to `idam-testing-support-api`
(`TESTINGSUPPORTAPI_ENABLED: true` in `aat.yaml`) — but:

- Its payload shape differs (`roles: [{code: ...}]`, not `roleNames: [...]`).
- The proxy is **off in preview** (`TESTINGSUPPORTAPI_ENABLED: false`), so behaviour differs
  between preview and AAT.
- You can force the proxy per-request with a `useapi: true` header if you're stuck on the old
  path.

Plenty of existing Java functional tests still use it via `libs/rd-commons-lib`'s `IdamOpenId`.
Don't copy that into new code — use `/test/idam/users`.

## Worked examples

| Script | What it shows |
|---|---|
| [`apps/pcs/pcs-frontend/bin/dev/createIdamUser.sh`](../../apps/pcs/pcs-frontend/bin/dev/createIdamUser.sh) | Password-grant token, arg parsing, single user. Closest to a clean template — but see the `$$` trap below. |
| [`apps/finrem/finrem-ccd-definitions/create_idam_id_scripts/caseworker.sh`](../../apps/finrem/finrem-ccd-definitions/create_idam_id_scripts/caseworker.sh) | Batch reseed from a JSON file, delete-then-recreate at fixed UUIDs, writes out the resulting IDs. |
| [`apps/ia/ia-case-api/bin/utils/aip_scripts/create-test-user.zsh`](../../apps/ia/ia-case-api/bin/utils/aip_scripts/create-test-user.zsh) | Minimal citizen user, token split into a separate script. |
| `libs/ccd-config-generator/test-projects/civil-ccd-definition/e2e/api/idamHelper.js` | Node/E2E usage, token caching (8h TTL). |

### The `$$` trap

`createIdamUser.sh` sets `password="Pa$$word"` in **double** quotes, so `$$` expands to the
shell's PID — the password is different on every run and is never literally `Pa$$word`. The script
echoes the value it actually used, so read that rather than assuming. If you write your own, single-quote
the literal (`password='Pa$$word'`) or avoid `$` in test passwords entirely.

## Related

- [Create a professional organisation for testing](create-test-organisations.md) — orgs and
  solicitor users, which do **not** go through this API.
- [IDAM testing-support API reference](../reference/idam-testing-support-api.md) — full endpoint
  and auth table.
- [Environments](../reference/cnp-environments.md)
