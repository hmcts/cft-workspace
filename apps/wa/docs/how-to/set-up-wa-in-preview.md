---
title: Set Up Work Allocation in a Preview Environment
topic: deployment
diataxis: how-to
product: wa
audience: developer
sources:
  - sptribs-case-api:charts/sptribs-case-api/Chart.yaml
  - sptribs-case-api:charts/sptribs-case-api/values.yaml
  - sptribs-case-api:charts/sptribs-case-api/values.wa.preview.template.yaml
  - cnp-flux-config:apps/sptribs/preview/aso/sptribs-postgres-config.yaml
  - wa-shared-infrastructure:aat.tfvars
  - cnp-jenkins-library:src/uk/gov/hmcts/contino/helmInstall.groovy
status: verified
---

## TL;DR

A CCD-based service can stand up a full Work Allocation stack (Camunda BPM, the
task-management/monitor/workflow APIs, `wa-case-event-handler`, the batch/cron jobs, and
`am-org-role-mapping-service`) inside a PR preview by adding a **`pr-values:wa`** GitHub label,
stacked on top of `pr-values:ccd`. The label tells the cnp-jenkins-library to layer
`values.wa.preview.template.yaml` onto the Helm release.

Getting there is four pieces of wiring plus three infrastructure prerequisites that are easy to miss
because they fail *after* the chart installs cleanly:

1. **Chart**: declare the `wa` + `am-org-role-mapping-service` subchart dependencies, disable them by
   default, and add the `values.wa.preview.template.yaml` overlay.
2. **Pipeline**: detect the label and run the post-install Camunda/role-assignment seeding.
3. **Key-vault access** (infra): the service's preview managed identity must be granted `get` on the
   `wa-aat` key vault, or every WA pod hangs in `Init:0/1` with a CSI 403.
4. **App Insights secret** (chart): the bundled `wa` umbrella chart drops
   `app-insights-connection-string` from each component's key vault — re-add it or the AI Java agent
   crashes the JVM at startup.
5. **Postgres extension** (flux): allow-list `btree_gin` on the preview flexible server via an ASO
   `FlexibleServersConfiguration`, or `wa-task-management-api`'s Flyway migration crash-loops.
6. **Service Bus secret** (flux): a SOPS-encrypted preview Service Bus secret for the WA components.

`sptribs-case-api` is the reference implementation; this guide uses `pcs-api` as the worked example
of replicating it.

## Why these prerequisites bite late

The deceptive part of WA preview onboarding is that the Helm chart renders and installs successfully
even when key-vault access, the App Insights secret, the Postgres extension, and the Service Bus
secret are all missing. The failures only surface once pods start:

