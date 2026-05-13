---
title: Register As S2s Caller
topic: architecture
diataxis: how-to
product: rd
audience: both
sources:
  - rd-professional-api:src/main/resources/application.yaml
  - rd-professional-api:src/main/java/uk/gov/hmcts/reform/professionalapi/configuration/SecurityConfiguration.java
  - rd-judicial-api:src/main/resources/application.yaml
  - rd-caseworker-ref-api:src/main/resources/application.yaml
  - rd-location-ref-api:src/main/resources/application.yaml
  - rd-commondata-api:src/main/resources/application.yaml
  - rd-user-profile-api:src/main/resources/application.yaml
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
examples_extracted_from:
  - apps/rd/rd-professional-api/src/main/resources/application.yaml
  - apps/rd/rd-professional-api/src/main/java/uk/gov/hmcts/reform/professionalapi/configuration/SecurityConfiguration.java
confluence:
  - id: "1457299643"
    title: "Integration of new services with PRD (Professional Reference Data)"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1478697187"
    title: "New Service Integration with existing PRD APIs - Operational Model"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1228834096"
    title: "PRD Endpoints - Roles and Pre-Requisites for Access"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1393623404"
    title: "Raising a PRD Request or Issue"
    last_modified: "unknown"
    space: "RTRD"
  - id: "1460567946"
    title: "Performance Requirements for PRD APIs"
    last_modified: "unknown"
    space: "RTRD"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- Every RD API restricts callers via an S2S allowlist declared in `application.yaml` as `idam.s2s-authorised.services`.
- To authorise a new service, raise an RDCC JIRA ticket specifying your S2S microservice name and target API NFRs, then notify `#ref-data-support` on Slack.
- The RD team manages the allowlist -- they add your service name to the relevant environment variable and deploy.
- Some PRD endpoints (organisation creation) require only S2S; most also require an IDAM Bearer token with specific roles.
- The allowlist is environment-specific; prod whitelisting requires release-team confirmation and follows a staged rollout (AAT first, then prod).
- Changes take effect only after redeployment; no hot-reload.

## Prerequisites

