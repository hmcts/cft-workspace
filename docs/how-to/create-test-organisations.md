---
title: Create a professional organisation for testing
topic: create-test-organisations
diataxis: how-to
product: workspace
audience: both
sources:
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/external/OrganisationExternalController.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/internal/OrganisationInternalController.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/SuperController.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/service/impl/OrganisationServiceImpl.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/request/OrganisationCreationRequest.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/request/NewUserCreationRequest.java
  - rd-professional-api:src/main/resources/application.yaml
  - rd-user-profile-api:src/main/resources/application.yaml
  - cnp-flux-config:apps/rd/rd-professional-api/aat.yaml
  - cnp-flux-config:apps/rd/rd-user-profile-api/aat.yaml
  - rd-professional-api:src/functionalTest/java/uk/gov/hmcts/reform/professionalapi/client/ProfessionalApiClient.java
  - rd-professional-api:src/functionalTest/java/uk/gov/hmcts/reform/professionalapi/AuthorizationFunctionalTest.java
  - cnp-flux-config:apps/xui/xui-mo-webapp/aat.yaml
  - cnp-flux-config:apps/xui/xui-ao-webapp/aat.yaml
sources_sha:
  "rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/external/OrganisationExternalController.java": "2021f547d82578c6748fd13cdbb8d815576ba3a3"
  "rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/internal/OrganisationInternalController.java": "2021f547d82578c6748fd13cdbb8d815576ba3a3"
  "rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/SuperController.java": "99cf6d046d6e69880b0403496569468727c3ad22"
  "rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/service/impl/OrganisationServiceImpl.java": "e65aaa68e346e6abd3f6f8a87e739568202239cb"
  "rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/request/OrganisationCreationRequest.java": "2021f547d82578c6748fd13cdbb8d815576ba3a3"
  "rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/request/NewUserCreationRequest.java": "5e51e70306a76751761299fbd0bfbc2f59126307"
  "rd-professional-api:src/main/resources/application.yaml": "8501e4e7406318653bae352c04d5e03c1944a2cf"
  "rd-user-profile-api:src/main/resources/application.yaml": "8f4b5d2ee8f0d608f1fdaba60e7fd36ab585923c"
  "cnp-flux-config:apps/rd/rd-professional-api/aat.yaml": "fc6c420ab2f7d42579bbe33bc2f128b391450512"
  "cnp-flux-config:apps/rd/rd-user-profile-api/aat.yaml": "d42ed980a7c78386cf64189c9ed4adb7e920bfbb"
  "rd-professional-api:src/functionalTest/java/uk/gov/hmcts/reform/professionalapi/client/ProfessionalApiClient.java": "1f80936bc8a1d85d7f0ab6c161c4bd6bb1e6bffa"
  "rd-professional-api:src/functionalTest/java/uk/gov/hmcts/reform/professionalapi/AuthorizationFunctionalTest.java": "be21a1daf4798f1c28bd6e33be90917b677bf57a"
  "cnp-flux-config:apps/xui/xui-mo-webapp/aat.yaml": "b52924ddf7e6644a5cd1a673934f094cdbdd8b63"
  "cnp-flux-config:apps/xui/xui-ao-webapp/aat.yaml": "494d038049b7b74ea963807196925180c259365f"
---
# Create a professional organisation for testing

Unlike IDAM users, professional organisations have **no testing-support shortcut** — you use the
real `rd-professional-api` (PRD). It's a two-step flow, because organisations are created
`PENDING` and must be approved to `ACTIVE` before their users can do anything.

Two routes: the API (scriptable, but needs your service on PRD's S2S allowlist, and **approval
usually fails** — see step 4) or the Manage/Administer Organisations UIs (slower, but actually
completes). Start with the UI route if this is a one-off.

## Which route

