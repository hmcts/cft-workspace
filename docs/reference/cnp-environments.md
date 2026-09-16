---
title: Environments
topic: cnp-environments
diataxis: reference
product: workspace
audience: both
---
# Environments



| Shared Services Environment | CFT Environment | Azure AKS subscription (CFTAPPS) | Use case | Path to live | Additional Information |
| - | - | - | - | - | - |
| Prod            | Prod       | `DCD-CFTAPPS-PROD` | Live services | Yes |  |
| Staging         | AAT        | `DCD-CFTAPPS-STG`  | Automated Acceptance Testing before moving to Prod | Yes |  |
| Demo            | Demo       | `DCD-CFTAPPS-DEMO` | External demonstrations | No | <ul><li>Used for demonstrating to external stakeholders</li> <li>No VPN required</li></ul> |
| ITHC            | ITHC       | `DCD-CFTAPPS-ITHC` | IT Health Check, used for penetration testing | No |  |
| Test            | Perftest   | `DCD-CFTAPPS-TEST` | Performance testing | No | |
| Dev             | Preview    | `DCD-CFTAPPS-DEV`  | Pre-merge automated testing and Pull Request checks | Yes | <ul> <li>Destroyed nightly</li> <li>Pull requests are deployed</li>​ <br> <li>Automatically tested with functional tests​</li> <br> <li>Application points to AAT instance for dependant services</li> </ul> |
| Sandbox         | Sandbox    | `DCD-CFTAPPS-SBOX` | Testing infrastructure changes, proof of concept, experimentation | No | |

## Azure subscriptions

The **`DCD-CFTAPPS-*`** subscription for an environment holds the AKS clusters and the chart-deployed app workloads — e.g. perftest's clusters are `cft-perftest-00-aks` / `cft-perftest-01-aks` in `DCD-CFTAPPS-TEST`. Note the naming mismatch that catches people out:

- **AAT** clusters are in **`DCD-CFTAPPS-STG`** (Staging), *not* an "aat" subscription — there is no `DCD-CFTAPPS-AAT`.
- **Preview** clusters are in **`DCD-CFTAPPS-DEV`** (Dev).
- **Perftest** clusters are in **`DCD-CFTAPPS-TEST`** (Test).

### Per-service shared infrastructure lives in the CNP subscriptions

The per-service resource groups created by each service's `*-shared-infrastructure` Terraform — App Insights, Redis, Key Vault, private endpoints, and the matching `<service>-data-<env>` database groups — do **not** follow the `DCD-CFTAPPS-*` mapping above. In non-production they live in the `DCD-CNP-*` subscriptions:

| CFT Environment | Service shared-infra subscription | Subscription ID |
| - | - | - |
| Perftest, ITHC | `DCD-CNP-QA`  | `7a4e3bd5-ae3a-4d0c-b441-2188fee3ff1c` |
| AAT, Demo      | `DCD-CNP-DEV` | `1c4f0704-a29e-403d-b719-b90c34ef14c9` |

So if you are looking for a service's App Insights, Redis or Key Vault in a non-production environment, `DCD-CFTAPPS-<ENV>` is the wrong place to look — and because the resource group simply is not there, the empty result reads like a permissions boundary when it is actually the wrong subscription. `DCD-CFTAPPS-TEST` and `DCD-CFTAPPS-STG` hold only platform-level App Insights components (`cft-platform-test` / `cft-api-mgmt-test`, `cft-platform-stg` / `cft-api-mgmt-stg`) — no per-service ones at all.

```bash
# perftest shared infrastructure for pcs: App Insights, Redis, Key Vault, private endpoint
az resource list --subscription DCD-CNP-QA -g pcs-perftest -o table
```

Verified 2026-09-16 for `pcs` (`pcs-perftest`, `pcs-ithc`, `pcs-data-perftest`, `pcs-data-ithc` in `DCD-CNP-QA`; `pcs-aat`, `pcs-demo` in `DCD-CNP-DEV`) and `idam` (`idam-idam-perftest`, `idam-idam-ithc` in `DCD-CNP-QA`). Other services look the same — `rd-perftest` and `rd-ithc` are in `DCD-CNP-QA` too — but confirm with `az group list` before concluding a resource group is missing.

### Gotchas when using `az`

- `az login` may default to `DCD-CFTAPPS-DEV`. Always `az account set --subscription <name>` to the subscription you actually want before inspecting resources.
- If a service resource group appears to be "not found", check the subscription before assuming a permissions problem — for non-prod shared infrastructure it is usually `DCD-CNP-QA` / `DCD-CNP-DEV` rather than `DCD-CFTAPPS-<ENV>`.
- Read access to a subscription's platform resource groups does **not** imply read access to app-team resource groups (e.g. `pcs-prod`, `ccd-shared-aat`, `rpe-service-auth-provider-aat`). Once you are sure you are in the right subscription, a "not found" is more likely a permissions boundary than a missing resource — confirm with someone who has app-team access rather than assuming the resource is absent.

## Extending a service principal to a new environment

A service's GitHub Actions deployment does not gain access to a new non-prod environment just because it already deploys elsewhere — each environment needs its own role assignments, requested separately via PlatOps:

- **AKS access is per-cluster, not just per-subscription.** `Reader` at subscription scope lets the pipeline see the AKS resource, but Helm deploys still fail with a cluster-admin-credential denial until `Azure Kubernetes Service Cluster Admin Role` is granted on the specific cluster (some environments, e.g. ITHC and Demo, run more than one AKS cluster in the same subscription).
- **Terraform needs separate storage-account access.** The Terraform state store lives in `DCD-CNP-DEV` (account `mgmtstatestorenonprod`, resource group `mgmt-state-store-nonprod`), not in the `DCD-CFTAPPS-*` subscription being deployed to — `Reader` on the target subscription does not include it.
- **GitHub runners need DNS.** Resolving `<env>.platform.hmcts.net` from a hosted runner requires the `hub-github-network-github-prod` VNet link on that environment's platform private-DNS zone in [`azure-private-dns`](https://github.com/hmcts/azure-private-dns). Several non-AAT environments lack this link (or the zone itself), so smoke tests that hit the platform hostname fail with DNS resolution errors even once the deploy itself succeeds.

## See also

- [Auto-shutdown](../how-to/auto-shutdown.md)
- [Sandbox cleardown](../how-to/sandbox-cleardown.md)
- [External IP addresses](../how-to/external-ip-addresses.md)
