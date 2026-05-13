---
title: Local Development
topic: architecture
diataxis: how-to
product: xui
audience: both
sources:
  - rpx-xui-webapp:config/default.json
  - rpx-xui-webapp:config/custom-environment-variables.json
  - rpx-xui-webapp:api/application.ts
  - rpx-xui-webapp:api/server.ts
  - rpx-xui-webapp:api/local.ts
  - rpx-xui-webapp:api/.env.defaults
  - rpx-xui-webapp:api/idamCheck.ts
  - rpx-xui-webapp:api/configuration/index.ts
  - rpx-xui-webapp:proxy.config.json
  - rpx-xui-webapp:.gitignore
  - rpx-xui-dev-utils:getKeyVaultSecrets/get-secrets.sh
status: reviewed
last_reviewed: "2026-05-13T00:00:00Z"
confluence:
  - id: "1660295929"
    title: "Local Setup Guide"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1296040004"
    title: "Service(s) Local XUI Development"
    last_modified: "unknown"
    space: "EUI"
  - id: "1838620775"
    title: "How to fix conflicts with Zscaler VPN on MacOS when installing EXUI Repositories"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1814310034"
    title: "How to rotate IDAM/S2S secrets for XUI"
    last_modified: "unknown"
    space: "EXUI"
  - id: "1933986267"
    title: "Proxy Configuration on Manage Case"
    last_modified: "unknown"
    space: "EXUI"
confluence_checked_at: "2026-05-13T00:00:00Z"
---

## TL;DR

- rpx-xui-webapp is a dual-layer app: Angular SPA (port 3000) + Express BFF (port 3001 in dev via `api/local.ts`).
- Local dev runs two processes: `yarn start:node` (BFF on 3001) and `yarn start:ng` (Angular on 3000 with proxy to BFF).
- A team-provided `local-development.json` config file (gitignored) placed in `config/` provides AAT service URLs and secrets — this is the preferred approach over manual env vars.
- Secrets must be placed in `/mnt/secrets/rpx/` (Linux) or `/Volumes/mnt/secrets/rpx/` (macOS post-Catalina) to satisfy `@hmcts/properties-volume`.
- Feature flags with `__format: "json"` in `custom-environment-variables.json` must be set as string `"true"` or `"false"`, not bare booleans.
- On macOS with Zscaler, you must trust the Zscaler root certificate and export `NODE_EXTRA_CA_CERTS` before `yarn install` will succeed.

## Prerequisites

Before starting, ensure you have:

