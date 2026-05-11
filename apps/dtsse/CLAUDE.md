---
service: dtsse
ccd_based: false
ccd_config: none
ccd_features: []
integrations: []
api_specs: []
repos:
  - apps/dtsse/expressjs-monorepo-template
---

# DTSSE — Express.js Monorepo Template

A production-ready Node.js monorepo template published by HMCTS's Developer Tools & Shared Services Engineering (DTSSE) team. It gives service teams a pre-wired starting point for building accessible, secure, and scalable GOV.UK digital services using Express 5.x, TypeScript, and the GOV.UK Design System — without having to assemble the stack from scratch.

## Repos

- `apps/dtsse/expressjs-monorepo-template` — the template monorepo; teams instantiate it via `.github/scripts/init.sh` to scaffold their own service

## Architecture

The template ships as a Yarn-workspace monorepo managed by Turborepo. It contains two deployable Express 5 apps (`apps/web`, port 3000 and `apps/api`, port 3001), a cron runner (`apps/crons`), and a Prisma-based database migration runner (`apps/postgres`). Five internal workspace libraries provide cross-cutting concerns: `@hmcts/cloud-native-platform` (Azure Key Vault, App Insights, health probes, properties volume), `@hmcts/express-govuk-starter` (GOV.UK Frontend, Nunjucks, i18n, session handling, Helmet CSP), `@hmcts/postgres-prisma` (Prisma client with multi-file schema collation), `@hmcts/simple-router` (file-system-based Express router, published to npm), and `@hmcts/onboarding` (template-specific welcome flows).

The web frontend serves GOV.UK-styled Nunjucks pages and stores sessions in Redis. The API server handles data operations backed by PostgreSQL via Prisma. Feature libs under `libs/` hold domain logic only; route handlers and page templates live in the consuming apps. The Prisma schema is assembled from per-module `.prisma` files under `libs/postgres-prisma/prisma/schema/` via a collation step before client generation.

Infrastructure is managed with Terraform (Azure Postgres, Redis, Key Vault, App Insights) and deployed via Helm to AKS. CI/CD uses GitHub Actions (not the HMCTS CNP Jenkins pipeline) with a Turborepo-driven pipeline: build, infrastructure, deploy to AAT, smoke test, Playwright E2E, image promotion, and cleanup of preview environments.

## External integrations

No HMCTS platform integrations (IDAM, S2S, CCD, etc.) are wired in the template itself — service teams add those when instantiating it. The built-in infrastructure layer uses:

- **Azure Application Insights** — telemetry via `applicationinsights` package in `@hmcts/cloud-native-platform`
- **Azure Key Vault** — secrets management via `@azure/keyvault-secrets` in `@hmcts/cloud-native-platform`
- **Azure Database for PostgreSQL** — provisioned in `infrastructure/postgres.tf`
- **Redis** — session store provisioned in `infrastructure/redis.tf`

## Notable conventions and quirks

- Teams initialise a new service by running `./.github/scripts/init.sh`, which prompts for team and product name, replaces all template tokens throughout the codebase, rebuilds the yarn lockfile, runs tests, then removes itself.
- `@hmcts/simple-router` is the only workspace library published to npm. Releases use the Changesets workflow (`.github/workflows/workflow.release.yml`), which opens a "Version Packages" PR and publishes with provenance attestation on merge.
- The repo uses GitHub Actions exclusively; there is no `Jenkinsfile_CNP` or `Jenkinsfile_Pipeline`. This is unusual among HMCTS service repos.
- A `workflow.claude.yml` GitHub Actions workflow runs AI-powered security scans on PRs via Claude.
- Prisma client generation is driven by a schema-discovery script (`libs/postgres-prisma/src/collate-schema.ts`) that aggregates per-module `.prisma` files before running `prisma generate` — feature modules contribute their own schema fragments.
- Turborepo `dev` tasks are declared `persistent: true`; each lib runs `tsc --watch` continuously and app nodemon watches `../../libs/*/dist` so restarts happen on compiled output, not source changes.
