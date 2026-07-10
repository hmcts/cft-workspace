---
title: Environments
topic: cnp-environments
diataxis: reference
product: workspace
audience: both
---
# Environments



| Shared Services Environment | CFT Environment | Azure app subscription (CFTAPPS) | Use case | Path to live | Additional Information |
| - | - | - | - | - | - |
| Prod            | Prod       | `DCD-CFTAPPS-PROD` | Live services | Yes |  |
| Staging         | AAT        | `DCD-CFTAPPS-STG`  | Automated Acceptance Testing before moving to Prod | Yes |  |
| Demo            | Demo       | `DCD-CFTAPPS-DEMO` | External demonstrations | No | <ul><li>Used for demonstrating to external stakeholders</li> <li>No VPN required</li></ul> |
| ITHC            | ITHC       | `DCD-CFTAPPS-ITHC` | IT Health Check, used for penetration testing | No |  |
| Test            | Perftest   | `DCD-CFTAPPS-TEST` | Performance testing | No | |
| Dev             | Preview    | `DCD-CFTAPPS-DEV`  | Pre-merge automated testing and Pull Request checks | Yes | <ul> <li>Destroyed nightly</li> <li>Pull requests are deployed</li>​ <br> <li>Automatically tested with functional tests​</li> <br> <li>Application points to AAT instance for dependant services</li> </ul> |
| Sandbox         | Sandbox    | `DCD-CFTAPPS-SBOX` | Testing infrastructure changes, proof of concept, experimentation | No | |

## Azure subscriptions

Application resources (per-service resource groups, key vaults, App Insights, databases) live in the **`DCD-CFTAPPS-*`** subscription for the environment. Note the naming mismatch that catches people out:

- **AAT** apps are in **`DCD-CFTAPPS-STG`** (Staging), *not* an "aat" subscription — there is no `DCD-CFTAPPS-AAT`.
- **Preview** apps are in **`DCD-CFTAPPS-DEV`** (Dev).
- **Perftest** apps are in **`DCD-CFTAPPS-TEST`** (Test).

Watch for these gotchas when using `az`:

- `az login` may default to `DCD-CFTAPPS-DEV`. Always `az account set --subscription <name>` to the environment you actually want before inspecting resources.
- Read access to a subscription's platform resource groups does **not** imply read access to app-team resource groups (e.g. `pcs-prod`, `ccd-shared-aat`, `rpe-service-auth-provider-aat`). If an app RG appears to be "not found", it is more likely a permissions boundary than a missing resource — confirm with someone who has app-team access rather than assuming the resource is absent.

The `DCD-CNP-*` subscriptions hold shared CNP platform/AKS infrastructure (as opposed to the per-service application resources in `DCD-CFTAPPS-*`).

## See also

- [Auto-shutdown](../how-to/auto-shutdown.md)
- [Sandbox cleardown](../how-to/sandbox-cleardown.md)
- [External IP addresses](../how-to/external-ip-addresses.md)
