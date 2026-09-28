---
title: Pair pcs-api and pcs-frontend PR previews
topic: preview-pairing
diataxis: how-to
product: pcs
audience: both
sources:
  - pcs-api:Jenkinsfile_CNP
  - pcs-api:charts/pcs-api/values.ccd.preview.template.yaml
  - pcs-api:charts/pcs-api/values.elasticsearch.preview.template.yaml
---
# Pair pcs-api and pcs-frontend PR previews

pcs-api and pcs-frontend each get their own PR preview environment, and by default the two are
not connected: a pcs-frontend PR preview points at the AAT pcs-api, and a pcs-api PR's end-to-end
suite drives the AAT pcs-frontend. To test a change that spans both repos on the same pair of
preview pods, pair the two PRs with labels.

## Add the pairing labels

Pairing is two separate, one-directional labels — one on each PR, each pointing at the other PR's
number:

- On the **pcs-frontend** PR, add `pcs-api-pr:<N>` where `<N>` is the pcs-api PR number. This
  redirects the frontend preview's `PCS_API_URL`, `DATA_STORE_URL_BASE`, `CDAM_URL` and
  `XUI_BASE_URI` at that pcs-api PR's stack instead of AAT.
- On the **pcs-api** PR, add `pcs-frontend-pr:<M>` where `<M>` is the pcs-frontend PR number. This
  redirects the pcs-api PR's end-to-end suite's `PCS_FRONTEND_URL` at that pcs-frontend preview
  instead of `https://pcs.aat.platform.hmcts.net/`.

Both labels are needed for a fully round-tripped test. Setting only one leaves the other side
pointing at AAT — most commonly, a pcs-api PR without the `pcs-frontend-pr:<M>` label still runs
its e2e suite against the AAT frontend, which passes or fails against the wrong code without
any error to indicate the mismatch.

If the pcs-api PR has no real pcs-frontend change of its own, open a throwaway draft
pcs-frontend PR against the same branch purely to host the `pcs-api-pr:<N>` label and get a
preview pod; close it once the pcs-api PR merges.

## Rebuild after labelling

Both redirects are resolved from the PR's labels at build time, in `Jenkinsfile_CNP`. Adding a
label to a PR that has already built does not repoint an already-running preview — trigger a new
build on the labelled PR (or push a new commit) before relying on the pairing.

## Known limitations

- A PR preview's Elasticsearch has no persistent volume by default
  (`elasticsearch.persistence.enabled: false`), so its index is wiped whenever the AKS cluster
  restarts (including the nightly non-prod shutdown/restart) and is only rebuilt by the next
  build's High Level Data Setup stage, which re-imports the CCD definition and recreates the
  index — Logstash plays no part in this; its pipeline is a stub `beats` input to `stdout`, and
  documents are written directly by `ccd-data-store-api` as cases are saved. A preview that
  hasn't rebuilt since the last cluster restart shows an empty case list via CCD's `searchCases`
  even though direct case-details lookups still work. Add the `pr-values:elasticsearch` label to
  put ES on a persistent volume that survives restarts, or just re-run the build to rebuild the
  index for now.
- A pcs-api PR build's `helm upgrade` can recreate the preview's database. Data created on a
  paired preview does not reliably survive a rebuild — recreate test cases after each rebuild
  rather than assuming state persists.
