---
title: Api Professional
topic: prd
diataxis: reference
product: rd
audience: both
sources:
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/external/OrganisationExternalController.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/internal/OrganisationInternalController.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/external/ProfessionalExternalUserController.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/internal/ProfessionalUserInternalController.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/service/impl/OrganisationServiceImpl.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/service/impl/PaymentAccountServiceImpl.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/SuperController.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/configuration/SecurityConfiguration.java
  - rd-professional-api:src/main/resources/application.yaml
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/external/OrganisationExternalControllerV2.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/internal/OrganisationInternalControllerV2.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/external/OrganisationMfaStatusController.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/controller/internal/BulkCustomerDetailsInternalController.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/domain/MFAStatus.java
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/domain/UserConfiguredAccess.java
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/rd/rd-professional-api/src/main/java/uk/gov/hmcts/reform/professionalapi/controller/external/OrganisationExternalController.java
  - apps/rd/rd-professional-api/src/main/resources/db/migration/V1_1__init_tables.sql
  - apps/rd/rd-professional-api/src/main/resources/application.yaml
confluence:
  - id: "1228834096"
    title: "PRD Endpoints - Roles and Pre-Requisites for Access"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1478697187"
    title: "New Service Integration with existing PRD APIs - Operational Model"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1460567946"
    title: "Performance Requirements for PRD APIs"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1210024996"
    title: "Role based security for PRD Endpoints"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1912310890"
    title: "Professional Reference Data"
    last_modified: "unknown"
    space: "FR"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- PRD (Professional Reference Data API) manages solicitor organisations, their users, and PBA payment accounts at base paths `/refdata/internal/v1/organisations` (admin) and `/refdata/external/v1/organisations` (solicitor-facing).
- All endpoints require S2S authentication; most additionally require an IDAM bearer token with specific roles (`prd-admin` for internal, `pui-*` / `pui-caa` for external).
- Organisations start as `PENDING`, are manually activated by admin, at which point the super user is registered in IDAM and all PBAs are auto-accepted.
- The `organisationIdentifier` is a 7-character alphanumeric string (not a UUID) used as the external key.
- V2 endpoints (both internal and external) add support for `orgType`, `orgAttributes`, and return enhanced PBA responses.
- Known consumers include ExUI, FPL, IAC, AAC, FR/FinRem, Divorce, Probate, and CMC Legal Rep Frontend. New consumers must be S2S-whitelisted via the operational model (PDG approval, performance sign-off, then prod whitelist).

## Authentication and authorisation

All PRD endpoints require a valid S2S token in the `ServiceAuthorization` header. The calling service must be in the `idam.s2s-authorised.services` allowlist (configured via `PRD_S2S_AUTHORISED_SERVICES` environment variable).

| Role | Scope | Description |
|------|-------|-------------|
| `prd-admin` | Internal endpoints | Full admin access to all organisations and users |
| `pui-organisation-manager` | External endpoints | Manage caller's own organisation |
| `pui-user-manager` | External endpoints | Invite and manage users within caller's org |
| `pui-finance-manager` | External endpoints | Manage PBA accounts for caller's org |
| `pui-case-manager` | External endpoints | Read access to org details |
| `pui-caa` | External endpoints | Case Access Admin; read access to org/user details (same scope as `pui-case-manager`) |
| `prd-aac-system` | Internal (limited) | Used by AAC; always gets ACTIVE-only user filter |
| `caseworker-civil-admin` | Internal (limited) | Bulk customer lookup only |

External controllers resolve the caller's organisation from the IDAM JWT via a custom `@OrgId` argument resolver -- no explicit org ID is needed in the request path.

### S2S allowlist

The default S2S-authorised services (from `application.yaml`) are:

```
rd_professional_api, rd_user_profile_api, xui_webapp, finrem_payment_service,
fpl_case_service, iac, aac_manage_case_assignment, divorce_frontend
```

Override via `PRD_S2S_AUTHORISED_SERVICES` environment variable. New services must follow the operational onboarding model: PDG/IA approval, performance sign-off, S2S whitelist in lower environments for integration testing, then production whitelist.

### External endpoint access constraints

All external endpoints enforce these rules (corroborated by source and Confluence):

- The caller's organisation must be in `ACTIVE` status; pending orgs get `403 Forbidden`
- Operations are scoped to the caller's own organisation only (derived from IDAM JWT)
- Without `pui-user-manager` role, user list queries default to `ACTIVE`-only users
- PBA retrieval for a different email within the same org requires `pui-finance-manager`

