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
  - cnp-jenkins-library:vars/helmInstall.groovy
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/clients/RoleAssignmentServiceApi.java
  - wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskAutoAssignmentService.java
  - am-role-assignment-service:src/main/resources/validationrules/core/load-case-data.drl
  - am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/feignclients/DataStoreApi.java
  - am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/controller/testingsupport/OrgMappingController.java
status: verified
sources_sha:
  "sptribs-case-api:charts/sptribs-case-api/Chart.yaml": "2ea4d5f7e49caf86bf7ecae4cbb62de174b13981"
  "sptribs-case-api:charts/sptribs-case-api/values.yaml": "2ea4d5f7e49caf86bf7ecae4cbb62de174b13981"
  "sptribs-case-api:charts/sptribs-case-api/values.wa.preview.template.yaml": "f3663f74852a15b006bc7e80bbbc5c5774345d3c"
  "cnp-flux-config:apps/sptribs/preview/aso/sptribs-postgres-config.yaml": "8e7d09ac38d68ff1241f6f03999f5a466a44d1a8"
  "wa-shared-infrastructure:aat.tfvars": "98e59f0635166193c0b4f278b5e2e9f6dea281fc"
  "cnp-jenkins-library:vars/helmInstall.groovy": "4c15a676f5a47e1773d1ee47e1254af22276a8a0"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/clients/RoleAssignmentServiceApi.java": "8a21818f6814d7331d13f2cd1f5ee1169a906ccf"
  "wa-task-management-api:src/main/java/uk/gov/hmcts/reform/wataskmanagementapi/services/TaskAutoAssignmentService.java": "ed3251b249aa89394bbacdadf277672af62c2a9d"
  "am-role-assignment-service:src/main/resources/validationrules/core/load-case-data.drl": "dbc160bf651038d4cd1b2f15865e381158348e61"
  "am-role-assignment-service:src/main/java/uk/gov/hmcts/reform/roleassignment/feignclients/DataStoreApi.java": "4a11fbc6b53d2412c147b842776f7f2cf64d680b"
  "am-org-role-mapping-service:src/main/java/uk/gov/hmcts/reform/orgrolemapping/controller/testingsupport/OrgMappingController.java": "5a2bda0dc08a948ecd4f24815d25358b75b88b37"
---

## TL;DR

A CCD-based service can stand up a full Work Allocation stack (Camunda BPM, the
task-management/monitor/workflow APIs, `wa-case-event-handler`, and the batch/cron jobs) inside a PR
preview by adding a **`pr-values:wa`** GitHub label, stacked on top of `pr-values:ccd`. The label
tells the cnp-jenkins-library to layer `values.wa.preview.template.yaml` onto the Helm release.

Getting there is two pieces of wiring plus four infrastructure prerequisites that are easy to miss
because they fail *after* the chart installs cleanly:

1. **Chart**: declare the `wa` subchart dependency, disable it by default, and add the
   `values.wa.preview.template.yaml` overlay.
2. **Pipeline**: detect the label and upload the Camunda DMN/BPMN diagrams post-install.
3. **Key-vault access** (infra): the service's preview managed identity must be granted `get` on the
   `wa-aat` key vault, or every WA pod hangs in `Init:0/1` with a CSI 403.
4. **App Insights secret** (chart): the bundled `wa` umbrella chart drops
   `app-insights-connection-string` from each component's key vault — re-add it or the AI Java agent
   crashes the JVM at startup.
5. **Postgres extension** (flux): allow-list `btree_gin` on the preview flexible server via an ASO
   `FlexibleServersConfiguration`, or `wa-task-management-api`'s Flyway migration crash-loops.
6. **Service Bus secret** (flux): a SOPS-encrypted preview Service Bus secret for the WA components.