- Your service already has an S2S microservice identity registered with `rpe-service-auth-provider` (i.e., it can obtain a `ServiceAuthorization` JWT).
- You know the exact microservice name your service uses (underscored, lowercase, e.g. `my_new_service`). This must match the `subject` claim in the S2S JWT your service produces.
- You have access to the Helm chart values or FluxCD config for the target RD API in the environment you are deploying to.
- You have identified which PRD/RD API endpoints you will consume and the IDAM roles your users will need (see [Endpoint security requirements](#endpoint-security-requirements) below).

## Steps

### 1. Identify the target RD API and its environment variable

Each RD API declares its S2S allowlist under `idam.s2s-authorised.services` in `application.yaml`. The value is overridden by an environment variable in deployed environments.

| RD API | Env var | Default allowlist (dev/AAT) | Config location |
|--------|---------|----------------------------|-----------------|
| `rd-professional-api` | `PRD_S2S_AUTHORISED_SERVICES` | `rd_professional_api,rd_user_profile_api,xui_webapp,finrem_payment_service,fpl_case_service,iac,aac_manage_case_assignment,divorce_frontend` | `application.yaml:113` |
| `rd-judicial-api` | `JRD_S2S_AUTHORISED_SERVICES` | `rd_judicial_api,am_org_role_mapping_service,iac,xui_webapp` | `application.yaml:116` |
| `rd-caseworker-ref-api` | `CRD_S2S_AUTHORISED_SERVICES` | `rd_caseworker_ref_api,am_org_role_mapping_service,iac,xui_webapp,rd_profile_sync` | `application.yaml:112` |
| `rd-location-ref-api` | `LRD_S2S_AUTHORISED_SERVICES` | `rd_location_ref_api,payment_app,rd_caseworker_ref_api,rd_judicial_api` | `application.yaml:94` |
| `rd-commondata-api` | `CRD_S2S_AUTHORISED_SERVICES` | `rd_commondata_api` | `application.yaml:103` |
| `rd-user-profile-api` | `PRD_S2S_AUTHORISED_SERVICES` | `rd_professional_api,rd_user_profile_api,rd_profile_sync,rd_caseworker_ref_api` | `application.yaml:107` |

> **Note:** `rd-commondata-api` reuses the `CRD_S2S_AUTHORISED_SERVICES` env var name (same as `rd-caseworker-ref-api`). In deployed environments these are configured independently per service's Helm chart.

### 2. Raise an RDCC JIRA ticket

<!-- CONFLUENCE-ONLY: not verified in source -->

The Reference Data team manages the S2S allowlist centrally. To request whitelisting:

1. Create a JIRA ticket on the **RDCC (Reference Data Common Capability)** board:
   - **Issue Type:** Task
   - **Summary:** `[Environment] - Whitelist <your_service_name> for <target RD API>`
   - **Description:** Include your S2S microservice name, which RD API(s) you will call, and the volumetric NFRs (estimated daily/weekly/monthly call volume and max concurrent requests) for each endpoint.
2. Post the JIRA ticket link in the **`#ref-data-support`** Slack channel.
3. For production whitelisting, a confirmation from the release team is required before the RD team proceeds.

The RD team follows a staged operational model:

| Step | Description | Ownership |
|------|-------------|-----------|
| 1 | Analyse API consumption requirement; identify if additional IDAM roles are needed | Service team (validate design in PDG/IA) |
| 2 | Get performance-team sign-off on NFRs for the requested endpoint(s) | RD team coordinates with Performance |
| 3 | Whitelist service in Demo/AAT and perform integration testing | RD team whitelists; service team tests |
| 4 | (Optional) Write PACT contract tests for the consuming APIs | Service team |
| 5 | Whitelist service in PROD (after steps 1-4 complete) | RD team |

### 3. Add your service name to the Helm chart values

Once the RD team approves, the allowlist change is made in the deployment config. For `rd-professional-api`, the environment variable is `PRD_S2S_AUTHORISED_SERVICES`. The service name is appended (comma-separated, no spaces) to the existing list:

```yaml
# Example: values.aat.yaml or values.prod.yaml in the FluxCD/Helm config
java:
  environment:
    PRD_S2S_AUTHORISED_SERVICES: "rd_professional_api,rd_user_profile_api,xui_webapp,finrem_payment_service,fpl_case_service,iac,aac_manage_case_assignment,divorce_frontend,my_new_service"
```

If you are also running locally or in integration tests, update `src/main/resources/application.yaml` in the target RD API repo:

```yaml
idam:
  s2s-authorised:
    services: ${PRD_S2S_AUTHORISED_SERVICES:rd_professional_api,rd_user_profile_api,xui_webapp,...,my_new_service}
```

### 4. Deploy the target RD API

After the PR is merged, the next deployment of the RD API picks up the updated environment variable. The `ServiceAuthFilter` (from `service-auth-provider-java-client`) reads the allowlist on startup and is added to the filter chain before `BearerTokenAuthenticationFilter` (`SecurityConfiguration.java:87`).

There is no hot-reload; the pod must restart for the new value to take effect.

### 5. (Optional) Update local integration test config

The integration test config at `src/integrationTest/resources/application.yml` typically has a minimal allowlist (e.g. only `rd_professional_api`). If you need your service to appear in integration tests for cross-service scenarios, add it there as well:

```yaml
# src/integrationTest/resources/application.yml
idam:
  s2s-authorised:
    services: rd_professional_api,my_new_service
```

## Endpoint security requirements

PRD endpoints use two layers of security. The `ServiceAuthFilter` validates the S2S token against the allowlist for all requests. Then, depending on the endpoint, Spring Security may additionally require an IDAM Bearer token with specific roles.

**S2S-only endpoints** (no IDAM Bearer required -- marked `permitAll` in `SecurityConfiguration.java`):

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/refdata/external/v1/organisations` | Create (register) an organisation |
| POST | `/refdata/internal/v1/organisations` | Create an organisation (internal) |
| POST | `/refdata/external/v2/organisations` | Create an organisation (v2) |
| POST | `/refdata/internal/v2/organisations` | Create an organisation (v2 internal) |
| GET | `/refdata/internal/v1/organisations/users` | Retrieve users (internal) |
| POST | `/refdata/internal/v1/organisations/getOrganisationsByProfile` | Get orgs by profile |
| POST | `/refdata/internal/v2/organisations/users` | Retrieve users (v2 internal) |

**S2S + Bearer token endpoints** (most other endpoints) require one of these IDAM roles:

| Role | Purpose |
|------|---------|
| `prd-admin` | Internal admin operations (approve/delete orgs, retrieve all orgs, edit PBAs) |
| `pui-organisation-manager` | External org management |
| `pui-finance-manager` | PBA/payment account access |
| `pui-case-manager` | Case-related org queries |
| `pui-user-manager` | User management within an org |
| `pui-caa` | Case access administrator |

> Even S2S-only endpoints still require a valid S2S token from a whitelisted service. The "permitAll" designation only means no Bearer/IDAM validation is performed -- the `ServiceAuthFilter` still runs.

## Verify

1. Obtain an S2S token for your service from `rpe-service-auth-provider` in the target environment:

   ```bash
   curl -X POST https://rpe-service-auth-provider-aat.service.core-compute-aat.internal/testing-support/lease \
     -H "Content-Type: application/json" \
     -d '{"microservice": "my_new_service"}'
   ```

2. Call a PRD endpoint using that token in the `ServiceAuthorization` header:

   ```bash
   curl -i https://rd-professional-api-aat.service.core-compute-aat.internal/refdata/internal/v1/organisations \
     -H "ServiceAuthorization: Bearer <s2s-token>" \
     -H "Authorization: Bearer <idam-token>"
   ```

3. Confirm you receive a `200 OK` (or the expected business response) rather than `401 Unauthorized` or `403 Forbidden`. A 403 from `ServiceAuthFilter` means the service name is not in the allowlist.

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| `403 Forbidden` with no body | `ServiceAuthFilter` rejected the S2S token -- your service name is not in the allowlist or the token is expired. |
| `401 Unauthorized` | The S2S token itself is invalid (wrong secret, wrong S2S provider URL). This is an S2S registration issue, not an allowlist issue. |
| Works in AAT but not prod | The production values file was not updated -- the allowlist is environment-specific. |
| Integration tests fail with 403 | The test `application.yml` has a separate, more restrictive allowlist (`src/integrationTest/resources/application.yml:51`). |
| `403` with valid S2S but missing role | The endpoint requires an IDAM Bearer token with a specific role (e.g. `prd-admin`). S2S whitelisting alone is insufficient for role-protected endpoints. |

## Example

### `application.yaml` — S2S allowlist declaration

The env-var default is the development/AAT list. Production extends it via Flux chart values.

```yaml
// Source: apps/rd/rd-professional-api/src/main/resources/application.yaml
idam:
  s2s-auth:
    microservice: rd_professional_api
    url: ${S2S_URL:http://rpe-service-auth-provider-aat.service.core-compute-aat.internal}
  s2s-authorised:
    services: ${PRD_S2S_AUTHORISED_SERVICES:rd_professional_api,rd_user_profile_api,xui_webapp,finrem_payment_service,fpl_case_service,iac,aac_manage_case_assignment,divorce_frontend}
```

### `SecurityConfiguration.java` — filter chain wiring

`ServiceAuthFilter` runs before `BearerTokenAuthenticationFilter`. The `permitAll()` paths skip IDAM bearer-token checking but still require a valid S2S token.

```java
// Source: apps/rd/rd-professional-api/src/main/java/uk/gov/hmcts/reform/professionalapi/configuration/SecurityConfiguration.java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        // S2S filter runs first, before the Bearer token filter
        .addFilterBefore(serviceAuthFilter, BearerTokenAuthenticationFilter.class)
        .authorizeHttpRequests(a -> a
            // S2S-only paths: no IDAM Bearer token required
            .requestMatchers(HttpMethod.POST, "/refdata/external/v1/organisations").permitAll()
            .requestMatchers(HttpMethod.POST, "/refdata/internal/v1/organisations").permitAll()
            .requestMatchers(HttpMethod.GET,  "/refdata/internal/v1/organisations/users").permitAll()
            .requestMatchers(HttpMethod.POST,
                    "/refdata/internal/v1/organisations/getOrganisationsByProfile").permitAll()
            // all other paths require IDAM Bearer token
            .anyRequest().authenticated())
        .oauth2ResourceServer(a -> a
            .jwt(j -> j.jwtAuthenticationConverter(jwtAuthenticationConverter)));
    return http.build();
}
```

### Helm chart values override (example)

```yaml
// Illustrative — actual file is in cnp-flux-config/apps/rd/rd-professional-api/values.prod.yaml
java:
  environment:
    PRD_S2S_AUTHORISED_SERVICES: >-
      rd_professional_api,rd_user_profile_api,xui_webapp,
      finrem_payment_service,fpl_case_service,iac,
      aac_manage_case_assignment,divorce_frontend,my_new_service
```

## See also

- [Architecture](../explanation/architecture.md) — explains the two-layer auth model (S2S + IDAM OAuth2) applied across all six RD APIs
- [Overview](../explanation/overview.md) — describes the full integration onboarding process (JIRA, performance sign-off, staged whitelisting)
- [Query Reference Data](query-reference-data.md) — what to call once your service is whitelisted; HTTP examples for every RD API
- [Glossary](../reference/glossary.md) — definitions of S2S, IDAM, and the `cnp-flux-config` GitOps repository