| Requirement | Notes |
|---|---|
| Node.js 20 | Match the Docker base image (`node:20-alpine`). Use `nvm install 20 && nvm use 20` |
| Corepack / Yarn | Enable with `corepack enable`; repo bundles its own Yarn binary |
| Git with HMCTS SSH key | Use `git@github.com-hmcts:` alias if managing multiple GitHub identities |
| Azure CLI (`az`) | Authenticated via `az login` with access to the `rpx` Key Vault |
| VPN | Required to reach AAT internal service URLs (access via https://portal.platform.hmcts.net) |
| Zscaler cert trust (macOS) | See [Zscaler setup](#zscaler-certificate-trust-macos) below |
| Docker (optional) | Only needed if running local Redis or cftlib |
| kubectl + kubelogin (optional) | For AKS cluster access if debugging deployed pods |

## Fetch Key Vault secrets

1. Clone `rpx-xui-dev-utils` if you have not already.

2. Authenticate with Azure:
   ```bash
   az login
   ```
   If you have multiple Azure profiles, use the team's dedicated alias (e.g. `az-exui`) to isolate the HMCTS profile.
   <!-- CONFLUENCE-ONLY: not verified in source -->

3. Run the Key Vault dump script to retrieve all secrets:
   ```bash
   cd apps/xui/rpx-xui-dev-utils/getKeyVaultSecrets
   ./get-secrets.sh <vault-name>
   ```
   This prints `Secret: <name>` / `Value: <value>` pairs to stdout (`get-secrets.sh:9-20`). The vault name follows the pattern `rpx-<env>` (e.g. `rpx-aat`). You can find it in the Helm values for the environment you are targeting.

4. Create the secrets directory and write each secret as a file:
   ```bash
   sudo mkdir -p /mnt/secrets/rpx
   # For each secret printed above:
   echo -n "<value>" | sudo tee /mnt/secrets/rpx/<secret-name> > /dev/null
   ```
   On macOS post-Catalina use `/Volumes/mnt/secrets/rpx/` instead.

   The minimum secrets required:
   - `mc-s2s-client-secret`
   - `mc-idam-client-secret` (also aliased as `xui-oauth2-secret` in some vaults)
   - `mc-session-secret`
   - `launch-darkly-client-id`
   - `webapp-redis-connection-string` (only if enabling Redis sessions locally)

   **Secret rotation**: If secrets have expired, follow the rotation procedure in Confluence ("How to rotate IDAM/S2S secrets for XUI"). In summary: generate new tokens via the `service-auth-provider-app` repo, update the `rpx-<env>` Key Vault, run the `idam-access-config` master pipeline, and restart affected pods.
   <!-- CONFLUENCE-ONLY: not verified in source -->

## Configure environment

5. **Preferred approach — team-provided config file:**

   The recommended setup is to obtain a `local-development.json` file from a team member and place it in the `config/` directory. This file is gitignored (`/config/local*.*`) and provides all necessary service URLs, secrets, and feature flags for the target environment.

   The `node-config` library loads files in order: `default.json` -> `local-<NODE_CONFIG_ENV>.json` -> environment variables. The `api/.env.defaults` file sets `NODE_CONFIG_ENV=development` by default (loaded via `dotenv-extended`), so a file named `config/local-development.json` will be picked up automatically.

   **Do not commit this file to Git** — it contains secrets and environment-specific URLs.

   **Alternative — manual env vars:**

   If you do not have the JSON file, create a `.env` file or export variables. The BFF uses `node-config` with `config/custom-environment-variables.json` for override mapping.

   **Minimal config pointing at AAT services:**
   ```bash
   export SERVICES_IDAM_LOGIN_URL=https://idam-web-public.aat.platform.hmcts.net
   export SERVICES_IDAM_API_URL=https://idam-api.aat.platform.hmcts.net
   export SERVICE_S2S_PATH=http://rpe-service-auth-provider-aat.service.core-compute-aat.internal
   export SERVICES_CCD_COMPONENT_API_PATH=http://ccd-api-gateway-web-aat.service.core-compute-aat.internal
   export SERVICES_CCD_DATA_STORE_API_PATH=http://ccd-data-store-api-aat.service.core-compute-aat.internal
   export SERVICES_CCD_CASE_ASSIGNMENT_API_PATH=http://aac-manage-case-assignment-aat.service.core-compute-aat.internal
   export SERVICES_ROLE_ASSIGNMENT_API_PATH=http://am-role-assignment-service-aat.service.core-compute-aat.internal
   export SERVICES_DOCUMENTS_API_PATH_V2=http://ccd-case-document-am-api-aat.service.core-compute-aat.internal
   export FEATURE_REDIS_ENABLED=false
   export FEATURE_OIDC_ENABLED=true
   export FEATURE_HELMET_ENABLED=true
   export FEATURE_SECURE_COOKIE_ENABLED=false
   export FEATURE_APP_INSIGHTS_ENABLED=false
   ```
   <!-- DIVERGENCE: Confluence says NODE_CONFIG_ENV in .env.defaults controls environment (development/demo), not NODE_ENV. Source (api/.env.defaults) confirms NODE_CONFIG_ENV=development. The draft previously used "export NODE_ENV=development" and "export PORT=3001" which are not needed — local.ts hardcodes port 3001 and .env.defaults sets NODE_CONFIG_DIR and NODE_CONFIG_ENV. Source wins. -->

   Key points:
   - `FEATURE_SECURE_COOKIE_ENABLED=false` is needed when running over plain HTTP locally.
   - All feature-flag env vars require JSON-string format (`"true"` / `"false"`) because `custom-environment-variables.json` declares `__format: "json"` for them.
   - The dev entry point (`api/local.ts`) hardcodes port 3001 — there is no need to set `PORT`.
   - `NODE_CONFIG_ENV` (not `NODE_ENV`) controls which config layer is loaded. Set it in `api/.env.defaults`.

## Install and run

6. Install dependencies:
   ```bash
   cd apps/xui/rpx-xui-webapp
   yarn install
   ```

7. Start the BFF (Express server) in one terminal:
   ```bash
   yarn start:node
   ```
   This runs `nodemon -r dotenv-extended/config --watch '**/*.ts' --exec ts-node local.ts` from the `api/` directory. The `local.ts` entry point creates the Express app and listens on port **3001** (hardcoded). On startup it logs the full application configuration (service URLs, feature flags) so you can verify your setup.

   The BFF performs an IDAM health check on startup (`api/idamCheck.ts`): it fetches `<IDAM_API_URL>/o/.well-known/openid-configuration` and calls `process.exit(1)` if unreachable. Ensure VPN is connected before starting.

8. In a second terminal, start the Angular dev server:
   ```bash
   yarn start:ng
   ```
   This runs `ng serve --port 3000 --host 0.0.0.0 --proxy-config proxy.config.json`. The proxy config forwards all API paths (`/api`, `/auth`, `/data`, `/documents`, `/workallocation`, `/payments`, `/activity`, etc.) to `http://localhost:3001`.
   <!-- DIVERGENCE: Confluence says "yarn start" is a single command. Source shows package.json "start" script runs the production bundle (server.bundle.js). Local dev requires two separate terminals with start:node + start:ng. Source wins. -->

9. Open your browser at `http://localhost:3000`. You will be redirected to the IDAM login page (AAT or local, depending on `SERVICES_IDAM_LOGIN_URL`).

**Environment variants**: To switch the BFF target from AAT to Demo, edit `api/.env.defaults` and set `NODE_CONFIG_ENV=demo`. You will need a corresponding `config/local-demo.json` or equivalent env var overrides for demo service URLs.

## Zscaler certificate trust (macOS)

On HMCTS-managed Macs with Zscaler VPN installed, SSL inspection can cause `yarn install` and `git clone` to fail with certificate errors. Complete these steps before attempting to install dependencies:

1. Export the Zscaler root certificate from your browser (lock icon -> view certificate -> export top-level cert as Base-64 X.509 `.cer`).

2. Add to macOS system keychain:
   ```bash
   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ~/path/to/zscaler_root.cer
   ```

3. Configure Git:
   ```bash
   git config --global http.sslCAInfo /path/to/zscaler_root.cer
   ```

4. Configure Node.js (add to `~/.zshrc` or `~/.bashrc` for permanence):
   ```bash
   export NODE_EXTRA_CA_CERTS=/path/to/zscaler_root.cer
   ```
<!-- CONFLUENCE-ONLY: not verified in source -->

## Working with a local ccd-case-ui-toolkit build

If you need to develop against a local `ccd-case-ui-toolkit` build (e.g. fixing a field-type rendering issue):

1. Clone and build the toolkit in watch mode:
   ```bash
   cd apps/xui
   git clone git@github.com:hmcts/ccd-case-ui-toolkit.git
   cd ccd-case-ui-toolkit
   yarn install
   yarn build:library:watch
   ```

2. In `rpx-xui-webapp/package.json`, temporarily replace the toolkit version with a local link:
   ```json
   "@hmcts/ccd-case-ui-toolkit": "link:../ccd-case-ui-toolkit/dist/ccd-case-ui-toolkit"
   ```

3. Restart the Angular dev server. Changes to the toolkit will hot-reload in Manage Cases.

4. If dependency resolution gets stuck after switching between linked and registry installs:
   ```bash
   yarn clean && yarn install
   ```

**Important**: Do not commit the `link:` reference to version control.

## Running against local CCD via cftlib

If you want a fully local stack instead of pointing at AAT:

10. Start cftlib (from `libs/rse-cft-lib`) which bundles CCD Data Store, Definition Store, and supporting services in a single JVM process.

11. Override the CCD URLs to point at cftlib's local ports:
    ```bash
    export SERVICES_CCD_COMPONENT_API_PATH=http://localhost:4452
    export SERVICES_CCD_DATA_STORE_API_PATH=http://localhost:4452
    export SERVICES_IDAM_LOGIN_URL=http://localhost:5000
    export SERVICES_IDAM_API_URL=http://localhost:5000
    export SERVICE_S2S_PATH=http://localhost:4502
    ```
    Adjust ports to match your cftlib configuration.

12. Ensure your local IDAM (from cftlib or `idam-simulator`) has the `xuiwebapp` OAuth2 client registered with client ID `xuiwebapp` and the secret matching your `mc-idam-client-secret` file.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Process exits immediately with "idam api must be up to start" | `idamCheck` in `api/idamCheck.ts` fetches `<IDAM_API_URL>/o/.well-known/openid-configuration` on startup and calls `process.exit(1)` if unreachable | Ensure VPN is connected and `SERVICES_IDAM_API_URL` resolves correctly |
| `ECONNREFUSED` to S2S | S2S provider unreachable | Check VPN; confirm `SERVICE_S2S_PATH` URL |
| CSRF token mismatch (`403`) | Angular expects cookie `XSRF-TOKEN` (httpOnly: false) and sends header `X-XSRF-TOKEN` | Ensure you are accessing via `localhost:3000` (Angular dev server), not `localhost:3001` directly |
| Secrets not found (`Cannot read properties of undefined`) | `@hmcts/properties-volume` cannot find `/mnt/secrets/rpx/*` | Create the directory and populate secret files per step 4 |
| Feature flags ignored | Env var set as bare `true` instead of `"true"` | Wrap in quotes: `export FEATURE_OIDC_ENABLED='"true"'` or use a `.env` loader that handles JSON format |
| `NXDOMAIN` for AAT hostnames inside devcontainer | VPN connected after container start; DNS not propagated | Rebuild the devcontainer with VPN already connected |
| LaunchDarkly flags not loading | LD client ID secret missing | Ensure `/mnt/secrets/rpx/launch-darkly-client-id` exists with a valid SDK key |
| `yarn install` fails with SSL/certificate errors | Zscaler SSL inspection intercepting HTTPS traffic | Trust the Zscaler root cert and export `NODE_EXTRA_CA_CERTS` — see [Zscaler section](#zscaler-certificate-trust-macos) |
| `git clone` fails with "publickey" error | SSH key not loaded or wrong identity used | Run `ssh -T git@github.com-hmcts` and `ssh-add -l` to verify the correct key is loaded |
| Azure CLI using wrong account | Multiple Azure profiles active | Use the dedicated `az-exui` alias to isolate the HMCTS profile |

## Verify

Run these checks to confirm the setup is working:

1. Health endpoint returns `UP`:
   ```bash
   curl http://localhost:3001/api/healthCheck
   ```

2. UI config endpoint returns LaunchDarkly client ID and service URLs:
   ```bash
   curl http://localhost:3001/external/config/ui
   ```

3. Browser at `http://localhost:3000` redirects to IDAM login and, after authentication, renders the Manage Cases dashboard.

## See also

- [Architecture](../explanation/architecture.md) — how the dual-layer SPA + BFF pattern works, deployment topology, and Key Vault integration
- [BFF Pattern](../explanation/bff-pattern.md) — middleware chain ordering, feature flags, and proxy configuration explained
- [Reference: Config Schema](../reference/config-schema.md) — full reference for every config key, feature flag env var, and secret path
- [How-to: Configure for New Service](configure-for-new-service.md) — adding a new downstream service proxy to the BFF
- [Glossary](../reference/glossary.md) — definitions of `node-config`, BFF, S2S, and LaunchDarkly