**Access Management is optional.** `am-org-role-mapping-service` (ORM) and
`am-role-assignment-service` (RAS) are *not* part of the minimum WA preview stack, even though
sptribs deploys both. Whether you need them depends on what your DMNs and journeys do — read
[When ORM and RAS are actually needed](#when-orm-and-ras-are-actually-needed) before copying sptribs
wholesale. Steps 8 and 9 cover the AM additions if you decide you do need them.

`sptribs-case-api` is the reference implementation; this guide uses `pcs-api` as the worked example
of replicating it — including where pcs deliberately diverges by omitting AM.

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

## When ORM and RAS are actually needed

sptribs deploys both `am-org-role-mapping-service` and its own `am-role-assignment-service` in
preview, and copying that is the obvious default. It is often more than a WA preview needs. Two
distinctions decide it.

### WA reads role assignments; it never writes them

`wa-task-management-api` calls RAS on every user-facing request to fetch the caller's assignments
(`GET /am/role-assignments/actors/{user-id}`) and, for auto-assignment, to query for role holders.
Those are reads. The client's `createRoleAssignment` method has **no production caller** — only
integration tests. `TaskManagementService.assignTask` and `TaskAutoAssignmentService.autoAssignCFTTask`
write to `cft_task_db` and Camunda; neither touches RAS.

A DMN cannot write a role assignment either. The task-configuration and permissions DMNs are lookup
tables whose entire output vocabulary is `name`, `value`, `roleCategory`, `authorisations`,
`assignmentPriority`, `autoAssignable`, and `caseAccessCategory`. A row saying
`allocated-judge / OWN,EXECUTE` states *which role may act on this task*; it does not grant anyone
that role. So "we have a DMN that allocates to a judge" is not by itself a reason to deploy AM.

**Consequence:** if your preview only needs users to *see and act on* tasks, the shared AAT RAS is
enough — as long as those users already hold the relevant ORGANISATION-type assignments there, which
staff test users generally do because AAT ORM has already mapped them from CRD.

### ORM is the only writer of organisational staff roles

IDAM roles and RAS role assignments are different stores with different writers. An IDAM role gets a
user past authentication and CCD's coarse access gate. WA matches tasks against RAS *assignments*,
which carry the attributes WA and XUI filter on (`jurisdiction`, `primaryLocation`, `workTypes`).
Nothing derives one from the other at request time.

ORM is what populates them: it consumes CRD/JRD change events off Azure Service Bus, runs its Drools
mapping rules, and POSTs the results to RAS with `replaceExisting=true`. In a preview namespace that
Service Bus event never fires, so a preview-local ORM sits idle unless something invokes it — which
is what `POST /am/testing-support/createOrgMapping?userType=CASEWORKER` (gated on
`testing.support.enabled`) is for, and what a `bin/setup-role-assignments`-style seeding step calls.

**You need ORM in preview only if the assignments you depend on don't already exist in the RAS your
preview reads from.** Pointing at the shared AAT RAS, where AAT ORM has already mapped your staff
test users, usually means they do.

### RAS-per-preview is a CCD-completeness decision, not a WA one

RAS's only link to CCD is a single Drools rule, `load-case-data.drl`, and it fires only when an
incoming assignment carries `attributes["caseId"]` — it then calls `ccd-data-store-api` via the
`datastoreclient` Feign client (`CCD_DATA_STORE_URL`) to load the case. No `caseId`, no CCD call.
Organisational role assignments never carry one.

That matters because a shared AAT RAS points at the **AAT** data store, which knows nothing about
your preview's cases. When the lookup fails, `DataStoreApiFallback` silently returns a hardcoded stub
(default `caseTypeId: "Asylum"`, `jurisdiction: "IA"`), so validation rules keyed on jurisdiction
quietly evaluate against the wrong case — a silent wrong answer, not an error.

So deploy your own RAS in preview (wired to your preview data store, as sptribs does — note it goes
in the **base** `values.preview.template.yaml`, not the wa overlay) once something in your preview
writes **case-type** role assignments. Concretely, when you build:

- **case allocation** — a case allocator assigning a case to a named judge or caseworker
- **specific access** requests and approvals
- **conflict-of-interest** declarations
- **Notice of Change** / AAC-driven case assignment
- judicial **booking**-scoped roles

These are XUI/AAC/`am-role-assignment-service` flows, not WA task actions.

### Worked example: pcs-api omits both

pcs-api's WA preview deploys no ORM and no RAS. Its DMNs grant ADMIN roles only and no PCS journey
writes a case role, so there is nothing for a preview RAS to validate and nothing for ORM to seed
that AAT ORM hasn't already mapped. It reads the shared AAT RAS, and `bin/setup-role-assignments`
stays on master unwired. PCS will need both when it builds case allocation or specific access in
XUI — the possessions case-role Drools rules already exist in RAS
(`validationrules/possessions/possessions-case-role-validation-{judicial,legal-ops}.drl`) and are
simply unreachable from preview today.

> **Cost of over-deploying.** A preview ORM is not free: it pulls in an extra deployment, a Postgres
> database, `crd-topic`/`jrd-topic` Service Bus topics, five `am` key-vault secrets, and a
> post-install pipeline seeding step with its own IDAM/S2S credential requirements. Every one of
> those is a thing that can break the build. If nothing reads what it writes, drop it.

## Prerequisites

- The service already deploys a Helm chart with a working `pr-values:ccd` preview overlay (WA needs
  CCD's data-store and XUI running).
- The service's preview namespace uses a Postgres **flexible server** (not the bundled in-pod
  Postgres) — WA's databases are added to it.
- You can raise PRs against `cnp-flux-config` (platops) and `wa-shared-infrastructure` (WA team) —
  two of the prerequisites live in repos your service team doesn't own, so coordinate early.
- `az`, `kubectl` (with the preview cluster context), `helm`, and `sops`/`yq` available locally.

## Step 1: Declare the WA subchart dependency

In your chart's `Chart.yaml`, append the `wa` dependency. `servicebus` and `postgresql` deps are
usually already present from the `ccd` overlay:

```yaml
#    Work Allocation
  - name: wa
    version: ~1.1.0
    repository: 'oci://hmctsprod.azurecr.io/helm'
    condition: wa.enabled
```

In `values.yaml`, disable it by default so base and `ccd`-only previews are unaffected:

```yaml
wa:
  enabled: false
```

Bump the chart `version:`.

(If you concluded from [When ORM and RAS are actually
needed](#when-orm-and-ras-are-actually-needed) that you need AM too, Step 8 adds those
dependencies.)

## Step 2: Add the `values.wa.preview.template.yaml` overlay

This is the file the `pr-values:wa` label selects. Adapt sptribs' version, substituting your
service's specifics. Key sections:

- **`java:`** — your service's own pod. Enable Service Bus case-event publishing if your API emits
  CCD case events (topic/subscription `${SERVICE_NAME}-asb-ccd-case-events`).
- **`servicebus:`** — `enabled: true`, `releaseNameOverride: ${SERVICE_NAME}-asb`, your preview
  resource group / namespace, and the `ccd-case-events` topic with `requiresSession: true`
  (`wa-case-event-handler` uses session-based subscriptions). The `crd-topic` / `jrd-topic` topics
  sptribs declares are **ORM-only** — no WA component reads them, so omit them unless you deploy ORM
  (Step 8).
- **`postgresql:`** — add the WA databases to your preview flexible server: `camunda`, `cft_task_db`,
  `wa_workflow_api`, `wa-case-event-handler`, each prefixed `pr-${CHANGE_ID}-`.

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
- **`xui-webapp:`** — augment `nodejs.environment` with the WA service URLs
  (`SERVICES_WA_WORKFLOW_API_URL`, `SERVICES_WORK_ALLOCATION_TASK_API`,
  `HEALTH_WORK_ALLOCATION_TASK_API`, `WA_SUPPORTED_JURISDICTIONS`). Add
  `SERVICES_ROLE_ASSIGNMENT_MAPPING_API` only if you deploy ORM — the `xui-webapp` subchart already
  defaults it to the shared `am-org-role-mapping-service-{{ .Values.global.environment }}` host, so
  it renders either way and does not need overriding.

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

(`pcs` is the entry being added here — use your own service's name.) This is consumed by `cnp-module-key-vault` to add a `secrets get`
access policy for your identity. Once the WA team merges and applies it, the CSI mount succeeds and
pods leave `Init:0/1`.

> **The same repo holds a second variable you will need later — but not for preview.**
> `allowed_jurisdictions` becomes the SQL filter on the shared WA Service Bus subscription rules
> (`servicebus.tf`: `sql_filter = "jurisdiction_id IN (${var.allowed_jurisdictions})"`), and it is set
> per environment in `aat.tfvars`, `demo.tfvars`, `ithc.tfvars`, `perftest.tfvars` and `prod.tfvars`.
> A jurisdiction missing from it has its CCD case events silently filtered out of the topic — no
> error, just no tasks. Preview is unaffected, because the wa overlay provisions its *own* Service Bus
> namespace (Step 2) rather than using the shared one, which is why this isn't a preview prerequisite.
> Add your jurisdiction per environment as you promote; note `prod.tfvars` is deliberately the most
> conservative list, so getting into AAT does not mean you are in prod.

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

The WA components (and ORM, if you deploy it) need a preview Service Bus connection string.
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
  `TASK_MANAGEMENT_API_URL`, `CAMUNDA_BASE_URL`).
- **AAT** — `before('functionalTest:aat')`. Uploads the diagrams unconditionally (WA is part of the
  AAT topology, not label-gated). Set `CAMUNDA_BASE_URL` to the AAT Camunda host in `onMaster()`.
- **Prod** — `afterSuccess('functionalTest:aat')`. Sets `env.ENVIRONMENT = "prod"` and the prod
  Camunda host, then uploads.

Pass the real environment name to the DMN upload helper (`env.ENVIRONMENT`, which the pipeline sets
to `preview`/`aat`/`prod`), not a hardcoded value — and **not** the Groovy `env` object, which
stringifies to garbage like `EnvActionImpl@…`.

> **Commit the WA bin scripts executable (git mode `100755`)** — then drop any `sh "chmod -R +x
> ./bin"` step from the pipeline stages. The exec bit is preserved in git, so the chmod is a no-op
> that only adds noise. (Watch out if `bin/` is gitignored in your repo, as it is in pcs-api — you
> have to `git add -f` the new scripts, and the stored mode comes along with them.)

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

That is the complete minimum stack. **Steps 8 and 9 are optional** — do them only if
[When ORM and RAS are actually needed](#when-orm-and-ras-are-actually-needed) applies to your
service.

## Step 8 (optional): Add ORM and/or RAS to the overlay

Skip unless your preview writes case-type role assignments, or the assignments you depend on don't
exist in the RAS you read from.

Add the dependencies to `Chart.yaml` and default them off in `values.yaml`:

```yaml
  - name: am-org-role-mapping-service
    version: ~0.0.66
    repository: 'oci://hmctsprod.azurecr.io/helm'
    condition: am-org-role-mapping-service.enabled
```

```yaml
am-org-role-mapping-service:
  enabled: false
```

Then in `values.wa.preview.template.yaml`:

- **`servicebus.setup.topics`** — add `crd-topic` and `jrd-topic` (ORM's CRD/JRD subscriptions).
- **`postgresql.setup.databases`** — add `pr-${CHANGE_ID}-org-role-mapping`.
- **`am-org-role-mapping-service:`** — `enabled: true`, retargeted to your service's SB namespace and
  DB name, the five `am` key-vault secrets (`am-org-role-mapping-service-s2s-secret`,
  `orm-IDAM-CLIENT-ID`, `orm-IDAM-CLIENT-SECRET`, `orm-IDAM-ADMIN-SECRET`, plus
  `app-insights-connection-string`), `TESTING_SUPPORT_ENABLED: true` (required for the seeding
  endpoint), `ORM_ENV: pr`, and `ROLE_ASSIGNMENT_APP_URL`.
- **`xui-webapp.nodejs.environment`** — `SERVICES_ROLE_ASSIGNMENT_MAPPING_API` pointing at your
  release's ORM.

> **`ORM_ENV: pr` matters.** ORM's Drools rules are gated by per-environment feature flags in its
> `flag_config` table (`local`/`pr`/`aat`/`demo`/`perftest`/`ithc`/`prod`), read according to
> `ORM_ENV`. If your jurisdiction's flag (e.g. `possessions_wa_1_0`) is enabled for `aat` but not
> `pr`, a preview ORM will run and produce **nothing**. Check the flag rows in ORM's migrations
> before assuming the deployment is broken.

**RAS**, if you need it, goes in your **base** `values.preview.template.yaml` rather than the wa
overlay — it's a CCD-completeness concern, and sptribs places it there. Point
`CCD_DATA_STORE_URL` at your preview data store (`http://{{ .Release.Name }}-ccd-data-store-api`),
not AAT, or you get the silent `DataStoreApiFallback` stub described above.

## Step 9 (optional): Seed org role mappings post-install

Only needed alongside a preview ORM. In a preview namespace the CRD Service Bus event that normally
triggers ORM never fires, so ORM must be invoked explicitly:
`POST /am/testing-support/createOrgMapping?userType=CASEWORKER` with a `{ "userIds": [...] }` body.
The endpoint is `@ConditionalOnProperty(name = "testing.support.enabled")` — hence
`TESTING_SUPPORT_ENABLED: true` in Step 8. Call it from `afterSuccess('akschartsinstall')`, gated on
the label, reusing your service's existing S2S token script rather than duplicating WA's `bin/utils/`
tooling.

> **Seeding is preview-only.** AAT and prod role mappings are managed outside the deployment
> pipeline, driven by real CRD/JRD events. The AAT/prod blocks upload DMN/BPMN diagrams **only** — do
> not seed roles there.

> **Seed by email, not by raw IDAM id.** `createOrgMapping` takes IDAM GUIDs, but hand-maintaining
> GUIDs is unreviewable and they're not published anywhere — the test-user list (e.g. the "Test
> Users" Confluence page) holds emails. Resolve emails to ids in the script. The obvious route — the
> admin user-search endpoint `GET /api/v1/users?query=email:"…"` — is **role-gated and returns 403**
> for a typical system user (the data-store system user only has `caseworker` /
> `idam-service-account`). Instead, exploit that **every user can read its own id**: log in as each
> test user (they share one password, e.g. pcs's `idam-pcs-user-password` /
> `IDAM_PCS_USER_PASSWORD`) and read `.uid` from `GET /o/userinfo` — no special role needed. Keep the
> system-user token for the `createOrgMapping` call itself; the per-user login is only for id
> resolution. Warn-and-skip emails that fail to authenticate rather than failing the whole seed, so
> one diverged password doesn't red the build.

> **Vault scope.** The CCD system-user credentials this seeding needs
> (`idam-data-store-system-user-username`/`-password`, `ccd-api-gateway-oauth2-client-secret`) live
> in the `ccd-${env}` vault, not your service's own — so `loadVaultSecrets` needs a second vault
> block. That extra coupling is one more reason to skip seeding if nothing reads what it writes.

## Verify

You can't fully exercise this locally — it's preview-only Helm + pipeline wiring. Validate in layers:

1. **Lint and render the chart** with the overlay:
   ```bash
   cd charts/<service> && helm dependency update && helm lint .
   helm template . -f values.preview.template.yaml \
                   -f values.ccd.preview.template.yaml \
                   -f values.wa.preview.template.yaml
   ```
   Confirm the wa pods, camunda-bpm and the four batch CronJobs appear, and that
   `postgresql.setup.databases` lists the WA DBs **without** dropping the CCD DBs.

   > `helm lint` may fail with `chart file ccd-<ver>.tgz is larger than the maximum file size
   > 5242880` on recent helm versions — the packaged `ccd` subchart exceeds the limit. Extract the
   > `.tgz` files in place under `charts/<service>/charts/` and lint again; clean up afterwards with
   > `git clean -fxd charts/<service>/` (dry-run with `-nxd` first).

2. **End-to-end in CI**: open a draft PR with both `pr-values:ccd` and `pr-values:wa` labels. Watch
   the pods:
   ```bash
   kubectl --context <preview-ctx> -n <ns> get pods | grep -E 'pr-<num>-wa-'
   ```
   Success looks like: `wa-task-management-api`, `wa-task-monitor`, `wa-workflow-api`,
   `wa-case-event-handler` all `1/1 Running`; the batch/cron jobs `Completed` each minute; plus
   `camunda` `Running` (and `am-org-role-mapping-service`, if you did Step 8).

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
| `helm lint` fails on `ccd-<ver>.tgz is larger than the maximum file size` | packaged `ccd` subchart exceeds helm's 5MB limit | Verify step 1 — extract the `.tgz` subcharts in place, lint, then `git clean -fxd charts/<service>/` |
| Preview ORM deployed and healthy but writes no role assignments | your jurisdiction's `flag_config` row isn't enabled for the `pr` environment | Step 8 — check the flag migrations in `am-org-role-mapping-service/src/main/resources/db/migration/`; also confirm something actually calls `createOrgMapping` (Step 9) |
| Role-assignment validation behaves as if the case were an IA/Asylum case | preview reads the shared AAT RAS, whose CCD lookup fell back to `DataStoreApiFallback`'s hardcoded stub | Step 8 — deploy your own RAS with `CCD_DATA_STORE_URL` pointing at your preview data store |

## See also

- [How-to: Onboard a Jurisdiction](onboard-jurisdiction.md) — the DMN/Camunda configuration side of
  WA onboarding (this guide covers only the preview deployment wiring)
- [Overview](../explanation/overview.md) — WA architecture and the CCD-event → Camunda → task flow
- [Access Control](../explanation/access-control.md) — how `wa-task-management-api` matches role
  assignments against `task_roles`; why WA only ever reads from RAS
- [AM: Org Role Mapping Flow](../../../am/docs/explanation/org-role-mapping-flow.md) — the
  CRD/JRD event → Drools → RAS write path that a preview namespace never triggers on its own
