---
title: Publishing container images to ACR from GitHub Actions
topic: publishing-acr-images
diataxis: how-to
product: workspace
audience: both
---
# Publishing container images to ACR from GitHub Actions

How to push a Docker image to the HMCTS Azure Container Registry (`hmctsprod.azurecr.io`) from a GitHub Actions workflow, using OIDC and the `cnp-githubactions-library` reusable action — no long-lived credentials in repo secrets.

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

Both `rpe-acr-prod-rg` (hosts `hmctsprod`) and `cnp-acr-rg` are typically needed — copy the scopes list from a neighbouring publisher entry rather than guessing.

Subjects use the standard formats listed in [`federated-credentials.md`](federated-credentials.md#subject-identifiers). Add one per branch / `pull_request` / environment context that needs to publish; remember Azure caps each app at 20 federated credentials, so split into `-1`, `-2` apps if you go over.

## Step 3 — Set the repo secrets

In **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|---|---|
| `AZURE_CLIENT_ID` | App registration's Application (client) ID, from step 1 |
| `AZURE_TENANT_ID` | `531ff96d-0ae9-462a-8d2d-bec7c0b42082` (HMCTS tenant — also the action's default) |

That's it. The OIDC trust established in step 2 means there is no client secret or service-principal JSON to store.

## Step 4 — Wire up the workflow

Use `hmcts/cnp-githubactions-library/container-build-push-openid@main`. Here is a minimal single-arch template — one job, one platform, `latest` plus a short SHA:

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
          registry-name: hmctsprod
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

> The example workflow uses `registry-name: hmctsprod`. If you copy this template, keep that — `hmctspublic` is being decommissioned.

If any of your users are on Apple Silicon Macs, this single-arch template is not enough — see [Multi-arch builds](#multi-arch-builds) below.

### Action inputs you'll typically set

| Input | Required | Default | Notes |
|---|---|---|---|
| `registry-name` | yes | — | `hmctsprod` (the new HMCTS ACR) |
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

## Multi-arch builds

`platforms` defaults to **`linux/amd64` only**. Leave it unset and anyone on an Apple Silicon Mac gets `no matching manifest for linux/arm64` on pull, or a silently emulated container. This repo's own devcontainer image had exactly that problem. If your image has human users on Macs, publish `linux/amd64,linux/arm64`.

There are two ways to get there.

### Native matrix + manifest merge (preferred)

Build each architecture on a runner of that architecture, then merge the results into one manifest list. GitHub's `ubuntu-24.04-arm` hosted runners are free for public repos and cheaper than the amd64 ones for private repos.

Two jobs. The first is a matrix that pushes an **arch-suffixed staging tag** per architecture:

```yaml
jobs:
  build:
    runs-on: ${{ matrix.runner }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - arch: amd64
            platform: linux/amd64
            runner: ubuntu-latest
          - arch: arm64
            platform: linux/arm64
            runner: ubuntu-24.04-arm
    steps:
      - uses: actions/checkout@v6
      - id: tag
        run: echo "tag=$(echo "${{ github.sha }}" | cut -c1-7)-${{ matrix.arch }}" >> "$GITHUB_OUTPUT"
      - uses: hmcts/cnp-githubactions-library/container-build-push-openid@main
        with:
          registry-name: hmctsprod
          azure-client-id: ${{ secrets.AZURE_CLIENT_ID }}
          azure-tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          image-name: my-product/my-image
          image-tags: ${{ steps.tag.outputs.tag }}
          platforms: ${{ matrix.platform }}
          cache-from: type=gha,scope=${{ matrix.arch }}
          cache-to: type=gha,scope=${{ matrix.arch }},mode=max
```

The second merges the staging tags into the tags users actually pull:

```yaml
  merge:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          allow-no-subscriptions: true
      - run: az acr login --name hmctsprod
      - run: |
          set -euo pipefail
          img="hmctsprod.azurecr.io/my-product/my-image"
          sha=$(echo "${{ github.sha }}" | cut -c1-7)
          docker buildx imagetools create \
            --tag "${img}:latest" --tag "${img}:${sha}" \
            "${img}:${sha}-amd64" "${img}:${sha}-arm64"
          docker buildx imagetools inspect "${img}:latest"
```

Four things to get right:

- **Scope the cache per architecture.** The action defaults to `cache-from: type=gha` / `cache-to: type=gha,mode=max` with no scope — two concurrent matrix jobs would then overwrite each other's layer cache. `scope=${{ matrix.arch }}` isolates them.
- **Suffix staging tags with the SHA**, not just the arch (`abc1234-arm64`, not `latest-arm64`). With a bare `latest-<arch>` tag, two overlapping runs can have the merge job pick up the other run's layer. Add a `concurrency:` group as well.
- **The merge job does its own `azure/login` + `az acr login`.** The shared action handles auth internally, but you aren't calling it here. `id-token: write` must still be in scope. No federation change is needed — the subject is the same repo/ref already trusted from step 2.
- **`fail-fast: false`** so a failure on one architecture still leaves the other's image pushed to diagnose from.

`.github/workflows/publish-devcontainer.yml` in this repo is the worked example.

### QEMU cross-build (fallback)

Add `docker/setup-qemu-action@v3` before the build step and pass both platforms in one job:

```yaml
      - uses: docker/setup-qemu-action@v3
      - uses: hmcts/cnp-githubactions-library/container-build-push-openid@main
        with:
          # ...
          platforms: linux/amd64,linux/arm64
```

Smaller diff, one atomically-pushed manifest, no staging tags. But the non-native half runs fully emulated, which is drastically slower — for an image doing JVM, npm, or `playwright install` work, expect hours rather than tens of minutes, plus emulation-specific flakiness. Use this only when arm64 runners aren't available to you.

### Verifying

```
az acr login --name hmctsprod
docker buildx imagetools inspect hmctsprod.azurecr.io/my-product/my-image:latest
```

Expect entries for both `linux/amd64` and `linux/arm64`. To smoke-test the other architecture's binaries from your own machine, `docker run --rm --platform linux/arm64 <image> uname -m` should print `aarch64` (emulated locally — that's fine, it still proves the layer is arm64-native).

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