- Missing **key-vault access** → pods stuck at `Init:0/1` (the CSI secrets-store init container
  can't mount `/mnt/secrets/wa`).
- Missing **App Insights secret** → pod starts, then the Application Insights Java agent crashes the
  JVM (`NoSuchFileException: /mnt/secrets/wa/app-insights-connection-string`).
- Missing **btree_gin** → `wa-task-management-api` starts, then Flyway crash-loops
  (`extension "btree_gin" is not allow-listed`).

So budget for these up-front rather than discovering them one crash at a time.

## Prerequisites

- The service already deploys a Helm chart with a working `pr-values:ccd` preview overlay (WA needs
  CCD's data-store and XUI running).
- The service's preview namespace uses a Postgres **flexible server** (not the bundled in-pod
  Postgres) — WA's databases are added to it.
- You can raise PRs against `cnp-flux-config` (platops) and `wa-shared-infrastructure` (WA team) —
  two of the prerequisites live in repos your service team doesn't own, so coordinate early.
- `az`, `kubectl` (with the preview cluster context), `helm`, and `sops`/`yq` available locally.

## Step 1: Declare the WA subchart dependencies

In your chart's `Chart.yaml`, append the `wa` and `am-org-role-mapping-service` dependencies
(mirroring sptribs). `servicebus` and `postgresql` deps are usually already present from the `ccd`
overlay:

```yaml
#    Work Allocation
  - name: wa
    version: ~1.1.0
    repository: 'oci://hmctsprod.azurecr.io/helm'
    condition: wa.enabled
  - name: am-org-role-mapping-service
    version: ~0.0.66
    repository: 'oci://hmctsprod.azurecr.io/helm'
    condition: am-org-role-mapping-service.enabled
```

In `values.yaml`, disable both by default so base and `ccd`-only previews are unaffected:

```yaml
wa:
  enabled: false
am-org-role-mapping-service:
  enabled: false
```

Bump the chart `version:`.

## Step 2: Add the `values.wa.preview.template.yaml` overlay

This is the file the `pr-values:wa` label selects. Adapt sptribs' version, substituting your
service's specifics. Key sections:

- **`java:`** — your service's own pod. Enable Service Bus case-event publishing if your API emits
  CCD case events (topic/subscription `${SERVICE_NAME}-asb-ccd-case-events`).
- **`servicebus:`** — `enabled: true`, `releaseNameOverride: ${SERVICE_NAME}-asb`, your preview
  resource group / namespace, and topics `crd-topic`, `jrd-topic`, `ccd-case-events`
  (`requiresSession: true` on the last — `wa-case-event-handler` uses session-based subscriptions).
- **`postgresql:`** — add the WA databases to your preview flexible server: `camunda`, `cft_task_db`,
  `wa_workflow_api`, `wa-case-event-handler`, `org-role-mapping`, each prefixed `pr-${CHANGE_ID}-`.

  > **Helm replaces list values across `-f` files — it does not merge them.** The `wa` overlay's
  > `postgresql.setup.databases` list is applied *after* the `ccd` overlay's, so you must repeat the
  > CCD databases (`data-store`, `definition-store`, your own DB) in this overlay too, or they get
  > clobbered and those pods lose their databases.

- **`global:`** — `postgresHost` / `postgresHostname` (both, pointing at the same flexible server
  host), `databaseNamePrefix: "pr-${CHANGE_ID}-"`, `postgresUsername: hmcts`.
- **`wa:`** — `enabled: true` plus the subchart config: camunda-bpm image, the four long-running
  components, the four batch jobs on `*/1 * * * *`, and `wa.postgresql.enabled: false` (use the
  flexible server, not the bundled DB). **See Step 4** for the App Insights key-vault fix that must
  go in each component here.
  - `wa-task-management-api` needs `ALLOWED_CASE_TYPES` / `ALLOWED_JURISDICTIONS` matching your case
    type (WA lower-cases these when matching; in preview the case type is suffixed with the PR
    number, e.g. `pcs-${CHANGE_ID}`).
- **`am-org-role-mapping-service:`** — `enabled: true`, retargeted to your service's SB namespace,
  DB name (`pr-${CHANGE_ID}-org-role-mapping`), and `ROLE_ASSIGNMENT_APP_URL` (point at the shared
  AAT role-assignment service unless you deploy your own in preview).
- **`xui-webapp:`** — augment `nodejs.environment` with the WA service URLs
  (`SERVICES_WA_WORKFLOW_API_URL`, `SERVICES_WORK_ALLOCATION_TASK_API`,
  `HEALTH_WORK_ALLOCATION_TASK_API`, `SERVICES_ROLE_ASSIGNMENT_MAPPING_API`,
  `WA_SUPPORTED_JURISDICTIONS`).

## Step 3: Grant the preview identity access to the `wa-aat` key vault

**This is an infrastructure PR in `wa-shared-infrastructure`, owned by the WA team — raise it early.**

WA's components mount secrets from the shared `wa-aat` key vault. Your preview pods run under your
service's managed identity (set via `global.aadIdentityName`), which by default has no access to
`wa-aat`. Without the grant, every WA pod hangs in `Init:0/1` and the CSI secrets-store init
container reports a 403 / Forbidden on `wa-aat`.

Add your service to the access list in `wa-shared-infrastructure/aat.tfvars`:

```hcl
additional_managed_identities_access = ["et", "sptribs", "civil", "ia", "sscs", "fpl", "pcs"]
```

(`pcs` is the entry we added.) This is consumed by `cnp-module-key-vault` to add a `secrets get`
access policy for your identity. Once the WA team merges and applies it, the CSI mount succeeds and
pods leave `Init:0/1`.

**Diagnosing the 403:**

```bash
kubectl --context <preview-ctx> -n <ns> describe pod <wa-pod> | grep -iE 'wa-aat|403|Forbidden'
```

## Step 4: Re-add the App Insights secret to each WA component

The bundled `wa` umbrella chart (`oci://hmctsprod.azurecr.io/helm/wa`) diverges from the standalone
`wa-*` charts: it **drops `app-insights-connection-string` from each component's `wa` key vault**.
But the WA images bake `connectionString=${file:/mnt/secrets/wa/app-insights-connection-string}`
into `applicationinsights.json`, so the Application Insights Java agent crashes the JVM at startup
when the file is absent (`NoSuchFileException`).

Re-add it to the `keyVaults.wa.secrets` list of each long-running component
(`wa-case-event-handler`, `wa-task-management-api`, `wa-task-monitor`, `wa-workflow-api`). Because
Helm replaces list values, you must repeat the chart-default secrets alongside it rather than
appending — e.g. for `wa-task-management-api`:

```yaml
  wa-task-management-api:
    java:
      keyVaults:
        wa:
          secrets:
            - name: app-insights-connection-string
              alias: app-insights-connection-string
            - name: wa-system-username
              alias: WA_SYSTEM_USERNAME
            - name: wa-system-password
              alias: WA_SYSTEM_PASSWORD
            - name: wa-idam-client-secret
              alias: WA_IDAM_CLIENT_SECRET
            - name: s2s-secret-task-management-api
              alias: S2S_SECRET_TASK_MANAGEMENT_API
            - name: ld-secret
              alias: LAUNCH_DARKLY_SDK_KEY
```

> This is a latent upstream bug affecting any consumer of the umbrella chart (sptribs included), not
> something specific to your service. Worth a separate upstream PR to the `wa` chart, but re-adding
> the secret in your overlay is the immediate fix.

## Step 5: Allow-list the `btree_gin` Postgres extension (flux)

**This is a PR in `cnp-flux-config`, owned by platops.**

`wa-task-management-api`'s Flyway migration creates a GIN index that needs the `btree_gin` extension.
Azure Database for PostgreSQL rejects `CREATE EXTENSION` for any extension not on the server's
`azure.extensions` allow-list, so the migration crash-loops with
`extension "btree_gin" is not allow-listed`.

Add an ASO `FlexibleServersConfiguration` under `apps/<service>/preview/aso/` (mirroring
`sptribs-postgres-config.yaml`):

```yaml
apiVersion: dbforpostgresql.azure.com/v1api20230601preview
kind: FlexibleServersConfiguration
metadata:
  name: extensions
  namespace: ${NAMESPACE}
  annotations:
    serviceoperator.azure.com/reconcile-policy: detach-on-delete
spec:
  owner:
    name: ${NAMESPACE}-${ENVIRONMENT}
  azureName: azure.extensions
  source: user-override
  value: "btree_gin"
```

…and reference it from your preview `base/kustomization.yaml` `resources:` list. sptribs bundles
this into its initial preview-DB setup, so it never hits the crash — if you're adding WA to an
existing preview, do this **alongside** the chart overlay rather than waiting for the crash.

After the PR merges, the chain is: Flux reconciles the kustomization → creates the
`FlexibleServersConfiguration` CR → ASO pushes `azure.extensions=btree_gin` to Azure → the next pod
restart's migration passes. Verify the CR reconciled:

```bash
kubectl --context <preview-ctx> -n <ns> get flexibleserversconfiguration
# expect: extensions   True   Succeeded
```

## Step 6: Create the preview Service Bus SOPS secret (flux)

The WA components and `am-org-role-mapping-service` need a preview Service Bus connection string.
Generate the SOPS-encrypted secret in `cnp-flux-config` with the helper script:

```bash
# in cnp-flux-config
./bin/add-servicebus-secret.sh <service> preview
```

Notes from doing this for pcs:

- The script **encrypts** the secret (your `az` identity has encrypt rights on `sops-key`), but a
  local decrypt round-trip will 403 — that's expected (the identity has encrypt but not decrypt;
  Flux decrypts in-cluster). Don't treat the 403 as a corruption.
