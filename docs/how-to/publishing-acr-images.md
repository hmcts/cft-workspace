# Publishing container images to ACR from GitHub Actions

How to push a Docker image to the HMCTS public Azure Container Registry (`hmctspublic.azurecr.io`) from a GitHub Actions workflow, using OIDC and the `cnp-githubactions-library` reusable action — no long-lived credentials in repo secrets.

## Overview

The recipe is three pieces of config plus a workflow step:

1. An AAD **app registration** declared in [`hmcts/central-app-registration`](https://github.com/hmcts/central-app-registration/blob/master/apps.yaml).
2. **`AcrPush`** (and usually `AcrPull`) permissions for that app, scoped to the ACR resource groups, declared in [`hmcts/azure-github-federation-config`](https://github.com/hmcts/azure-github-federation-config/blob/master/app-registrations.yaml). The same entry holds the federated `subjects:` that grant the publishing repo's workflows access.
3. Two repo-level secrets — `AZURE_CLIENT_ID` and `AZURE_TENANT_ID`. **No client secret / no JSON credentials**: OIDC replaces them.
4. A workflow step calling [`hmcts/cnp-githubactions-library/container-build-push-openid@main`](https://github.com/hmcts/cnp-githubactions-library).

This page is the publishing-side recipe. For the underlying OIDC / federated-credential mechanics (subject formats, the 20-credential cap, role/scope schema), see [`federated-credentials.md`](federated-credentials.md).

## Prerequisites

- Write access (or willingness to PR) to `hmcts/central-app-registration` and `hmcts/azure-github-federation-config`.
- Admin on the publishing GitHub repo (to set Actions secrets).
- A `Dockerfile` in the repo and a working local `docker build`.

## Step 1 — Register the app

Add an entry to `apps.yaml` in [`hmcts/central-app-registration`](https://github.com/hmcts/central-app-registration/blob/master/apps.yaml). Use a name that ties to the publishing repo, e.g. `<repo>-acr-publisher`. Open a PR; once merged, the central pipeline creates the AAD app registration and emits the client / tenant IDs you'll need in step 3.

## Step 2 — Grant ACR permissions and federate the repo

In [`hmcts/azure-github-federation-config`](https://github.com/hmcts/azure-github-federation-config/blob/master/app-registrations.yaml), add (or extend) an entry for the same app. ACR publishing uses the dedicated `AcrPush` / `AcrPull` roles scoped to the ACR resource groups — not `Contributor` on a subscription.

```yaml
- name: my-repo ACR Publisher
  subjects:
    - 'repo:hmcts/my-repo:ref:refs/heads/master'
    - 'repo:hmcts/my-repo:pull_request'
  permissions:
    - role_definition_name: 'AcrPush'
      scopes:
        - /subscriptions/8999dec3-0104-4a27-94ee-6588559729d1/resourceGroups/rpe-acr-prod-rg
        - /subscriptions/bf308a5c-0624-4334-8ff8-8dca9fd43783/resourceGroups/cnp-acr-rg
    - role_definition_name: 'AcrPull'
      scopes:
        - /subscriptions/8999dec3-0104-4a27-94ee-6588559729d1/resourceGroups/rpe-acr-prod-rg
        - /subscriptions/bf308a5c-0624-4334-8ff8-8dca9fd43783/resourceGroups/cnp-acr-rg
```

Both `rpe-acr-prod-rg` (hosts `hmctspublic`) and `cnp-acr-rg` are typically needed — copy the scopes list from a neighbouring publisher entry rather than guessing.

Subjects use the standard formats listed in [`federated-credentials.md`](federated-credentials.md#subject-identifiers). Add one per branch / `pull_request` / environment context that needs to publish; remember Azure caps each app at 20 federated credentials, so split into `-1`, `-2` apps if you go over.

## Step 3 — Set the repo secrets

In **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|---|---|
| `AZURE_CLIENT_ID` | App registration's Application (client) ID, from step 1 |
| `AZURE_TENANT_ID` | `531ff96d-0ae9-462a-8d2d-bec7c0b42082` (HMCTS tenant — also the action's default) |

That's it. The OIDC trust established in step 2 means there is no client secret or service-principal JSON to store.

## Step 4 — Wire up the workflow

Use `hmcts/cnp-githubactions-library/container-build-push-openid@main`. The full publishing workflow used to push this repo's own devcontainer image is a good minimal template (`.github/workflows/publish-devcontainer.yml`):

```yaml
name: Publish devcontainer image

on:
  push:
    branches: [master]
    paths:
      - '.devcontainer/**'
      - '.github/workflows/publish-devcontainer.yml'
  workflow_dispatch:

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    name: Build and push to ACR
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Compute image tags
        id: tags
        run: |
          short_sha=$(echo "${{ github.sha }}" | cut -c1-7)
          {
            echo "tags<<EOF"
            echo "latest"
            echo "${short_sha}"
            echo "EOF"
          } >> "$GITHUB_OUTPUT"

      - name: Build and push devcontainer image
        uses: hmcts/cnp-githubactions-library/container-build-push-openid@main
        with:
          registry-name: hmctspublic
          azure-client-id: ${{ secrets.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          image-name: cft-workspace/devcontainer
          dockerfile: .devcontainer/Dockerfile
          context: .devcontainer
          image-tags: ${{ steps.tags.outputs.tags }}
```

Two non-obvious bits:

- `permissions: id-token: write` is **required** at workflow (or job) level — without it the runner can't mint the OIDC token and step 2's federation has nothing to verify.
- `image-tags` is newline-separated. Each tag becomes a separate ref pushed to `<registry-name>.azurecr.io/<image-name>:<tag>`.

### Action inputs you'll typically set

| Input | Required | Default | Notes |
|---|---|---|---|
| `registry-name` | yes | — | Usually `hmctspublic` |
| `image-name` | yes | — | Repository path inside the registry, e.g. `cft-workspace/devcontainer` |
| `azure-client-id` | yes | — | From `AZURE_CLIENT_ID` |
| `azure-tenant-id` | no | HMCTS tenant | Pass `${{ secrets.AZURE_TENANT_ID }}` to be explicit |
| `dockerfile` | no | `./Dockerfile` | |
| `context` | no | `.` | |
| `image-tags` | no | `latest` | Newline-separated list |
| `platforms` | no | `linux/amd64` | Set to `linux/amd64,linux/arm64` for multi-arch |
| `build-args` | no | `''` | |
| `push` | no | `'true'` | Set `false` for build-only PR validation |

Outputs: `digest`, `tags`, `metadata`.

## Tagging patterns

For trunk builds, `latest` plus a short SHA (as in the worked example above) is the standard. For PR previews, use the PR number so multiple open PRs don't collide:

```yaml
- name: Compute image tags
  id: tags
  run: |
    if [[ "${{ github.event_name }}" == "pull_request" ]]; then
      echo "tags=pr-${{ github.event.pull_request.number }}" >> "$GITHUB_OUTPUT"
    else
      short_sha=$(echo "${{ github.sha }}" | cut -c1-7)
      printf 'tags<<EOF\nlatest\n%s\nEOF\n' "${short_sha}" >> "$GITHUB_OUTPUT"
    fi
```

## Troubleshooting

**`AADSTS70021: No matching federated identity record found`**
The subject the runner is presenting isn't listed in step 2. Print `${{ github.event_name }}` and the workflow's ref in the failing run — the subject must match exactly (e.g. a `pull_request` build needs `repo:<org>/<repo>:pull_request`, not the branch form).

**`denied: requested access to the resource is denied` on push**
The app is authenticating but lacks `AcrPush` on the registry's resource group. Re-check step 2: role name is `AcrPush` (not `Contributor`), and scopes list both ACR resource groups.

**`Error: AADSTS700016: Application with identifier '...' was not found`**
Step 1's PR hasn't merged yet, or `AZURE_CLIENT_ID` is the wrong value. The IDs only exist once the central pipeline has reconciled.

**Workflow fails at `Get OIDC token`**
The `permissions:` block is missing `id-token: write`, or it's set on the job but the workflow has a stricter top-level `permissions:` that overrides it.

## Related docs

- [Federated credentials](federated-credentials.md) — OIDC mechanics, subject formats, the 20-credential cap.
- [`hmcts/central-app-registration`](https://github.com/hmcts/central-app-registration) — declarative app-registration source.
- [`hmcts/azure-github-federation-config`](https://github.com/hmcts/azure-github-federation-config) — federated credentials and role assignments.
- [`hmcts/cnp-githubactions-library`](https://github.com/hmcts/cnp-githubactions-library) — `container-build-push-openid` and other reusable steps.