| | API | UI |
|---|---|---|
| Speed for one org | slower to set up | ~5 min |
| Repeatable / scriptable | yes | no |
| Needs S2S allowlist entry | **yes**, for create | no |
| Needs a `prd-admin` user | **yes**, for approve | no (the AO app holds the role) |
| Can create a `PENDING` org | yes (verified in AAT) | yes |
| Can approve to `ACTIVE` | often **no** — see [the 403 blocker](#4-approve-it-to-active) | yes |

**Verified in AAT:** the S2S lease, org creation, and org deletion all work via the API. Approval
does *not*, for most callers. The pragmatic path is create via API, approve via UI.

## The short version

[`scripts/prd-test-org`](../../scripts/prd-test-org) wraps all of the below:

```console
./scripts/prd-test-org check    -m <microservice>                    # can I create? approve?
./scripts/prd-test-org create   -m <microservice> --name ZZZ-MYTEST
./scripts/prd-test-org add-user -m <ms> --org-id <id> --admin-token "$TOK" \
    --user-email sol@justice.gov.uk -r pui-case-manager
./scripts/prd-test-org users    -m <ms> --org-id <id> --admin-token "$TOK"
./scripts/prd-test-org set-roles -m <ms> --org-id <id> --admin-token "$TOK" \
    --user-id <uuid> -r pui-finance-manager --remove-roles pui-caa
./scripts/prd-test-org list     -m <ms> --name ZZZ- --admin-token "$TOK"
./scripts/prd-test-org delete   -m <ms> --org-id <id> --admin-token "$TOK"
```

**Run `check` first** — it needs no VPN or credentials and tells you whether your microservice can
create an organisation, approve one, or neither. It reads both allowlists from flux, which is the
question that otherwise surfaces as a confusing `403` half an hour later.

The script randomises PBAs, defaults the superUser to a domain RD accepts, and maps the misleading
errors to their real causes. The rest of this page is the underlying calls.

## Route A: the API

### 1. Check you're on the S2S allowlist

PRD rejects calls from microservices not in `PRD_S2S_AUTHORISED_SERVICES`.

**Check flux, not the app's `application.yaml`.** The compiled-in default is a short list, but
every environment overrides it with a much longer one — so a service that looks unauthorised in
the source is often fine in AAT:

```bash
grep -n "PRD_S2S_AUTHORISED_SERVICES" platops/cnp-flux-config/apps/rd/rd-professional-api/aat.yaml
```

The flux list is roughly twice the length of the app default, adding most service-team
microservices (`civil_service`, `probate_backend`, `nfdiv_case_api`, `prl_cos_api`, `et_cos`,
`payment_app`, `pcs_api`, `pt_api`, …). **The lists also differ per environment** — several
entries present in AAT/demo/ithc/perftest are absent from prod, so check the env you're targeting
rather than assuming.

If your service genuinely isn't listed, PRD have to add it. Borrowing another microservice's S2S
secret works for a one-off investigation but doesn't belong in a committed test suite.

### 2. Get an S2S token

Creating an organisation needs **only** an S2S token — no user token, no role.

```bash
ENV=aat
S2S_URL=http://rpe-service-auth-provider-$ENV.service.core-compute-$ENV.internal
MICROSERVICE=CHANGE_ME              # underscores, as it appears in the allowlist above

S2S_SECRET=$(az keyvault secret show --vault-name "s2s-$ENV" \
  --name "microservicekey-$(echo $MICROSERVICE | tr '_' '-')" --query value -o tsv)
OTP=$(docker run --rm hmctsprod.azurecr.io/imported/toolbelt/oathtool --totp -b "$S2S_SECRET")

S2S_TOKEN=$(curl -s -X POST "$S2S_URL/lease" -H 'Content-Type: application/json' \
  -d "{\"microservice\":\"$MICROSERVICE\",\"oneTimePassword\":\"$OTP\"}")
```

S2S microservice keys live in the **`s2s-<env>`** vault (resource group
`rpe-service-auth-provider-<env>`), named `microservicekey-<microservice-with-hyphens>`. Mind the
underscore-to-hyphen conversion — the microservice name uses underscores but the secret uses
hyphens, so `xui_webapp` is stored as `microservicekey-xui-webapp`. List them with:

```bash
az keyvault secret list --vault-name "s2s-$ENV" -o tsv --query "[].name" | grep microservicekey-
```

`oathtool` isn't installed in the devcontainer, hence the docker image above; a native
`oathtool --totp -b "$S2S_SECRET"` works if you have it. `scripts/lib/_cft.sh` also carries a
`node` fallback for hosts with neither.

**VPN required from here on.** Both `rpe-service-auth-provider` and `rd-professional-api` are
only exposed on internal `*.service.core-compute-<env>.internal` hostnames — PRD's chart
declares no public ingress. See [Connect via VPN](connect-via-vpn.md), and note the
[devcontainer DNS gotcha](connect-via-vpn.md) if you're working inside the container and
connected the VPN afterwards.

### 3. Create the organisation

```bash
curl -s -X POST "http://rd-professional-api-$ENV.service.core-compute-$ENV.internal/refdata/external/v1/organisations" \
  -H "ServiceAuthorization: Bearer $S2S_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "My Test Org",
    "status": "PENDING",
    "sraId": "test-sra-'"$RANDOM"'",
    "sraRegulated": "false",
    "companyNumber": "12345678",
    "companyUrl": "https://example.org",
    "superUser": {
      "firstName": "Super",
      "lastName": "User",
      "email": "super-user-'"$RANDOM"'@justice.gov.uk"
    },
    "paymentAccount": ["PBA'"$(tr -dc '0-9' < /dev/urandom | head -c7)"'"],
    "contactInformation": [
      {"addressLine1": "1 Test Street", "townCity": "Testville", "postCode": "TE5 7ST", "country": "UK"}
    ]
  }' | jq .
```

`201` returns `{"organisationIdentifier": "ABC1DEF"}` — a 7-char alphanumeric ID. Keep it.

Required fields are `name`, `superUser`, and `contactInformation`. `sraId` must be unique across
organisations, so randomise it for repeat runs.

> **PBA numbers are globally unique — randomise them.** A hardcoded `PBA0000001` fails with:
>
> ```
> 400 {"errorMessage":"6 : PBA_NUMBER Invalid or already exists",
>      "errorDescription":"duplicate key value violates unique constraint \"pba_number_uq\""}
> ```
>
> **Worse, this 400 is not atomic — the organisation is still created.** Verified in AAT: a
> request rejected on the PBA constraint left a full `PENDING` organisation behind. So do **not**
> blindly retry a failed create; check what exists first (see
> [cleaning up](#cleaning-up-after-yourself)) or you will litter the environment with duplicates.

**PRD creates the superUser's IDAM account for you**, via `rd-user-profile-api`. You do not
pre-create it with the testing-support API, and you don't choose its password — the user gets an
invitation email. To log in as them you'll need to read that email (see
[Getting the superUser logged in](#getting-the-superuser-logged-in)).

There's also `/refdata/external/v2/organisations`, which takes the same body plus
`orgTypeKey` / `orgAttributes` for the newer access-types model. Use v1 unless you specifically
need those.

### 4. Approve it to ACTIVE

New organisations are `PENDING` and their users can't act until approval. This endpoint is
`@Secured("prd-admin")`, so you need a **user** token for a user holding the `prd-admin` role,
alongside the S2S token.

```bash
curl -s -X PUT "http://rd-professional-api-$ENV.service.core-compute-$ENV.internal/refdata/internal/v1/organisations/ABC1DEF" \
  -H "ServiceAuthorization: Bearer $S2S_TOKEN" \
  -H "Authorization: Bearer $PRD_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "My Test Org",
    "status": "ACTIVE",
    "superUser": {"firstName":"Super","lastName":"User","email":"super-user-...@justice.gov.uk"},
    "contactInformation": [{"addressLine1":"1 Test Street"}]
  }'
```

To get a `prd-admin` user, create one with the testing-support API —
`roleNames: ["prd-admin"]`, per [Create IDAM test users](create-idam-test-users.md) — then take a
password-grant token for it. Remember the AAT 3-hour cleanup applies to that admin user too. Use an
`@justice.gov.uk` address, not a disposable domain.

Statuses are `PENDING`, `ACTIVE`, `REVIEW`, `BLOCKED`, `DELETED`. `REVIEW` and `BLOCKED` also
accept a `statusMessage`; PRD's own functional tests exercise all of them.

> **Known blocker: approval returns `403` in AAT.** With a valid S2S token and a genuine
> `prd-admin` user token, this call fails:
>
> ```
> 403 {"errorMessage":"15 Bearer token is expired, or the user or service
>      does not have permission to perform this action"}
> ```
>
> **The message is misleading — it is not your token.** Approving an organisation makes PRD call
> `rd-user-profile-api` to create the superUser's profile, and `SuperController` returns the
> *downstream* status verbatim (`SuperController.java:386`). `rd-user-profile-api` keeps its **own,
> much shorter allowlist**, so being on PRD's list is not enough — you must be on both:
>
> ```bash
> grep -n "S2S_AUTHORISED" platops/cnp-flux-config/apps/rd/rd-user-profile-api/aat.yaml
> ```
>
> At time of writing that list is roughly a quarter the length of PRD's, so **most service-team
> microservices that can create an organisation cannot approve one.**
>
> How to tell it apart from a genuine auth failure: a `prd-admin` **GET**
> (`?id=<orgId>`) returns `200`, and the MFA `PUT` reaches application logic
> (`400 "The requested Organisation is not 'Active'"`) with the same token. Both were verified.
> If those work and only the approve `403`s, it's this.
>
> Practical consequence: **use the UI (Route B) to approve**, or call from a microservice on
> `rd-user-profile-api`'s allowlist. Creating a `PENDING` org via the API and approving it in the
> Administer Organisations UI is a fine hybrid.

### Cleaning up after yourself

Organisations have no automatic expiry, but `prd-admin` **can** delete them — verified `204` in
AAT for a `PENDING` org:

```bash
curl -s -X DELETE "http://rd-professional-api-$ENV.service.core-compute-$ENV.internal/refdata/internal/v1/organisations/ABC1DEF" \
  -H "ServiceAuthorization: Bearer $S2S_TOKEN" -H "Authorization: Bearer $PRD_ADMIN_TOKEN"
```

Find strays you created, including ones left by a non-atomic `400`:

```bash
curl -s "http://rd-professional-api-$ENV.service.core-compute-$ENV.internal/refdata/internal/v1/organisations?status=PENDING" \
  -H "ServiceAuthorization: Bearer $S2S_TOKEN" -H "Authorization: Bearer $PRD_ADMIN_TOKEN" \
  | jq '[.organisations[] | select(.name|test("YOUR-PREFIX")) | {name,organisationIdentifier}]'
```

Deleting is only possible while the org is `PENDING`/`REVIEW` — an `ACTIVE` org with users is much
harder to remove, which is another reason not to approve one casually.

### 5. Add more users to the organisation

```bash
curl -s -X POST "http://rd-professional-api-$ENV.service.core-compute-$ENV.internal/refdata/external/v1/organisations/users/" \
  -H "ServiceAuthorization: Bearer $S2S_TOKEN" \
  -H "Authorization: Bearer $PUI_USER_MANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "firstName": "Extra",
    "lastName": "Solicitor",
    "email": "extra-sol-'"$RANDOM"'@mailnesia.com",
    "roles": ["pui-case-manager"],
    "resendInvite": false
  }'
```

Note the **trailing slash** on `/users/` — the mapping is declared with one.

This is `@Secured("pui-user-manager")` and derives the organisation from the calling user's own
org, so the token must belong to a user *inside* the target organisation. There's an internal
equivalent, `POST /refdata/internal/v1/organisations/{orgId}/users/`, which is
`@Secured("prd-admin")` and takes the org ID explicitly — easier from a fixture script, since you
already have a `prd-admin` token from step 4.

The PUI roles that matter: `pui-user-manager`, `pui-organisation-manager`,
`pui-finance-manager`, `pui-case-manager`, `pui-caa`.

Users can't do anything until the **organisation** is `ACTIVE`, regardless of their roles — adding
users to a `PENDING` org silently gets you users who can't act.

### 6. Inspect and change a user's roles

List the organisation's users with their roles (`prd-admin`; `returnRoles=true` is what includes
the roles at all):

```bash
curl -s "http://rd-professional-api-$ENV.service.core-compute-$ENV.internal/refdata/internal/v1/organisations/ABC1DEF/users?returnRoles=true" \
  -H "ServiceAuthorization: Bearer $S2S_TOKEN" -H "Authorization: Bearer $PRD_ADMIN_TOKEN" \
  | jq '[.users[] | {userIdentifier, email, idamStatus, roles}]'
```

Add and remove roles on an existing user — `PUT .../{orgId}/users/{userId}`, `@Secured("prd-admin")`.
Note `rolesAdd` / `rolesDelete` are arrays of **objects**, not bare strings:

```bash
curl -s -X PUT "http://rd-professional-api-$ENV.service.core-compute-$ENV.internal/refdata/internal/v1/organisations/ABC1DEF/users/$USER_ID" \
  -H "ServiceAuthorization: Bearer $S2S_TOKEN" -H "Authorization: Bearer $PRD_ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"rolesAdd":[{"name":"pui-finance-manager"}],"rolesDelete":[{"name":"pui-caa"}]}'
```

Send `[]` rather than omitting the key when you only want to add or only remove. The external
equivalent (`PUT /refdata/external/v1/organisations/users/{userId}`) is `@Secured("pui-user-manager")`
and infers the org from the caller, so it needs a token belonging to a user inside the org.

`userIdentifier` from the `users` listing is the IDAM UUID — that's the `{userId}` these take.

## Getting the superUser logged in

PRD-created users are invited, not activated with a known password. Options, in order of
preference for automation:

1. **Read the invitation email** —
   `GET /test/idam/notifications/latest/{email}` on `idam-testing-support-api` returns the Notify
   message, including the activation link. This works for any address, so it's the way to read mail
   for the `@justice.gov.uk` superUser that RD's validation forces on you.
2. **Overwrite the password** — after PRD has created the IDAM user, `PUT /test/idam/users/{userId}`
   on the testing-support API with the user's IDAM ID and a known password. Crude, but it works
   and is what you want in a fixture script. Note this attaches the user to *your* testing session,
   so AAT's 3-hour cleanup will then delete it out from under the organisation.
3. **Activate through the UI** — click the link in a real inbox. Fine once, not for CI.

## Route B: the UIs

For a one-off org, this is genuinely faster and skips the allowlist and `prd-admin` problems.

1. **Register** at `https://manage-org.<env>.platform.hmcts.net/register-org/register`
   (`register-org.<env>.platform.hmcts.net` permanently redirects here). Fill in the org details
   and superUser. This creates the `PENDING` organisation.
2. **Approve** at `https://administer-orgs.<env>.platform.hmcts.net` — find the pending org and
   approve it. You need to log in as a user with the approver role.
3. **Activate the superUser** from the invitation email.

Substitute `aat` or `demo` for `<env>`. Prefer **demo** for anything that needs to survive, for
the same reason as users — see [cleanup](create-idam-test-users.md#cleanup-and-session-lifespan)
if you're mixing in testing-support-created users.

## Caveats

- **Organisations have no automatic expiry.** Unlike IDAM test users, PRD has no session-based
  cleanup — an org you create in AAT stays until someone deletes it. Name it recognisably (the PRD
  functional tests suffix `-prd-func-test-name`) and delete it when done; see
  [cleaning up](#cleaning-up-after-yourself).
- **PBA numbers** must match `PBA` + 7 digits and are **globally unique** — randomise them. They
  aren't validated against real Payments accounts at creation, but a payment journey will fail if
  the PBA doesn't exist in Payments.
- **A `400` may still have created the organisation.** Check before retrying.
- **`sraId` collisions** are the other common `400` on re-runs.
- Many service teams **stub PRD entirely** in E2E rather than create real orgs — see
  `apps/civil/civil-ccd-definition/e2e/helpers/activeOrganisationUsers.js`, which swaps wiremock
  response files per test user. If your test only *reads* org data, stubbing is much cheaper than
  this whole flow.

## Worked examples

The reference implementation is PRD's own functional-test client, which does the full
create → approve → add-user sequence:

- `apps/rd/rd-professional-api/src/functionalTest/java/uk/gov/hmcts/reform/professionalapi/client/ProfessionalApiClient.java`
  — `createOrganisation()`, `updateOrganisation()`, `addNewUserToAnOrganisation()`, and
  `createOrganisationRequest()` for a fully-populated request body.
- `apps/rd/rd-professional-api/src/functionalTest/java/uk/gov/hmcts/reform/professionalapi/AuthorizationFunctionalTest.java`
  — `createAndUpdateOrganisationToActive(role)` is the two-step flow in one method.

There is no shell script in the workspace that does this end-to-end. If you write one, it
belongs in your own repo's `bin/`, not here.

## Related

- [Create IDAM test users in AAT and demo](create-idam-test-users.md)
- [Professional Organisations](../../apps/rd/docs/explanation/professional-organisations.md) —
  the domain model, statuses, PBA lifecycle, and role-based security in depth.
- [IDAM testing-support API reference](../reference/idam-testing-support-api.md)
