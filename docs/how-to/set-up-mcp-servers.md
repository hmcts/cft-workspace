---
title: Set up the Atlassian and Jenkins MCP servers
topic: set-up-mcp-servers
diataxis: how-to
product: workspace
audience: both
---
# Set up the Atlassian and Jenkins MCP servers

The workspace declares its MCP servers in [`.mcp.json`](../../.mcp.json), which is committed. Credentials are **not** — each server reads them from a gitignored env file under `.claude/`, which you create yourself from the matching `.example` file.

| Server | Env file | Gives the agent |
|---|---|---|
| `atlassian` | `.claude/.atlassian.env` | Jira issues, Confluence pages (used by `/docs-generate`'s augmentation phase and `/docs-drift`) |
| `jenkins` | `.claude/.jenkins.env` | Build status, console logs, test reports from `build.hmcts.net` |

Both run as Docker containers over stdio, so you need the Docker CLI available (the devcontainer mounts the host socket).

## 1. Atlassian (Jira + Confluence)

HMCTS runs Jira and Confluence **Data Center**, not Cloud. Data Center uses a single Personal Access Token per application — there is no separate API-token-plus-email pairing as on Cloud, so `CONFLUENCE_PERSONAL_TOKEN` and `JIRA_PERSONAL_TOKEN` are the only secrets needed.

Create one token per application. They are separate systems and a token from one will not authenticate against the other:

1. Log in to <https://tools.hmcts.net/jira/>.
2. Click your **avatar** (top right) → **Profile**.
3. Select **Personal Access Tokens** in the left sidebar.
4. **Create token**, name it (e.g. `cft-workspace-mcp`), set an expiry, and copy the value — it is shown only once.
5. Repeat at <https://tools.hmcts.net/confluence/> for the Confluence token.

The direct URL, if the sidebar item is hard to find, is <https://tools.hmcts.net/jira/secure/ViewPersonalAccessTokens.jspa> (and the equivalent under `/confluence/`).

Then:

```bash
cp .claude/.atlassian.env.example .claude/.atlassian.env
```

Fill in both tokens, leaving the URLs as they are:

```
CONFLUENCE_PERSONAL_TOKEN=<your confluence pat>
CONFLUENCE_URL=https://tools.hmcts.net/confluence/
JIRA_PERSONAL_TOKEN=<your jira pat>
JIRA_URL=https://tools.hmcts.net/jira/
```

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

## 3. Restart and verify

MCP servers are launched at startup, so restart your client to pick up new servers or changed credentials.

```
/mcp
```

That lists the connected servers. To confirm each is genuinely authenticated rather than merely connected, ask for something that requires a live call — for example a Confluence search, or the status of a `pcs-api` build.

## Troubleshooting

- **Jenkins tools fail with `Expecting value: line 3 column 1`** → the container is resolving to the public App Proxy and getting an SSO page. Check `--network host` is present in `.mcp.json`, and that the VPN was connected **before** the devcontainer started (see [connect-via-vpn](connect-via-vpn.md) and the DNS stumble in [getting-started](../tutorials/getting-started.md)).
- **Jenkins returns `401`** → you used your Entra password rather than an API token, or your username is not the Object ID GUID.
- **Jenkins returns `403` on a write** → permissions come from the `azureAdMatrix` in `jenkins.yaml`. `DTS CFT Developers` grants read plus `Job/Build` and `Job/Cancel`; admin-only tools such as `run_groovy_script` need `DTS Platform Operations`. Add `--read-only` to the server's args if you would rather the agent could not trigger builds at all.
- **Atlassian tools return `401`** → the PAT has expired, or a Jira token is being used against Confluence (or vice versa). They are not interchangeable.
- **A server is missing from `/mcp`** → `.mcp.json` failed to parse, or the client was not restarted. Check with `jq . .mcp.json`.

## Credential hygiene

`.gitignore` excludes `/.claude/*.env`, so these files are the one place a live production credential sits in plaintext in the workspace. Only that rule keeps them out of a commit. Set an expiry on every token, prefer the narrowest permissions that work, and revoke through the same UI that issued the token if a file is ever staged by accident. Never commit an env file, and never paste a token into a doc, a `.example` file, or a commit message.
