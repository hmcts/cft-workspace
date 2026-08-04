# How-to guides

Goal-oriented recipes for engineers who already know the basics. Each page answers a single specific question.

## Workspace operations

- [Add a new repo to the workspace](add-a-repo.md)
- [Regenerate per-product CLAUDE.md taxonomy](regenerate-claude-mds.md) _(planned)_
- [Update yq, the CFT scripts, and the devcontainer features](update-tooling.md) _(planned)_

## CFT operations

- [Run a CCD definition import locally](run-a-ccd-import.md) _(planned)_
- [Debug an IDAM token](debug-idam-token.md) _(planned)_
- [Stand up a service against AAT](run-against-aat.md) _(planned)_

## Path to live

Deployment checklist for a new service. See [`path-to-live/`](path-to-live/README.md).

- [Front Door](path-to-live/front-door.md)
- [Load balancer configuration](path-to-live/load-balancer-configuration.md)
- [TLS certificates](path-to-live/tls-certificates.md)
- [Shutter solution](path-to-live/shutter.md)
- [Public DNS](path-to-live/public-dns.md)
- [OAT readiness](path-to-live/oat.md)

## New component

Standing up a brand-new microservice on CNP. See [`new-component/`](new-component/README.md).

- [Infrastructure as code](new-component/infrastructure-as-code.md)
- [GitHub repo](new-component/github-repo.md)
- [Helm chart](new-component/helm-chart.md)
- [GitOps / Flux](new-component/gitops-flux.md)
- [Feature flags](new-component/feature-flags.md)
- [Elasticsearch](new-component/elasticsearch.md)
- [Secrets management](new-component/secrets-management.md)

## Common pipeline

Build/release using the shared CNP pipeline. See [`common-pipeline/`](common-pipeline/README.md).

- [Common pipeline overview](common-pipeline/overview.md)
- [Publishing a Java library](common-pipeline/publish-java-library.md)
- [Publishing a Node.js library](common-pipeline/publish-nodejs-library.md)

## CNP guides

- [Application Gateway WAF (AFD/WAF)](afd-waf.md)
- [Automated dependency updates](automated-dependency-updates.md)
- [Connect via VPN](connect-via-vpn.md)
- [Create a new subscription](creating-a-new-subscription.md)
- [Federated credentials](federated-credentials.md)
- [Flyway database migrations](flyway-database-migrations.md)
- [Manage manual Key Vault secrets](managing-manual-key-vault-secrets.md)
- [PostgreSQL single→flexible migration (DMS)](postgresql-singleserver-to-flexibleserver-migration-dms.md)
- [PostgreSQL single→flexible migration (Portal)](postgresql-singleserver-to-flexibleserver-migration-portal.md)
- [Profile a Java app in AKS](profile-java-app-in-aks.md)
- [PR URL preview environments](pr-url.md)
- [Publishing container images to ACR from GitHub Actions](publishing-acr-images.md)
- [Update Redis to zone-redundant](update-redis-with-zone-redundant.md)

## Environments

- [Auto-shutdown](auto-shutdown.md)
- [Sandbox cleardown](sandbox-cleardown.md)
- [External IP addresses](external-ip-addresses.md)

## Troubleshooting

- [Troubleshooting runbook](troubleshooting.md) — GitHub, Jenkins, AKS, VPN, Flux, scaling.

Pages marked _(planned)_ don't exist yet — feel free to add them as you write the recipe yourself the first time. Keep each one under 200 lines; if a recipe exceeds that, it's probably an explanation in disguise.