- SOPS linting requires 2-space indentation: `yq eval -I 2 --inplace <file>` — this reformat does
  **not** break the SOPS MAC.
- The script has a hardcode bug: it may not auto-wire the new secret into the `sops-secrets`
  `kustomization.yaml`. Add it manually:
  ```bash
  SECRET_FILE_NAME=<service>-sb-preview.enc.yaml \
    yq eval -i '.resources += [env(SECRET_FILE_NAME)] | .resources |= unique' kustomization.yaml
  ```

## Step 7: Wire up the pipeline (Jenkinsfile_CNP)

The Camunda DMN/BPMN diagrams must be deployed in **every** environment WA runs in — preview, AAT,
and prod — not just preview. The chart wiring (the overlay, key vault, etc.) is what differs by
environment; the diagram upload is part of the WA topology everywhere. Mirror sptribs'
`Jenkinsfile_CNP`, which deploys the diagrams in three places:

- **Preview** — `afterSuccess('akschartsinstall')`, gated on the `pr-values:wa` label. In `onPR()`,
  detect `pr-values:wa` / `pr-values:wa-ft-tests` and set the WA preview URLs (`TASK_MONITOR_API_URL`,
  `TASK_MANAGEMENT_API_URL`, `ROLE_ASSIGNMENT_API_URL`, `CAMUNDA_BASE_URL`). This block uploads the
  diagrams **and** seeds org role mappings (`setupRoleAssignments()`).
- **AAT** — `before('functionalTest:aat')`. Uploads the diagrams unconditionally (WA is part of the
  AAT topology, not label-gated). Set `CAMUNDA_BASE_URL` to the AAT Camunda host in `onMaster()`.
- **Prod** — `afterSuccess('functionalTest:aat')`. Sets `env.ENVIRONMENT = "prod"` and the prod
  Camunda host, then uploads.

