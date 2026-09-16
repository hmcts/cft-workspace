---
title: Set up the Atlassian and Jenkins MCP servers
topic: set-up-mcp-servers
diataxis: how-to
product: workspace
audience: both
---
# Set up the Atlassian and Jenkins MCP servers

The workspace declares its MCP servers in [`.mcp.json`](../../.mcp.json), which is committed.

| Server | Transport | Credentials | Gives the agent |
|---|---|---|---|
| `atlassian` | Remote HTTP (`mcp.atlassian.com`) | Browser OAuth, per-user | Jira issues, Confluence pages (used by `/docs-generate`'s augmentation phase and `/docs-drift`) |
| `jenkins` | Docker container over stdio | `.claude/.jenkins.env`, gitignored | Build status, console logs, test reports from `build.hmcts.net` |
| `playwright` | Local stdio (`npx @playwright/mcp`) | None | Browser automation — navigate, click, fill forms, take snapshots/screenshots |

Only Jenkins needs a local env file, and only Jenkins needs the Docker CLI (the devcontainer mounts the host socket).

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

The grant is read-write on both Jira and Confluence, and the hosted server has no read-only switch — so an agent *can* comment on an issue, transition it, or edit a page. Workspace skills are written to read only, and nothing should post to Jira or Confluence on your behalf without you asking for it.

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

## 4. Restart and verify

MCP servers are launched at startup, so restart your client to pick up new servers or changed credentials.

```
/mcp
```

That lists the connected servers. To confirm each is genuinely authenticated rather than merely connected, ask for something that requires a live call — for example a Confluence search, or the status of a `pcs-api` build.

The Atlassian OAuth flow needs a browser on the machine running the client. Inside the devcontainer the URL is printed for you to open on the host; the callback is on localhost, which the forwarded port covers.

## Troubleshooting

- **Jenkins tools fail with `Expecting value: line 3 column 1`** → the container is resolving to the public App Proxy and getting an SSO page. Check `--network host` is present in `.mcp.json`, and that the VPN was connected **before** the devcontainer started (see [connect-via-vpn](connect-via-vpn.md) and the DNS stumble in [getting-started](../tutorials/getting-started.md)).
- **Jenkins returns `401`** → you used your Entra password rather than an API token, or your username is not the Object ID GUID.
- **Jenkins returns `403` on a write** → permissions come from the `azureAdMatrix` in `jenkins.yaml`. `DTS CFT Developers` grants read plus `Job/Build` and `Job/Cancel`; admin-only tools such as `run_groovy_script` need `DTS Platform Operations`. Add `--read-only` to the server's args if you would rather the agent could not trigger builds at all.
- **Atlassian tools return `401`, or `/mcp` shows the server as needing auth** → the OAuth grant has expired or been revoked. Re-authenticate through `/mcp`; there is no token to edit.
- **An Atlassian tool fails asking for `cloudId`** → pass `https://hmcts.atlassian.net` (or the UUID from `getAccessibleAtlassianResources`) explicitly. It is never inferred.
- **An Atlassian operation name is rejected** → only Jira and Confluence basics are exposed as named tools; everything else is reached by `discover` then `executeRead` / `executeWrite`. Don't guess operation names.
- **A server is missing from `/mcp`** → `.mcp.json` failed to parse, or the client was not restarted. Check with `jq . .mcp.json`.

## Credential hygiene

`.gitignore` excludes `/.claude/*.env`, so `.claude/.jenkins.env` is the one place a live credential sits in plaintext in the workspace. Only that rule keeps it out of a commit. Set an expiry on the Jenkins token, prefer the narrowest permissions that work, and revoke through the UI that issued it if the file is ever staged by accident. Never commit an env file, and never paste a token into a doc, a `.example` file, or a commit message.

Atlassian holds no credential here at all now — the OAuth grant lives in the client's own storage. Revoke it from your Atlassian account's connected-apps page rather than by deleting anything in the repo.
