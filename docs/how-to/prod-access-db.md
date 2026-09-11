---
title: Connect to a production PostgreSQL database
topic: prod-access-db
diataxis: how-to
product: workspace
audience: both
---
# Connect to a production PostgreSQL database

Get a read-only `psql`, DBeaver or pgAdmin session against a service's **production**
database using just-in-time (JIT) Entra access. Access is time-boxed, requires security
clearance, and is granted by an access package rather than a stored credential — there is
no password in any Key Vault for your user.

For **non-production**, use
[Connect to a non-production database](connect-to-a-nonprod-database.md) instead; that
route reads admin credentials from the service's vault and none of this applies.

PCS is used as the worked example throughout. Substitute your own product's server, group
and package names — the shape is identical because every service uses the same
[postgresql-flexible module](https://github.com/hmcts/terraform-module-postgresql-flexible).

## Prerequisites

- **Security clearance.** Requestor groups are SC-gated (`DTS CFT SC`), and you must be in
  `DTS CFT Developers` or `DTS SDS Developers`.
- **The access package must exist for your product.** If it doesn't, that is a one-off
  setup task — see [Set up JIT access for a new product](#set-up-jit-access-for-a-new-product).
- **VPN connected.** Production Flexible Server FQDNs resolve to private `10.x` addresses.
- `az login` done.

## Steps

### 1. Request the access package

Go to [My Access → Access packages](https://myaccess.microsoft.com/@CJSCommonPlatform.onmicrosoft.com#/access-packages)
and search for your product. The naming convention is:

```
Database - <product> read access - self approval
Database - <product> write access - self approval
```

For PCS: **Database - Possession Claims read access - self approval**.

Request it and supply the Jira or Halo link the form asks for. Read access with
`DTS CFT SC` as requestor is self-approving, so it grants immediately.

The package grants two resources:

| Resource | Why |
|---|---|
| `DTS JIT Access <product> DB Reader SC` | the Postgres role the database maps you onto |
| `DTS Production Bastion Access for Users` | the bastion, if you need to tunnel |

### 2. Re-login so the token carries the new group

**This step is not optional.** An access token minted before the assignment landed does
not carry the group, and the resulting failure is indistinguishable from a wrong password:

```
FATAL: password authentication failed for user "..."
```

```bash
az logout && az login
az account set --subscription DCD-CNP-Prod
```

Confirm the membership took:

```bash
az ad group member check \
  --group "$(az ad group list --display-name 'DTS JIT Access pcs DB Reader SC' --query '[0].id' -o tsv)" \
  --member-id "$(az ad signed-in-user show --query id -o tsv)"
```

Expect `"value": true`.

### 3. Find the server

```bash
az postgres flexible-server list --subscription DCD-CNP-Prod \
  --query "[?contains(name,'<product>')].{name:name, fqdn:fullyQualifiedDomainName, rg:resourceGroup}" -o table
```

For PCS:

```
Name      Fqdn                                  Rg
pcs-prod  pcs-prod.postgres.database.azure.com  pcs-data-prod
```

The database name is the `pgsql_databases` entry in the service's
`infrastructure/database.tf` — for PCS that is `var.product`, so `pcs`.

### 4. Connect

The password is a short-lived Entra access token, and **the username is the group name,
not your UPN** — see [Gotchas](#gotchas).

#### psql

```bash
PGSSLMODE=require \
PGPASSWORD=$(az account get-access-token --resource-type oss-rdbms --query accessToken -o tsv) \
psql -h pcs-prod.postgres.database.azure.com -p 5432 -d pcs -U "DTS JIT Access pcs DB Reader SC"
```

#### DBeaver

Copy the token to the clipboard first:

```bash
az account get-access-token --resource-type oss-rdbms --query accessToken -o tsv | tr -d '\n' | pbcopy
```

New connection → PostgreSQL:

| Field | Value |
|---|---|
| Host | `pcs-prod.postgres.database.azure.com` |
| Port | `5432` |
| Database | `pcs` |
| Authentication | **Database Native** |
| Username | `DTS JIT Access pcs DB Reader SC` |
| Password | paste the token |
| Save password | tick |
| SSL tab | Use SSL, mode `require` |

#### pgAdmin

pgAdmin 4's registration dialog has a password length limit the token overflows. Register
the server with **Connect now?** unticked and the password left **empty**, save, then
right-click → Connect: the password *prompt* has no such limit and accepts the full token.

## Gotchas

### The username is the group, not you

With group-based Entra access you authenticate **as the group**. `user=First.Last@HMCTS.NET`
fails with `password authentication failed` even though everything else is correct.

Nor is it `DTS Platform Operations SC` — that is the PlatOps administrative group, and you
are not in it. Use the group the access package actually granted you.

### Spaces break the psql connection string

`psql "... user=DTS JIT Access pcs DB Reader SC"` fails with:

```
psql: error: missing "=" after "JIT" in connection info string
```

The conninfo parser splits on whitespace. Use `-U "..."` flags as above, or escape the
spaces (`user=DTS\ JIT\ Access\ pcs\ DB\ Reader\ SC`) — inside double quotes the shell
leaves the backslashes for libpq to consume.

### DBeaver: "no password was provided by plugin null"

pgjdbc reporting that it received a null password. Either Authentication is set to
something other than **Database Native**, or the password field is empty with
**Save password** unticked. It is not a token or permissions problem.

### Strip the trailing newline

`| tr -d '\n'` before `pbcopy` matters. A pasted trailing newline produces a second,
different auth failure that looks like the token is wrong.

### The token expires after about an hour

There is no mid-session refresh. Re-mint and reconnect. In DBeaver, paste the new token
over the old one in Edit Connection.

### Connect to the right database

`postgres` exists but is empty, and pointing at it yields a confusing
`no pg_hba.conf entry` rather than an obvious error. Use the service's own database name.

### Reader access is `public` only

The module defaults `schemas_for_reader_access` to `["public"]`. If the tables you need
live in another schema, that requires a Terraform change in the service's
`infrastructure/`, not a larger access package.

### Bastion

Direct connection over the VPN normally works. If it doesn't, tunnel:

```bash
ssh bastion-prod.platform.hmcts.net -L 5440:pcs-prod.postgres.database.azure.com:5432
```

then point your client at `localhost:5440`. The access package already grants the bastion.
Running pgAdmin or DBeaver in Docker needs this route regardless, since the container
won't resolve the private FQDN.

## Set up JIT access for a new product

One-off, and it must be done **before** the database Terraform is created or updated,
because `enable_read_only_group_access` defaults to `true` and expects the group to exist.
Three merged PRs, in order:

1. **`hmcts/azure-access`** — add `DTS JIT Access <product> DB Reader SC` to
   [`users/groups.yml`](https://github.com/hmcts/azure-access/blob/master/users/groups.yml).
2. **`hmcts/azure-access-packages`** — add the group to the `Databases` catalog in
   `entitlement-catalogs.yml`, and the package itself to `entitlement-packages.yml`.
3. **The service repo** — the database Terraform maps the group to a Postgres role.

Order matters: the packages PR's Terraform plan resolves the group by display name, so it
fails until the `azure-access` PR is merged. Re-run the pipeline after that lands.

Write access is the same three steps with `DB Writer SC` and
`enable_write_group_access = true`, and should only be enabled where it is needed and
approved.

Worked example — PCS, September 2026:
[azure-access#8093](https://github.com/hmcts/azure-access/pull/8093),
[azure-access-packages#145](https://github.com/hmcts/azure-access-packages/pull/145),
[pcs-api#2666](https://github.com/hmcts/pcs-api/pull/2666).

## Related

- [Connect to a non-production database](connect-to-a-nonprod-database.md)
- [Database infrastructure](database-infrastructure.md#production-access)
- [postgresql-flexible module](https://github.com/hmcts/terraform-module-postgresql-flexible#access-to-databases)
- [CNP production access](https://hmcts.github.io/cloud-native-platform/infrastructure/database/#production-access)