## Organisation endpoints

### Internal (admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/refdata/internal/v1/organisations` | S2S only | Create org (status = `PENDING`) |
| `GET` | `/refdata/internal/v1/organisations` | `prd-admin` | List orgs; filter by `id`, `status`, `since` (ISO timestamp). Paginated: `page` (1-based), `size` (default 10) |
| `PUT` | `/refdata/internal/v1/organisations/{orgId}` | `prd-admin` | Update org status/details. Transitioning to `ACTIVE` triggers IDAM super-user registration and PBA auto-acceptance |
| `DELETE` | `/refdata/internal/v1/organisations/{orgId}` | `prd-admin` | Delete org. Gated by `DELETE_ORG` flag (default: off). `PENDING`/`REVIEW` orgs are hard-deleted; `ACTIVE` orgs require user-profile deletion first |
| `GET` | `/refdata/internal/v1/organisations/pba/{status}` | `prd-admin` | List orgs filtered by PBA status |
| `POST` | `/refdata/internal/v1/organisations/getOrganisationsByProfile` | S2S only | Keyset-paginated bulk lookup by `organisationProfileIds`. Params: `pageSize` (default 100), `searchAfter` (UUID cursor) |

### Internal V2

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/refdata/internal/v2/organisations` | S2S only | Create org with `orgType` and `orgAttributes` |
| `GET` | `/refdata/internal/v2/organisations` | `prd-admin` | List orgs, returns `OrgAttributes` in response. Same filter params as V1: `id`, `since`, `status`, `page`, `size` |
| `GET` | `/refdata/internal/v2/organisations/pbas` | `prd-admin` | Lookup PBAs by email (V2 response with additional status details). Reads `UserEmail` header |
| `PUT` | `/refdata/internal/v2/organisations/{orgId}` | `prd-admin` | Update org with `orgType` and `orgAttributes` |

### External (solicitor-facing)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/refdata/external/v1/organisations` | S2S only | Self-register org (status = `PENDING`) |
| `GET` | `/refdata/external/v1/organisations` | `pui-organisation-manager`, `pui-finance-manager`, `pui-case-manager`, `pui-caa`, `pui-user-manager` | Get caller's own org details. Supports `pbaStatus=ACCEPTED` query param to filter PBAs |
| `GET` | `/refdata/external/v1/organisations/status/{status}` | `pui-organisation-manager`, `pui-finance-manager`, `pui-case-manager`, `pui-caa`, `pui-user-manager`, `citizen`, `caseworker` | Minimal org info by status with optional `?address=true` for contact details |
| `POST` | `/refdata/external/v1/organisations/addresses` | `pui-organisation-manager` | Add contact information (addresses) to caller's org |
| `DELETE` | `/refdata/external/v1/organisations/addresses` | `pui-organisation-manager` | Delete contact information addresses from caller's org |
| `GET` | `/refdata/external/v1/organisations/mfa` | None (permitAll) | MFA status lookup by `user_id` query param; excluded from security filter entirely (`SecurityConfiguration.java`) |

<!-- DIVERGENCE: Confluence (page 1228834096) says GET /status/{status} only needs citizen/caseworker roles, but source (OrganisationExternalController.java:336-337) shows it also accepts all pui-* and pui-caa roles. Source wins. -->

