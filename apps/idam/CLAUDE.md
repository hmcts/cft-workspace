---
service: idam
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - s2s
  - notify
  - flyway
  - rd
repos:
  - apps/idam/idam-api
  - apps/idam/idam-web-public
  - apps/idam/idam-user-dashboard
  - apps/idam/idam-user-profile-bridge
  - apps/idam/idam-testing-support-api
  - apps/idam/idam-health-checker
  - apps/idam/idam-forgerock-http-client
---

# IDAM

IDAM (Identity and Access Management, also known as Strategic IDAM or SIDAM) is the centralised authentication and authorisation platform for HMCTS Reform services. It manages user accounts, roles, OAuth 2.0 / OIDC sessions, and service registrations across the entire CFT ecosystem. IDAM is a shared platform component — it is not CCD-based, but every other CFT service authenticates against it.

## Repos

- `apps/idam/idam-api` — Spring Boot REST API providing user management, OIDC/OAuth 2.0 token endpoints, role management, and service registration. Backed by ForgeRock AM/IDM and a PostgreSQL database.
- `apps/idam/idam-web-public` — Spring Boot MVC web application providing the public-facing login, registration, and password reset UI for end users and citizen applicants.
- `apps/idam/idam-user-dashboard` — Node.js/Express/TypeScript admin dashboard replacing the legacy `idam-web-admin`, focused on user management for caseworkers and service admins.
- `apps/idam/idam-user-profile-bridge` — Spring Boot service that consumes Azure Service Bus user lifecycle events from `idam-api` and syncs user profile data into Reference Data (`rd-userprofile-api`, `rd-caseworker-api`, `rd-judicial-api`).
- `apps/idam/idam-testing-support-api` — Spring Boot service providing test-data lifecycle management for automated tests — creates users/roles/services and cleans them up on session expiry.
- `apps/idam/idam-health-checker` — Spring Boot health monitoring service for the underlying ForgeRock AM, IDM, and DS (Directory Store) infrastructure. Deployed co-located with ForgeRock VMs.
- `apps/idam/idam-forgerock-http-client` — Gradle library containing Feign HTTP clients generated from ForgeRock AM and IDM OpenAPI specs. Consumed by `idam-api`.

## Architecture

At runtime, `idam-web-public` is the browser-facing entry point. It listens on port 8080 and acts as a Zuul reverse proxy that routes OIDC endpoints to `idam-api` (`STRATEGIC_SERVICE_URL`). The web app holds a Redis-backed session store and delegates all authentication, user lookup, and token operations to `idam-api` over HTTP. `idam-user-dashboard` is a separate Node.js admin UI (port 3100) that connects to both `idam-api` (user CRUD) and `idam-web-public` (OIDC login for the admin session) via `STRATEGIC_SERVICE_URL` and `STRATEGIC_PUBLIC_URL` environment variables.

`idam-api` listens on port 5000 and is a multi-module Gradle project (`idam-spi`, `idam-spi-forgerock`, `idam-api`). It communicates with ForgeRock AM over HTTPS for OAuth 2.0 token issuance and session management, and with ForgeRock IDM for user account CRUD. It persists service registrations, invitations, and supplementary state in PostgreSQL (Flyway-managed). User lifecycle events (create, update, delete) are published to Azure Service Bus topics; on PR environments embedded ActiveMQ/Artemis substitutes for Azure Service Bus automatically.

`idam-user-profile-bridge` subscribes to three Azure Service Bus topics (`idam-add-user`, `idam-modify-user`, `idam-remove-user`) and mirrors users into Reference Data services (`rd-userprofile-api`, `rd-caseworker-api`, `rd-judicial-api`) over Feign clients authenticated via OIDC client credentials. `idam-testing-support-api` provides a REST API (port 5000) for test harnesses to create users/roles/service providers and register them for automatic cleanup; it uses its own PostgreSQL database (Flyway-managed) and Redis for session storage and rate limiting.

`idam-health-checker` is not deployed in AKS — it is deployed directly on the ForgeRock VMs and probes ForgeRock AM (isAlive, password grant), IDM (ping, LDAP connectivity), and DS User/Token Store (LDAP replication, entry counts) via Spring Health framework. Results are reported at `http://<fqdn>:9292/admin/health`. `idam-forgerock-http-client` is a library artefact that `idam-api` depends on; it is not deployed independently.

## External integrations

- `s2s`: `idam-api` and `idam-user-profile-bridge` both pull `com.github.hmcts:service-auth-provider-java-client`. S2S is used for inter-service validation of calls from other CFT services. `idam-testing-support-api` also uses S2S (`s2sTestingSupportEnabled` flag).
- `notify`: `idam-api` uses `uk.gov.service.notify:notifications-java-client` to send emails for duplicate registration, SSO-user password reset, and email-address change. `idam-testing-support-api` also declares the Notify client (`notifications-java-client:6.0.0-RELEASE`).
- `flyway`: `idam-api` manages the main identity database via Flyway (`db/migration/`). `idam-testing-support-api` manages its own test-data database via Flyway (`db/migration/`). The Jenkins pipeline runs `migratePostgresDatabase` for both.
- `rd`: `idam-user-profile-bridge` calls `rd-userprofile-api`, `rd-caseworker-api`, and `rd-judicial-api` to propagate IDAM user records into Reference Data. `idam-testing-support-api` also calls `rd-userprofile-api` for test-user cleanup.

## Notable conventions and quirks

- `idam-api` is a multi-module Gradle project: the Docker image packages only the `idam-api` subproject JAR at port 5000; source sits under `idam-api/idam-api/`.
- `idam-web-public` ships a WAR (not JAR) — `apply plugin: 'war'` — and activates `docker,local` Spring profiles at startup in Docker.
- SSO federation supports two external identity providers (eJudiciary Azure AD, MoJ Azure AD); the `features.federated-s-s-o` flag in `idam-web-public` controls the UI.
- Event publishing to Azure Service Bus is disabled by default in `idam-api` (`featureFlags.eventPublishing.enabled: false`); PR environments substitute embedded ActiveMQ/Artemis automatically via `application-events-in-memory.yaml`.
- `idam-health-checker` is not an AKS service — it is deployed to ForgeRock VMs and built via `gradle bootJar` then pushed to blob storage by `idam-forgerock-config`.
- `idam-forgerock-http-client` does not publish generated sources directly from `build/src/generated/java`; generated code is a draft only, manually merged into `src/main/java` before committing and publishing.
- `idam-user-dashboard` uses LaunchDarkly feature flags (`LAUNCHDARKLY_SDK_KEY`) and GOV.UK Notify (`NOTIFY_API_KEY`) in its functional test suite.
- Both `idam-api` and `idam-web-public` pipelines sync `demo`, `perftest`, `ithc`, and `nightly-dev` branches from `master` via `syncBranchesWithMaster`.
- The Log and Audit integration (`lau`) for IDAM logon events is configured in `idam-api` but disabled by default (`LOG_AND_AUDIT_IDAM_ENABLED: false`).
