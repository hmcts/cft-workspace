---
title: Point a HelmRelease at the right chart
topic: flux-chart-source
diataxis: how-to
product: workspace
audience: both
---
# Point a HelmRelease at the right chart

Which chart source your `HelmRelease` in [`cnp-flux-config`](https://github.com/hmcts/cnp-flux-config) names decides whether chart changes ever reach a cluster. Get it wrong and nothing reports an error — the `HelmChart` says `Ready`, the release says `UpgradeSucceeded`, and it keeps deploying an old chart indefinitely.

This page is workspace-owned. [Helm chart](helm-chart.md) and [GitOps / Flux](gitops-flux.md) alongside it are ported from `platops/hmcts.github.io` and reconciled against upstream SHAs in `docs/.port-manifest.yaml`, so anything added to them is overwritten on the next port.

## If your service uses the CNP Jenkins pipeline

Name the chart in the `hmcts-charts` **GitRepository**, with no version:

```yaml
  chart:
    spec:
      chart: ./stable/<application-name>
      sourceRef:
        kind: GitRepository
        name: hmcts-charts
        namespace: flux-system
      interval: 1m
```

`./stable/<application-name>` is a path inside [`hmcts/hmcts-charts`](https://github.com/hmcts/hmcts-charts), not a local directory. The pipeline auto-releases your chart there whenever a master build produces a version that hasn't been published yet — the commits read `Auto-release <app> <version>` and are authored by `hmcts-jenkins-d-to-i`. Flux polls that repository every minute, so a chart change deploys on its own with no `cnp-flux-config` commit.

This is the overwhelming majority: **333** HelmReleases read their chart this way.

The pipeline *also* pushes the same chart to `hmctsprod.azurecr.io/helm`. **Nothing in flux reads that copy.** Pointing a `HelmRelease` at it is the mistake this page exists to prevent, and neither upstream page says so — the Jenkins section of [Helm chart](helm-chart.md#jenkins) states only that "the chart will be published", without naming a destination, while the only concrete destination it does name is an ACR, in the Azure DevOps section, for base charts.

## Why an OCI HelmRepository with a version range doesn't work

```yaml
      # Don't do this
      chart: <application-name>
      version: ">=0.0.2"
      sourceRef:
        kind: HelmRepository
        name: hmctsprod-oci
```

**A version range against an OCI registry is only resolved when source-controller restarts.** Nothing polls the registry for new tags. Measured on both AAT clusters, every OCI-sourced `HelmChart` artifact is stamped at its source-controller pod's start time and never updated again:

```
cft-aat-00  source-controller started 06:44:51   artifact lastUpdateTime 06:45:06
cft-aat-01  source-controller started 09:02:29   artifact lastUpdateTime 09:05:08
```

A chart published at 10:57 was still resolving the previous version four hours later, with `interval: 1m` and the condition reading `Ready=True / ChartPullSucceeded`. In 6,000 lines of source-controller log the git-sourced charts appear ~56 times each and no OCI-sourced chart appears once.

Of the 110 HelmReleases that do use an ACR chart, **98 pin an exact version**. Changing `version:` is a spec change, so flux re-resolves within a minute of the commit landing. That is why pinning works and a range does not.

## If your service does not use the Jenkins pipeline

Nothing in GitHub Actions writes to `hmcts-charts` — the auto-release is a Jenkins library step. So a GitHub Actions service publishes its chart to an ACR and must **pin the exact version** in `cnp-flux-config`, bumping it when it publishes.

Two further traps apply to the chart version itself, and both have bitten:

- **Don't use `<version>-<short-sha>`.** Semver compares prerelease identifiers *lexically*, so a range resolves to the highest-*sorting* SHA rather than the newest build. One app deployed a chart from 2026-03-03 for six months in preference to 28 later publishes, because `f` was the highest leading hex character committed.
- **A bare timestamp doesn't fix it either.** Semver ranks numeric identifiers *below* alphanumeric ones, so `0.0.1-20260909150000` sorts beneath every hex SHA already published. A letter-prefixed timestamp above `f` does work: `0.0.1-t20260909150000.gabc1234`. The SHA needs a prefix too — an all-digit short SHA with a leading zero is an invalid numeric identifier and fails `helm package`.

Also check the registry actually matches. `expressjs-monorepo-template` migrated from `hmctspublic` to `hmctsprod` in May 2026 and its flux config never followed, so it spent four months frozen on the last artifacts published to the old registry.

## Diagnosing a chart that won't update

```bash
kubectl get helmchart <namespace>-<release> -n flux-system --context cft-aat-01-aks \
  -o jsonpath='{.spec.version} {.status.artifact.revision} {.status.artifact.lastUpdateTime}{"\n"}'

kubectl get pods -n flux-system --context cft-aat-01-aks \
  -o jsonpath='{range .items[?(@.metadata.labels.app=="source-controller")]}{.status.startTime}{"\n"}{end}'
```

If the artifact's `lastUpdateTime` matches the source-controller's start time, the chart isn't being re-resolved — check `sourceRef.kind`. A `GitRepository` source updates continuously; a `HelmRepository` with a range does not.

Related: [Helm chart](helm-chart.md), [GitOps / Flux](gitops-flux.md).
