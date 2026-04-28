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

- [Front Door](path-to-live/front-door.md) _(planned)_
- [Load balancer configuration](path-to-live/load-balancer-configuration.md) _(planned)_
- [TLS certificates](path-to-live/tls-certificates.md) _(planned)_
- [Shutter solution](path-to-live/shutter.md) _(planned)_
- [Public DNS](path-to-live/public-dns.md) _(planned)_
- [OAT readiness](path-to-live/oat.md) _(planned)_

## New component

Standing up a brand-new microservice on CNP. See [`new-component/`](new-component/README.md).

- [Infrastructure as code](new-component/infrastructure-as-code.md) _(planned)_
- [GitHub repo](new-component/github-repo.md) _(planned)_
- [Helm chart](new-component/helm-chart.md) _(planned)_
- [GitOps / Flux](new-component/gitops-flux.md) _(planned)_
- [Feature flags](new-component/feature-flags.md) _(planned)_
- [Elasticsearch](new-component/elasticsearch.md) _(planned)_
- [Secrets management](new-component/secrets-management.md) _(planned)_

## Common pipeline

Build/release using the shared CNP pipeline. See [`common-pipeline/`](common-pipeline/README.md).

- [Common pipeline overview](common-pipeline/overview.md) _(planned)_
- [Publishing a Java library](common-pipeline/publish-java-library.md) _(planned)_
- [Publishing a Node.js library](common-pipeline/publish-nodejs-library.md) _(planned)_

## CNP guides

- [Application Gateway WAF (AFD/WAF)](afd-waf.md) _(planned)_
- [Automated dependency updates](automated-dependency-updates.md) _(planned)_
- [Connect via VPN](connect-via-vpn.md) _(planned)_
- [Create a new subscription](creating-a-new-subscription.md) _(planned)_
- [Federated credentials](federated-credentials.md) _(planned)_
- [Flyway database migrations](flyway-database-migrations.md) _(planned)_
- [Manage manual Key Vault secrets](managing-manual-key-vault-secrets.md) _(planned)_
- [PostgreSQL single→flexible migration (DMS)](postgresql-singleserver-to-flexibleserver-migration-dms.md) _(planned)_
- [PostgreSQL single→flexible migration (Portal)](postgresql-singleserver-to-flexibleserver-migration-portal.md) _(planned)_
- [Profile a Java app in AKS](profile-java-app-in-aks.md) _(planned)_
- [PR URL preview environments](pr-url.md) _(planned)_
- [Update Redis to zone-redundant](update-redis-with-zone-redundant.md) _(planned)_

## Environments

- [Auto-shutdown](auto-shutdown.md) _(planned)_
- [Sandbox cleardown](sandbox-cleardown.md) _(planned)_
- [External IP addresses](external-ip-addresses.md) _(planned)_

## Troubleshooting

- [Troubleshooting runbook](troubleshooting.md) _(planned)_ — GitHub, Jenkins, AKS, VPN, Flux, scaling.

Pages marked _(planned)_ don't exist yet — feel free to add them as you write the recipe yourself the first time. Keep each one under 200 lines; if a recipe exceeds that, it's probably an explanation in disguise.