### External V2

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/refdata/external/v2/organisations` | S2S only | Self-register org with `orgType` and `orgAttributes` (status = `PENDING`) |
| `GET` | `/refdata/external/v2/organisations` | `pui-organisation-manager`, `pui-finance-manager`, `pui-case-manager`, `pui-caa`, `pui-user-manager` | Get caller's own org details with V2 response (includes `orgAttributes`) |
| `GET` | `/refdata/external/v2/organisations/pbas` | `pui-finance-manager`, `pui-user-manager`, `pui-organisation-manager`, `pui-case-manager` | Get PBAs for caller's org (V2 response format) |

### Key request/response types

**`OrganisationCreationRequest`** (v1 POST body):

```json
{
  "name": "Example Solicitors LLP",
  "sraId": "SRA123456",
  "sraRegulated": true,
  "companyNumber": "12345678",
  "companyUrl": "https://example.com",
  "superUser": {
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@example.com"
  },
  "paymentAccount": ["PBA1234567"],
  "contactInformation": [
    {
      "addressLine1": "1 High Street",
      "townCity": "London",
      "postCode": "SW1A 1AA"
    }
  ]
}
```

**`OrganisationResponse`** (create response):

```json
{
  "organisationIdentifier": "ABC1234"
}
```

The `organisationIdentifier` is a 7-character alphanumeric string matching `^[A-Z0-9]{7}$`, generated by `ProfessionalApiGenerator.generateUniqueAlphanumericId(7)`.

## User management endpoints

### Internal

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/refdata/internal/v1/organisations/{orgId}/users/` | `prd-admin` | Invite user to org; creates user profile in IDAM via `rd-user-profile-api` |
| `GET` | `/refdata/internal/v1/organisations/{orgId}/users` | `prd-admin`, `prd-aac-system` | List users in org. `prd-aac-system` callers always get ACTIVE-only filter |
| `PUT` | `/refdata/internal/v1/organisations/{orgId}/users/{userId}` | `prd-admin` | Modify user roles/status |
| `GET` | `/refdata/internal/v1/organisations/users` | S2S only (permitAll) | Refresh users endpoint. Supports `since`, `userId`, `pageSize`, `searchAfter` (UUID cursor) |
| `POST` | `/refdata/internal/v2/organisations/users` | S2S only | Bulk users by org identifiers list; paginated |

### External

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/refdata/external/v1/organisations/users/` | `pui-user-manager` | Invite user to caller's org |
| `GET` | `/refdata/external/v1/organisations/users` | `pui-finance-manager`, `pui-user-manager`, `pui-organisation-manager`, `pui-case-manager`, `caseworker-divorce-*`, `caseworker`, `pui-caa` | List users in caller's org. Without `pui-user-manager`, defaults to ACTIVE only. Supports `showDeleted`, `status`, `returnRoles` (default true), `page`, `size`, `userIdentifier` params |
| `PUT` | `/refdata/external/v1/organisations/users/{userId}` | `pui-user-manager` | Modify user roles/status; also updates `UserConfiguredAccess` |
| `GET` | `/refdata/external/v1/organisations/users/accountId` | `pui-finance-manager`, `pui-user-manager`, `pui-organisation-manager`, `pui-case-manager`, `caseworker-publiclaw-courtadmin` | Check if user exists in PRD (confirms user-org association). Query param: `email` |

### Key request/response types

**`NewUserCreationRequest`** (invite body):

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "roles": ["pui-case-manager"],
  "resendInvite": false
}
```

### User status model

PRD does not store a `status` column for users (dropped in V6 migration). Instead:

| Indicator | Meaning |
|-----------|---------|
| `deleted` column is `null` | User is active in PRD |
| `deleted` column has timestamp | User is soft-deleted |
| IDAM status (`ACTIVE` / `PENDING` / `SUSPENDED`) | Fetched on demand from `rd-user-profile-api`; stored as transient field |

The `userIdentifier` field is initially null and is only populated after the organisation is activated (for the super user) or after a successful invite call.

## PBA (Payment By Account) endpoints

### Internal

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `PUT` | `/refdata/internal/v1/organisations/{orgId}/pba/status` | `prd-admin` | Review PBA status (accept/reject). Supports partial success -- returns both succeeded and failed PBAs |
| `PUT` | `/refdata/internal/v1/organisations/{orgId}/pbas` | `prd-admin` | Edit PBA numbers belonging to org (identity change, not status) |
| `GET` | `/refdata/internal/v1/organisations/pbas` | `prd-admin` | Lookup PBAs by email (reads `UserEmail` header) |

