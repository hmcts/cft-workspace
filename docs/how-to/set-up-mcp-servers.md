---
title: Set up the workspace's MCP servers
topic: set-up-mcp-servers
diataxis: how-to
product: workspace
audience: both
---
# Set up the workspace's MCP servers

The workspace declares its MCP servers in [`.mcp.json`](../../.mcp.json), which is committed.

| Server | Transport | Credentials | Gives the agent |
|---|---|---|---|
| `atlassian` | Remote HTTP (`mcp.atlassian.com`) | Browser OAuth, per-user | Jira issues, Confluence pages (used by `/docs-generate`'s augmentation phase and `/docs-drift`) |
| `jenkins` | Docker container over stdio | `.claude/.jenkins.env`, gitignored | Build status, console logs, test reports from `build.hmcts.net` |
| `playwright` | Local stdio (`npx @playwright/mcp`) | None | Browser automation — navigate, click, fill forms, take snapshots/screenshots |
| `Azure MCP Server` | Local stdio (`npx @azure/mcp@latest`) | `az login` session, pinned via `AZURE_TOKEN_CREDENTIALS` | Subscription, resource and Azure Monitor/Log Analytics queries |

Only Jenkins needs a local env file, and only Jenkins needs the Docker CLI (the devcontainer mounts the host socket). For pipeline analysis across many builds, you can also connect the data sources in [section 5](#5-pipeline-analysis-data-sources-optional); these aren't MCP servers.

## 1. Atlassian (Jira + Confluence)

HMCTS Jira and Confluence are on **Atlassian Cloud** (`hmcts.atlassian.net`), so the workspace uses Atlassian's own hosted MCP server rather than a local container. There is nothing to install and no token to create or rotate — authentication is OAuth in the browser against your existing SSO session, and your Atlassian permissions carry over as-is.

```
/mcp
```

Pick `atlassian`, choose **Authenticate**, and complete the consent screen that opens in your browser. The grant is stored by the client, not in this repo, and survives restarts until it's revoked or expires.

In Codex the equivalent is:

```bash
codex mcp login atlassian
```

### Site scoping

Tools take a `cloudId`. Pass the site URL directly — `https://hmcts.atlassian.net` — or call `getAccessibleAtlassianResources` once and reuse the UUID it returns. Both forms work; the URL is easier to read in a skill definition.

### Read/write access

The grant is read-write on both Jira and Confluence, and the hosted server has no read-only switch — so an agent *can* comment on an issue, transition it, or edit a page. Workspace skills are written to read only, and nothing should post to Jira or Confluence on your behalf without you asking for it. When you do ask it to write, see [Write to Jira and Confluence through the Atlassian MCP](write-to-jira-and-confluence-via-mcp.md) for the formatting and versioning behaviours that differ from the old Server instance.

## 2. Jenkins

### Create the API token

You need a Jenkins API token:

1. Log in to <https://build.hmcts.net/> (SSO).
2. Hover over your **profile** in the top right.
3. Select **Security**.
4. Under **API Token**, click **Add new Token**, name it, generate, and copy the value — it is shown only once.

### Find your Entra Object ID

When you go to the Security page the URL will contain your Entra Object ID, e.g. https://build.hmcts.net/user/11111111-1111-1111-1111-111111111111/security/

### Write the env file

```bash
cp .claude/.jenkins.env.example .claude/.jenkins.env
```

```
JENKINS_URL=https://build.hmcts.net/
JENKINS_USERNAME=<your entra object id>
JENKINS_PASSWORD=<your jenkins api token>
JENKINS_TIMEOUT=30
JENKINS_VERIFY_SSL=true
```

The default timeout in the server is 5 seconds, which is tight for `build.hmcts.net` over the VPN — 30 is a better default.

### Why the container needs `--network host`

The `jenkins` entry in `.mcp.json` passes `--network host`. This is required, not incidental. `build.hmcts.net` is split-horizon DNS:

- Inside the devcontainer, on the VPN, it resolves to an internal `10.x` address that serves the API.
- Inside a **default bridge** container, it resolves to the public Azure App Proxy, which returns a Microsoft sign-in **HTML page with a `200` status**.

The MCP server calls `.json()` on that HTML and fails with `Expecting value: line 3 column 1 (char 4)`. That error reads like bad credentials but is actually a routing problem. `--network host` makes the container inherit the devcontainer's VPN resolver.

## 3. Playwright

Nothing to configure — `npx -y @playwright/mcp@latest` fetches and caches the server on first use, and it needs no credentials or env file.

It can't drive a *visible* browser inside the devcontainer: the server defaults to the `chrome` channel, which isn't installed, and even after installing Chrome, headed launches don't inherit the container's Xvfb `$DISPLAY` the way a direct Chrome invocation on the same display does. For a flow that genuinely needs a human to see or interact with the browser (for example, signing in through a UI), use API tokens or credentials instead of the MCP browser tools rather than trying to force a headed launch.

## 4. Azure MCP Server

Nothing to install — `npx -y @azure/mcp@latest server start` fetches and caches the server on first use, and it needs no separate token or env file.

It authenticates through `DefaultAzureCredential`, which by default walks a chain of credential sources — environment variables, managed identity, workload identity — before ever trying the `az` CLI's cached login. Inside the devcontainer the managed-identity/IMDS probe in that chain can stall for ten or more minutes with no error before falling through. Pin the credential in the server's `env` block in `.mcp.json` so it goes straight to your existing `az login` session instead:

```json
"env": { "AZURE_TOKEN_CREDENTIALS": "AzureCliCredential" }
```

With it set, a query resolves in about a second rather than minutes, reading the same `~/.azure` token cache `az` already uses — no separate login required.

`monitor_resource_log_query` (Application Insights / Log Analytics) has different defaults from `az monitor app-insights query`, not just a different calling convention: it defaults to a **24-hour** window (`hours`) rather than the CLI's **1-hour** `--offset`, and to a **20-row** result cap (`limit`) that truncates a larger result set with no warning rather than erroring. It also renders timestamps to the nearest whole second, where the CLI keeps milliseconds — pass explicit `hours` and `limit` for anything that needs completeness, and use the CLI (`-o json | jq`, since `-o table` prints nothing for these analytics queries) if the query depends on sub-second ordering.

## 5. Pipeline analysis data sources (optional)

To answer questions like "which stage is slow", "why does this pipeline keep failing" or "how has build time changed this quarter", you need more than one build's console log. There are three complementary sources:

| Source | Where | Answers | Access |
|---|---|---|---|
| Pipeline metrics | Cosmos account `pipeline-metrics` (subscription `DCD-CNP-Prod`), database `jenkins`, container `pipeline-metrics` | Stage timings and outcomes for every build, across all products | *Cosmos DB Built-in Data Reader* data-plane role, or a read-only account key |
| Failed-build archive | Storage account `mgmtbuildlogstoresandbox` (resource group `mgmt-buildlog-store-sandbox`), container `jenkins-build-archive` | The console log and artifacts of failed builds that Jenkins has already deleted | *Storage Blob Data Reader*, or permission to list the account keys |
| Application Insights | For example `et-aat` (`DCD-CNP-DEV`), `et-perftest` (`DCD-CNP-QA`), `et-prod` (`DCD-CNP-Prod`) | Whether a failed deploy or test lines up with runtime errors in the environment | Your `az login`, via the Azure MCP Server or `az monitor app-insights query` |

Cosmos tells you *which* stage is slow or failing, and Jenkins or the archive tells you *why*.

### Pipeline metrics (Cosmos DB)

Subscription `Reader` is not enough to query documents. The account is discoverable, but reads return `403` until you hold the *Cosmos DB Built-in Data Reader* role on the account, database or container. If you can't get the role, a read-only account key works too. Keep it in a gitignored env file, never in the chat:

```bash
printf 'COSMOS_PIPELINE_METRICS_KEY=%s\n' "$(pbpaste)" > .claude/.cosmos.env && chmod 600 .claude/.cosmos.env
```

The Azure MCP Server's Cosmos tool authenticates with your `az` login rather than a key. With only a key, query with the `azure-cosmos` Python SDK, reading the key from the file at runtime so it never appears in output.

How the documents behave:

- **One document per stage event, not per build.** `MetricsPublisher` writes a document when each stage *ends* (the `after:all` callback, which also runs when the stage fails), plus a final `Pipeline Succeeded` or `Pipeline Failed` event. Group by `job_name` + `build_number` to rebuild a build. A stage's duration is the difference between successive `current_build_duration` values (milliseconds since the build started); there is no per-stage duration field.
- **`component` is the Jenkinsfile's `component`, not the repo name.** For example, `et-ccd-callbacks` publishes as `product='et'`, `component='cos'`. Check `def component` in the repo's `Jenkinsfile_CNP`.
- **Team hooks count towards the stage they're attached to.** Work in an `afterSuccess('akschartsinstall')` or `afterAlways('functionalTest:preview')` block, such as a preview-configuration script or extra UI tests, is timed and blamed as that stage.
- **Stage attribution is unreliable for parallel stages.** The first event with a non-`SUCCESS` result is usually the failing stage, but parallel branches (`test`, `sonarscan`, `dockerbuild`, `securitychecks`, and Fortify and dependency-check on nightlies) can emit `FAILURE` after another branch failed.
- **Superseded builds are logged as failures.** With `disableConcurrentBuilds(abortPrevious: true)`, a build cancelled by a newer push still emits `Pipeline Failed`. Treat a failed build whose end time is after the next build's start as superseded before quoting failure rates.
- **Cross-partition `GROUP BY` isn't supported by the Python SDK** (`Query contains the following features, which the calling client does not support`). Use `SELECT DISTINCT VALUE` / `COUNT` queries, or pull the rows and aggregate on your side.

### Failed-build archive (Blob Storage)

Jenkins keeps only a handful of builds per branch and deletes PR jobs once the PR closes, so logs for most historical failures return `404` from Jenkins. Since 2026-07-28, the top-level *Archive Completed Builds* job (defined in `cnp-jenkins-config/jobdsl/organisations-beta.groovy`) has copied builds that ended in `FAILURE` to blob storage. From library `2.9.0`, `withPipeline` and `withNightlyPipeline` queue it through `queueBuildArchive`, but builds pinned to older library versions also appear in the archive, so don't assume a pipeline's builds are missing just because of its version. Coverage varies by repo: for ET over August–September it held 74–82% of the frontends' failures but only about 21% of `et-ccd-callbacks`'s. Layout:

```
jenkins-build-archive/builds/<job path>/completed-build_<n>_FAILURE[_<stage>]/
    console.txt  artifacts.zip  build.json  test-results.json  archive-metadata.json
```

`<job path>` mirrors the Jenkins folder, for example `HMCTS_d_to_i/et-ccd-callbacks/PR-3196`. Only `FAILURE` is archived; `ABORTED` builds (such as a helm install that timed out) and `NOT_BUILT` builds (superseded) are not, so the archive under-represents deploy timeouts. In practice `workflow.json` isn't present and `failedStage` is empty, so take the cause from `console.txt`. Jenkins prints `Failed in branch <name>` for a failed parallel branch.

Listing containers only needs management-plane access, but reading blobs needs *Storage Blob Data Reader*. If your account can list the storage account keys, `az` can fetch one for you without it being printed:

```bash
az storage blob list --account-name mgmtbuildlogstoresandbox --subscription bf308a5c-0624-4334-8ff8-8dca9fd43783 --auth-mode key -c jenkins-build-archive --prefix builds/HMCTS_d_to_i/et-ccd-callbacks/ -o table
```

Logs can be tens of megabytes, so download ranges (the last few hundred KB) rather than whole files when surveying many builds.

### Pulling Jenkins logs in bulk

For more than a handful of builds, the Jenkins MCP tools are slow and their regex filtering is noisy. Call the Jenkins API directly with the same `.claude/.jenkins.env` credentials, and allow a generous `curl --max-time`: logs for CCD-based services often run past 20 MB. `…/logText/progressiveText?start=<bytes>` returns just the end of a large log; `X-Text-Size` on a `HEAD` request gives its length. List a job's surviving builds with `…/api/json?tree=jobs[name,builds[number,result,timestamp,url]]`.

## 6. Restart and verify

MCP servers are launched at startup, so restart your client to pick up new servers or changed credentials.

```
/mcp
```

That lists the connected servers. To confirm each is genuinely authenticated rather than merely connected, ask for something that requires a live call — for example a Confluence search, or the status of a `pcs-api` build.

The Atlassian OAuth flow needs a browser on the machine running the client. Inside the devcontainer the URL is printed for you to open on the host; the callback is on localhost, which the forwarded port covers.

## Troubleshooting

- **Jenkins tools fail with `Expecting value: line 3 column 1`** → the container is resolving to the public App Proxy and getting an SSO page. Check `--network host` is present in `.mcp.json`, and that the VPN was connected **before** the devcontainer started (see [VPN](../tutorials/cnp-onboarding/person-vpn.md) and the DNS stumble in [getting-started](../tutorials/getting-started.md)). If those are already correct, the same error can also mean the App Proxy's own login session has expired rather than anything being misconfigured — `curl -sI https://build.hmcts.net/api/json` will show a `302` to `login.microsoftonline.com` in that case (as opposed to a `200` carrying the SSO HTML page for the routing problem). The fix is an interactive re-login against `build.hmcts.net` in a browser; no config change will resolve it.
- **Jenkins returns `401`** → you used your Entra password rather than an API token, or your username is not the Object ID GUID.
- **Jenkins returns `403` on a write** → permissions come from the `azureAdMatrix` in `jenkins.yaml`. `DTS CFT Developers` grants read plus `Job/Build` and `Job/Cancel`; admin-only tools such as `run_groovy_script` need `DTS Platform Operations`. Add `--read-only` to the server's args if you would rather the agent could not trigger builds at all.
- **A `get_build_console_output` regex matches the wrong stage** → Jenkins interleaves the console output of every parallel branch (Unit tests, Docker build, Security Checks, ...) into one log, in whatever order they happen to print. A generic pattern like `BUILD SUCCESSFUL` matches all of them, so it can look like a specific gate passed when the line actually came from an unrelated branch. Match on a message that only that stage emits (e.g. `Found N vulnerabilities` for the OWASP dependency-check stage) rather than a phrase every stage repeats.
- **A PR's Jenkins check shows `ERROR` via `gh pr view --json statusCheckRollup`** → that state fires for any non-zero pipeline exit, which covers both a genuine test failure and an infrastructure abort that never reached the test stage at all (for example a database connection refused before the suite starts). The two look identical in the check state; only `get_build_console_output` on that specific build tells you which one happened.
- **Atlassian tools return `401`, or `/mcp` shows the server as needing auth** → the OAuth grant has expired or been revoked. Re-authenticate through `/mcp`; there is no token to edit.
- **An Atlassian tool fails asking for `cloudId`, or errors `No cloud ID found for hostname`** → pass `https://hmcts.atlassian.net` (or the UUID from `getAccessibleAtlassianResources`) explicitly. It is never inferred. `tools.hmcts.net` is the vanity URL used in shared Confluence/Jira links throughout this workspace's docs, but it isn't a registered Atlassian Cloud site — passing it as the `cloudId` fails with that error.
- **An Atlassian operation name is rejected** → only Jira and Confluence basics are exposed as named tools; everything else is reached by `discover` then `executeRead` / `executeWrite`. Don't guess operation names.
- **A server is missing from `/mcp`** → `.mcp.json` failed to parse, or the client was not restarted. Check with `jq . .mcp.json`.
- **Cosmos queries return `403` although you can see the `pipeline-metrics` account** → you have control-plane `Reader` but no data-plane role. Ask for *Cosmos DB Built-in Data Reader*, or use a read-only key (see [section 5](#pipeline-metrics-cosmos-db)).
- **A query for a repo in `pipeline-metrics` returns nothing** → you filtered on the repo name. `component` is the Jenkinsfile's `component` value (for example `cos` for `et-ccd-callbacks`).
- **Jenkins returns `404` for a build URL taken from Cosmos** → the PR has closed and Jenkins has deleted its job. Look in the failed-build archive instead.
- **`az storage blob list --auth-mode login` fails with "You do not have the required permissions"** → reading blobs needs a *Storage Blob Data* role even when you can list containers. Use `--auth-mode key` if you can list account keys, or ask for *Storage Blob Data Reader*.
- **An Azure MCP tool call hangs for minutes with no error** → `DefaultAzureCredential` is walking its full credential chain before reaching the `az` CLI credential. Set `AZURE_TOKEN_CREDENTIALS=AzureCliCredential` in the server's `env` block in `.mcp.json`.

## Credential hygiene

`.gitignore` excludes `/.claude/*.env`, so `.claude/.jenkins.env` (and `.claude/.cosmos.env`, if you use a Cosmos key) are the places a live credential sits in plaintext in the workspace. Only that rule keeps them out of a commit. Prefer RBAC roles over account keys where you can get them: a Cosmos read-only key can't be scoped to one container, and a storage account key grants full read-write on the whole account. Set an expiry on the Jenkins token, prefer the narrowest permissions that work, and revoke through the UI that issued it if the file is ever staged by accident. Never commit an env file, and never paste a token into a doc, a `.example` file, or a commit message.

Atlassian holds no credential here at all now — the OAuth grant lives in the client's own storage. Revoke it from your Atlassian account's connected-apps page rather than by deleting anything in the repo.