> **Role-assignment seeding is preview-only.** Only the preview block calls
> `setupRoleAssignments()`. AAT and prod role mappings are managed outside the deployment pipeline,
> so the AAT/prod blocks upload DMN/BPMN diagrams **only** — do not seed roles there.

Pass the real environment name to the DMN upload helper (`env.ENVIRONMENT`, which the pipeline sets
to `preview`/`aat`/`prod`), not a hardcoded value — and **not** the Groovy `env` object, which
stringifies to garbage like `EnvActionImpl@…`.

Reuse your service's existing `bin/setup-role-assignments` and S2S token script rather than
duplicating WA's `bin/utils/` tooling.

> **Prod S2S caveat.** The diagram upload authenticates to Camunda with an S2S token. A typical
> service `bin/s2s-token.sh` leases via the **`/testing-support/lease`** endpoint, which is enabled
> in preview/AAT but **disabled in prod**. The prod upload needs a prod-capable token (the
> authenticated `/lease` endpoint with a TOTP one-time password generated from the microservice key,
> as sptribs' `bin/utils/idam-lease-service-token.sh` does, branching on `ENVIRONMENT==prod`). Make
> the token script prod-aware before relying on the prod diagram upload — otherwise the prod block is
> structurally correct but its S2S lease will fail.

The label→file convention is handled by cnp-jenkins-library `helmInstall.groovy` automatically — no
library change needed; the `values.wa.preview.template.yaml` file is picked up by the
`pr-values:wa` label.

## Verify

You can't fully exercise this locally — it's preview-only Helm + pipeline wiring. Validate in layers:

1. **Lint and render the chart** with the overlay:
   ```bash
   cd charts/<service> && helm dependency update && helm lint .
   helm template . -f values.preview.template.yaml \
                   -f values.ccd.preview.template.yaml \
                   -f values.wa.preview.template.yaml
   ```
   Confirm the wa pods, camunda-bpm, the four batch CronJobs, and the org-role-mapping deployment
   appear, and that `postgresql.setup.databases` lists the WA DBs **without** dropping the CCD DBs.

2. **End-to-end in CI**: open a draft PR with both `pr-values:ccd` and `pr-values:wa` labels. Watch
   the pods:
   ```bash
   kubectl --context <preview-ctx> -n <ns> get pods | grep -E 'pr-<num>-wa-'
   ```
   Success looks like: `wa-task-management-api`, `wa-task-monitor`, `wa-workflow-api`,
   `wa-case-event-handler` all `1/1 Running`; the batch/cron jobs `Completed` each minute; plus
   `camunda` and `am-org-role-mapping-service` `Running`.

3. Confirm a base PR (no `wa` label) is unchanged.

## Caveat: case-event publishing

Standing up the WA pods is **not** the same as tasks actually being created. WA initiates tasks from
CCD case events delivered to the `ccd-case-events` Service Bus topic. A service only drives task
initiation if it publishes those events (sptribs sets `caseEventServiceBus = true` in its
`build.gradle`). If your API doesn't yet publish CCD case events, the topic and
`wa-case-event-handler` are provisioned but no tasks are initiated until you add the publisher — a
separate app-level change from this deployment wiring.

## Troubleshooting

| Symptom | Cause | Resolution |
|---------|-------|------------|
| WA pods stuck `Init:0/1` | preview identity not on `wa-aat` access list | Step 3 — add service to `additional_managed_identities_access` in `wa-shared-infrastructure/aat.tfvars` |
| Pod starts then JVM crashes (`NoSuchFileException: .../app-insights-connection-string`) | umbrella chart dropped the AI secret | Step 4 — re-add `app-insights-connection-string` to the component's `keyVaults.wa.secrets` |
| `wa-task-management-api` `CrashLoopBackOff`, Flyway `extension "btree_gin" is not allow-listed` | extension not on `azure.extensions` | Step 5 — add the ASO `FlexibleServersConfiguration` in cnp-flux-config |
| `wa-task-batch-reconfig` errors but other batch jobs complete | downstream of `wa-task-management-api` being down | resolves once task-management-api is healthy |
| CCD DB pods lose their database after adding the wa overlay | Helm replaced (didn't merge) the `databases` list | Step 2 — repeat the CCD databases in the wa overlay's `postgresql.setup.databases` |
| SOPS decrypt 403 locally after generating the SB secret | identity has encrypt but not decrypt on `sops-key` | expected — Flux decrypts in-cluster; not a corruption |

## See also

- [How-to: Onboard a Jurisdiction](onboard-jurisdiction.md) — the DMN/Camunda configuration side of
  WA onboarding (this guide covers only the preview deployment wiring)
- [Overview](../explanation/overview.md) — WA architecture and the CCD-event → Camunda → task flow