### External

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/refdata/external/v1/organisations/pba` | `pui-finance-manager` | Add PBAs to caller's org (status = `PENDING`) |
| `DELETE` | `/refdata/external/v1/organisations/pba` | `pui-finance-manager` | Remove PBAs from caller's org |
| `GET` | `/refdata/external/v1/organisations/pbas` | PUI roles | Get PBAs for caller's org. Only `pui-finance-manager` can retrieve PBAs for a different org |

### PBA status lifecycle

| Status | Description |
|--------|-------------|
| `PENDING` | Default for all newly added PBAs |
| `ACCEPTED` | Approved by admin via `/pba/status` endpoint, or auto-approved when org is activated (`OrganisationServiceImpl.java:657-660`) |
| `REJECTED` | Rejected by admin via `/pba/status` endpoint |

PBA number format: exactly 10 characters, regex `(?i)pba\w{7}$` (e.g. `PBA1234567`). PBA uniqueness is global -- a PBA registered to one organisation cannot be registered to another (`PaymentAccountValidator.java:73-90`).

**`UpdatePbaRequest`** body:

```json
{
  "pbaRequestList": [
    {
      "pbaNumber": "PBA1234567",
      "status": "ACCEPTED",
      "statusMessage": "Verified against financial records"
    }
  ]
}
```

## Organisation status lifecycle

| Status | Transitions allowed | Notes |
|--------|-------------------|-------|
| `PENDING` | `ACTIVE`, `REVIEW`, `BLOCKED`, `DELETED` (via DELETE) | Initial state on creation |
| `REVIEW` | `ACTIVE`, `BLOCKED` | Set by admin PUT; same activation logic as PENDING |
| `ACTIVE` | `BLOCKED` | Cannot revert to PENDING/REVIEW (`OrganisationStatusValidatorImpl.java:46-52`) |
| `BLOCKED` | `ACTIVE` | Allowed by validator (no explicit block) |
| `DELETED` | None | Terminal state; cannot be amended |

On activation (`PENDING`/`REVIEW` to `ACTIVE`):
1. Super user is registered in IDAM via `UserProfileFeignClient.createUserProfile()` (`SuperController.java:370-388`)
2. `dateApproved` timestamp is set
3. All pending PBAs are bulk-accepted with `statusMessage = "Auto approved by Admin"` (`OrganisationServiceImpl.java:657-660`)

## Pagination conventions

| Style | Parameters | Used by |
|-------|-----------|---------|
| Offset-based | `page` (1-based), `size` (default from `DEFAULTPAGESIZE`, usually 10) | Internal list organisations, list users |
| Keyset | `searchAfter` (UUID cursor), `pageSize` | `getOrganisationsByProfile` (default 100), refresh users (default 20), bulk users |

Response headers include `total_records` for offset-based pagination. Keyset-paginated responses include `moreAvailable: true/false`.

## MFA (Multi-Factor Authentication) endpoints

PRD stores an MFA preference per organisation. The default is `EMAIL`. Possible values (from `MFAStatus` enum): `EMAIL`, `NONE`, `PHONE`, `AUTHENTICATOR`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/refdata/external/v1/organisations/mfa?user_id={userId}` | None (permitAll) | Retrieve MFA status for the organisation the given user belongs to. No bearer token required |
| `PUT` | `/refdata/internal/v1/organisations/{orgId}/mfa` | `prd-admin` | Update MFA preference for an organisation. Org must be `ACTIVE`; returns 400 if not |

**`MfaUpdateRequest`** body:

```json
{
  "mfa": "EMAIL"
}
```

Valid values: `EMAIL` (default), `NONE`, `PHONE`, `AUTHENTICATOR`.

<!-- CONFLUENCE-ONLY: Confluence (page 1496587803) notes that MFA was designed so the whole org opts in/out together, not individual users. The CTSC admin can update via PUT internal call. Not verified in source beyond the org-level entity model. -->

## Bulk Customer endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/refdata/internal/v1/bulkCustomer` | `caseworker-civil-admin` | Retrieve organisation details for a bulk customer ID |

**`BulkCustomerRequest`** body:

```json
{
  "bulkCustomerId": "BC123456",
  "idamId": "user-uuid-here"
}
```

Returns a `BulkCustomerOrganisationsDetailResponse` containing the organisations associated with the given bulk customer. Bulk customer details are loaded via a batch data-ingestion process (`BulkCustomerDetailsMapper`).

## UserConfiguredAccess

When modifying user roles via the external `PUT /refdata/external/v1/organisations/users/{userId}` endpoint, the system also updates `UserConfiguredAccess` records. These represent jurisdiction-level access grants:

| Column | Type | Description |
|--------|------|-------------|
| `PROFESSIONAL_USER_ID` | FK | Reference to the professional user |
| `jurisdiction_id` | String | Jurisdiction identifier |
| `organisation_profile_id` | String | Organisation profile identifier |
| `access_type_id` | String | Access type identifier |
| `enabled` | Boolean | Whether the access is active |

## Known consumers

<!-- CONFLUENCE-ONLY: Consumer lists sourced from Confluence (page 1228834096). Not exhaustively verified in source beyond the S2S allowlist. -->

