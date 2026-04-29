---
service: idam
ccd_based: false
ccd_config: none
ccd_features: []
integrations:
  - s2s
  - notify
  - flyway
repos:
  - apps/idam/idam-api
  - apps/idam/idam-web-public
---

# IDAM

IDAM (Identity and Access Management, also known as Strategic IDAM or SIDAM) is the centralised authentication and authorisation platform for HMCTS Reform services. It manages user accounts, roles, OAuth 2.0 / OIDC sessions, and service registrations across the entire CFT ecosystem. Rather than being a CCD-based service itself, IDAM is the platform that every other CFT service authenticates against.

## Repos

- `apps/idam/idam-api` — Spring Boot REST API providing user management, OIDC/OAuth 2.0 token endpoints, role management, and service registration. Acts as the authoritative identity store backed by ForgeRock AM/IDM and a PostgreSQL database.
- `apps/idam/idam-web-public` — Spring Boot MVC web application providing the public-facing login, registration, and password reset UI that end users and citizen applicants interact with.

## Architecture

At runtime, `idam-web-public` is the browser-facing entry point. It listens on port 8080 (exposed via AKS ingress) and proxies OIDC endpoints through a Netflix Zuul reverse proxy to `idam-api` (`strategic.service.url`). The web app holds a Redis-backed session store (`spring-session-data-redis`) and delegates all authentication, user lookup, and token operations to `idam-api` over HTTP.

`idam-api` listens on port 5000 and is a multi-module Gradle project: the root project includes `idam-spi` (interfaces), `idam-spi-forgerock` (ForgeRock AM/IDM clients), and `idam-api` (the Spring Boot application). The API communicates with ForgeRock AM over HTTPS for OAuth 2.0 token issuance and session management, and with ForgeRock IDM for user account CRUD. It uses a local PostgreSQL database (with Flyway migrations under `idam-api/src/main/resources/db/migration/`) for service registrations, invitations, and supplementary state.

`idam-api` uses S2S (`service-auth-provider-java-client`) to authenticate inter-service calls and emits user lifecycle events (activations, updates, deletions) to an Azure Service Bus topic when event publishing is enabled — in-process ActiveMQ/Artemis is used on PR environments as a drop-in replacement.

## External integrations

- `s2s`: `idam-api` pulls `com.github.hmcts:service-auth-provider-java-client:5.3.3`; S2S secret is configured via `idam.s2s-auth.*` in `application.yaml`. Also used by `idam-web-public` functional tests (configured via `RPE_AUTH_URL` in `Jenkinsfile_CNP`).
- `notify`: `idam-api` uses the GOV.UK Notify Java client (`libs.notify.client`) to send emails for duplicate registration, password reset for SSO users, and email-address change notifications. Template IDs are configured under the `notify.template.*` namespace in `application.yaml`.
- `flyway`: Flyway migrations are in `idam-api/idam-api/src/main/resources/db/migration/`. The Flyway plugin (`org.flywaydb.flyway:12.3.0`) runs the `migrateDb` task; the Jenkinsfile invokes `migratePostgresDatabase` as a pipeline stage.

## Notable conventions and quirks

- `idam-api` is a multi-module Gradle project with its own subproject directory structure (`idam-api/idam-api/`, `idam-api/idam-spi-forgerock/`). The Docker image is built from the root and packages only the `idam-api` subproject JAR, exposed on port 5000.
- `idam-web-public` ships a WAR rather than a JAR (`apply plugin: 'war'`); its Docker image adds the `.war` file and activates `docker,local` Spring profiles at startup.
- SSO federation supports two external identity providers at runtime: eJudiciary (Azure AD) and MoJ Azure AD, configured in `application.yaml` under `strategic.sso.providers`. The feature flag `features.federated-s-s-o` in `idam-web-public` controls whether SSO is active.
- Event publishing to Azure Service Bus is disabled by default (`featureFlags.eventPublishing.enabled: false`); PR environments substitute embedded ActiveMQ/Artemis automatically.
- Both pipelines sync `demo`, `perftest`, `ithc`, and `nightly-dev` branches from `master` via `syncBranchesWithMaster`.
- The Log and Audit integration (`lau`) for recording IDAM logon events is configured in `idam-api` but disabled by default (`LOG_AND_AUDIT_IDAM_ENABLED: false`).
