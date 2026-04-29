---
service: dtsse
ccd_based: false
ccd_config: none
ccd_features: []
integrations: []
repos:
  - apps/dtsse/expressjs-monorepo-template
---

# DTSSE — Express.js Monorepo Template

A production-ready Node.js monorepo template published by HMCTS's Developer Tools & Shared Services Engineering (DTSSE) team. It gives service teams a pre-wired starting point for building accessible, secure, and scalable GOV.UK digital services using Express 5.x, TypeScript, and the GOV.UK Design System — without having to assemble the stack from scratch.

## Repos

- `apps/dtsse/expressjs-monorepo-template` — the template monorepo; teams clone or instantiate it via an `init.sh` script to create their own service

## Architecture

The template ships as a Yarn-workspace monorepo managed by Turborepo. It contains two deployable Express 5 apps (`apps/web` and `apps/api`), a cron runner (`apps/crons`), and a Prisma-based database migration runner (`apps/postgres`). Six internal workspace libraries — `@hmcts/cloud-native-platform`, `@hmcts/express-govuk-starter`, `@hmcts/postgres-prisma`, `@hmcts/simple-router`, `@hmcts/footer-pages`, and `@hmcts/onboarding` — encapsulate cross-cutting concerns and are consumed by the apps via `workspace:*` references.

At runtime the web frontend (port 3000) serves GOV.UK-styled Nunjucks pages and stores sessions in Redis. The API server (port 3001) handles data operations backed by PostgreSQL via Prisma. Both apps wire in feature modules from the `libs/` tree, where each module exposes `pageRoutes`, `apiRoutes`, `prismaSchemas`, and `assets` config entry points to avoid circular dependencies during Prisma client generation.

Infrastructure is managed with Terraform (Azure Postgres, Redis, Key Vault, App Insights) and deployed via Helm charts to AKS. The CI/CD pipeline uses GitHub Actions with stages for build, infrastructure, deploy to AAT, smoke test, E2E (Playwright), promotion of images, and cleanup of ephemeral preview releases.

## External integrations

This is a template, not a live service, so no HMCTS platform integrations (IDAM, S2S, CCD, etc.) are wired in by default. Service teams add those when instantiating the template. The infrastructure layer does use:

- Azure Application Insights — telemetry via `applicationinsights` package in `@hmcts/cloud-native-platform`
- Azure Key Vault — secrets management via `@azure/keyvault-secrets` in `@hmcts/cloud-native-platform`
- Azure Database for PostgreSQL — provisioned in `infrastructure/postgres.tf`
- Redis — session store, provisioned in `infrastructure/redis.tf`

## Notable conventions and quirks

- Teams initialise a new service by running `./.github/scripts/init.sh`, which prompts for team and product name, replaces all template tokens throughout the codebase, then removes itself.
- The monorepo uses Prisma with a schema-discovery step (`libs/postgres-prisma/src/collate-schema.ts`) that aggregates per-module Prisma schema files before generating the client — feature modules contribute their own `prisma/` folders.
- CI uses GitHub Actions (not the HMCTS CNP Jenkins pipeline), so there is no `Jenkinsfile_CNP` or `Jenkinsfile_Pipeline`.
- Asset compilation uses Vite; the `apps/web` build distinguishes `production` vs `default` export conditions via `NODE_OPTIONS='--conditions=production'`.
- The `workflow.claude.yml` workflow runs AI-powered security scans via Claude as part of the PR pipeline.