| Endpoint group | Known consumers |
|----------------|----------------|
| Create/retrieve organisations | ExUI, FPL |
| Organisation by status (external) | AAC, FR, FinRem Case Orchestration |
| Add/list users | ExUI, FPLA, IAC, AAC |
| PBA by email (external) | FR, Divorce Frontend, CMC Legal Rep Frontend, IAC, Probate Backend |
| User account check (`/users/accountId`) | FPLA |
| Modify user roles | ExUI |

## Examples

### Organisation creation — external endpoint (`OrganisationExternalController.java`)

The registration endpoint requires only S2S authentication (no IDAM Bearer). It is declared `permitAll` in the security configuration.

```java
// Source: apps/rd/rd-professional-api/src/main/java/uk/gov/hmcts/reform/professionalapi/controller/external/OrganisationExternalController.java
@RequestMapping(path = "refdata/external/v1/organisations")
@RestController
public class OrganisationExternalController extends SuperController {

    @PostMapping(consumes = APPLICATION_JSON_VALUE, produces = APPLICATION_JSON_VALUE)
    @ResponseStatus(value = HttpStatus.CREATED)
    public ResponseEntity<OrganisationResponse> createOrganisationUsingExternalController(
            @Validated @NotNull @RequestBody OrganisationCreationRequest organisationCreationRequest) {
        return createOrganisationFrom(organisationCreationRequest);
    }
    // ...
}
```

### Flyway initial schema (`V1_1__init_tables.sql`)

```sql
// Source: apps/rd/rd-professional-api/src/main/resources/db/migration/V1_1__init_tables.sql
create schema if not exists dbrefdata;

create table organisation(
    id                    uuid,
    name                  varchar(255),
    status                varchar(50),
    sra_id                varchar(255),
    sra_regulated         boolean,
    company_number        varchar(8),
    company_url           varchar(512),
    organisation_identifier uuid,
    last_updated          timestamp not null,
    created               timestamp not null,
    constraint organisation_pk primary key (id),
    constraint organisation_identifier_uq1 unique (organisation_identifier)
);

create table payment_account(
    id              uuid not null,
    pba_number      varchar(255) not null,
    organisation_id uuid not null,
    constraint pba_number_uq unique (pba_number),
    constraint payment_account_pk primary key (id)
);
// ...
alter table payment_account add constraint organisation_fk2
    foreign key (organisation_id) references organisation (id);
```

### S2S allowlist (`application.yaml`)

```yaml
// Source: apps/rd/rd-professional-api/src/main/resources/application.yaml
idam:
  s2s-authorised:
    services: ${PRD_S2S_AUTHORISED_SERVICES:rd_professional_api,rd_user_profile_api,xui_webapp,finrem_payment_service,fpl_case_service,iac,aac_manage_case_assignment,divorce_frontend}
```

## See also

- [Professional Organisations](../explanation/professional-organisations.md) — explains the organisation lifecycle, PUI roles, PBA model, and MFA in depth
- [Register as S2S Caller](../how-to/register-as-s2s-caller.md) — step-by-step guide to being added to PRD's `PRD_S2S_AUTHORISED_SERVICES` allowlist
- [Query Reference Data](../how-to/query-reference-data.md) — practical HTTP examples for calling PRD endpoints with S2S and IDAM tokens
- [Glossary](glossary.md) — definitions of PRD, PBA, PUI role, `organisationIdentifier`, and `@OrgId` resolver

## Glossary

| Term | Definition |
|------|-----------|
| PRD | Professional Reference Data API (`rd-professional-api`) |
| PBA | Pay By Account -- a solicitor firm's payment account number (format `PBA` + 7 alphanumeric chars) |
| `organisationIdentifier` | 7-character alphanumeric external identifier for an organisation (not a UUID) |
| `userIdentifier` | The IDAM user UUID stored in PRD after successful registration |
| S2S | Service-to-service authentication via `ServiceAuthorization` JWT header |
| `@OrgId` resolver | Custom argument resolver that extracts the caller's organisation from their IDAM JWT on external endpoints |
| MFA | Multi-Factor Authentication preference stored per-organisation (default `EMAIL`) |
| `pui-caa` | Case Access Admin role; grants read access to external organisation/user endpoints |
| Bulk Customer | A grouping concept allowing civil admin to look up organisations by a shared customer identifier |
