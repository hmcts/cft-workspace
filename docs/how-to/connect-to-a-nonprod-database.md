---
title: Connect to a non-production PostgreSQL database
topic: connect-to-a-nonprod-database
diataxis: how-to
product: workspace
audience: both
---
# Connect to a non-production PostgreSQL database

Get a `psql` session against a service's AAT / perftest / demo / ithc database by reading
the admin credentials out of the service's Key Vault. Useful for inspecting or fixing test
fixture data when a functional test fails on environment state rather than code.

For **production**, do not use this page — production access is JIT-only via Entra access
packages. See [Database infrastructure](database-infrastructure.md#production-access).

## Prerequisites

- **VPN connected.** Flexible Server FQDNs resolve to private `10.x` addresses; without the
  VPN the hostname either won't resolve or will time out.
- `az login` done. The active subscription **does not matter** — see
  [Subscriptions don't matter here](#subscriptions-dont-matter-here).
- `psql` installed (`sudo apt install postgresql-client`).

## Steps

### 1. Find the vault and secret prefix

Credentials live in the service's per-environment Key Vault, named `<product>-<env>`
— `rd-aat`, `rd-perftest`, `pcs-perftest`, `em-demo`, and so on. Inside it, five secrets
carry the whole connection, prefixed by the Terraform `component` (**not** the product):

```
<component>-POSTGRES-HOST
<component>-POSTGRES-PORT
<component>-POSTGRES-DATABASE
<component>-POSTGRES-USER
<component>-POSTGRES-PASS
```

List them rather than guessing the prefix — it varies more than you'd expect
(`professional-api-` in `rd-aat`, but bare `api-` in `pcs-perftest`):

```bash
az keyvault secret list --vault-name rd-perftest \
  --query "[?contains(name,'POSTGRES')].name" -o tsv
```

If the vault has no `POSTGRES-*` secrets at all, check the service's
`infrastructure/*.tf` for the `azurerm_key_vault_secret` resources — a few services deviate
(`-POSTGRES-PASS-FLEX`, `-POSTGRES-PASS-V15`, or a differently-named vault).

### 2. Export the connection and connect

```bash
export PGHOST=$(az keyvault secret show --vault-name rd-perftest --name professional-api-POSTGRES-HOST     --query value -o tsv)
export PGPORT=$(az keyvault secret show --vault-name rd-perftest --name professional-api-POSTGRES-PORT     --query value -o tsv)
export PGDATABASE=$(az keyvault secret show --vault-name rd-perftest --name professional-api-POSTGRES-DATABASE --query value -o tsv)
export PGUSER=$(az keyvault secret show --vault-name rd-perftest --name professional-api-POSTGRES-USER     --query value -o tsv)
export PGPASSWORD=$(az keyvault secret show --vault-name rd-perftest --name professional-api-POSTGRES-PASS --query value -o tsv)
export PGSSLMODE=require

psql -c "select current_user, current_database(), version();"
```

`PGSSLMODE=require` is not optional — Flexible Server rejects unencrypted connections, and
the resulting error mentions `pg_hba.conf` rather than TLS, which sends you down the wrong path.

Wrap it in a shell function if you do this often:

```bash
# Usage: pgenv rd-perftest professional-api
pgenv() {
  local vault=$1 prefix=$2
  for f in HOST PORT DATABASE USER PASS; do
    local v; v=$(az keyvault secret show --vault-name "$vault" --name "$prefix-POSTGRES-$f" --query value -o tsv) || return 1
    case $f in
      PASS) export PGPASSWORD="$v" ;;
      *)    export "PG$f"="$v" ;;
    esac
  done
  export PGSSLMODE=require
}
```

### 3. Set the search path if the service doesn't use `public`

Several services put their tables in a named schema. `\dt` against the default search path
then shows an **empty-looking but real** set of tables — the Flyway-created shells in
`public` — and every query returns `0 rows`, which reads exactly like "the data isn't there".

Known cases: `rd-*` uses `dbrefdata`, `rd-commondata-api` uses `dbcommondata`.

```sql
set search_path = dbrefdata;
```

To check where the data actually is:

```sql
select schemaname, relname, n_live_tup
from pg_stat_user_tables order by n_live_tup desc limit 10;
```

`psql` backslash commands ignore `search_path` set in the same `-c`, so schema-qualify them
instead: `\d dbrefdata.professional_user`.

## Writing data

Non-production databases hold fixture state that functional and E2E tests assert against, so
other people's test runs share them. When correcting fixture data:

- Wrap the change in `begin; … commit;` with the verification `select` inside the transaction,
  so you can `rollback` if the row count is wrong.
- Constrain the `where` clause on more than the primary key (add the email / identifier the
  fixture is known by) so a stale UUID can't silently update the wrong row.
- Use `psql -v ON_ERROR_STOP=1` with heredocs — otherwise a failed statement mid-script is
  skipped and the `commit` still lands.

```bash
psql -v ON_ERROR_STOP=1 <<'SQL'
set search_path = dbrefdata;
begin;
update professional_user set organisation_id = '…', last_updated = now()
where id = '…' and email_address = 'someone@test.com';
select … ;  -- eyeball before the commit
commit;
SQL
```

Also check whether the consuming service caches what you changed — several cache reference
data lookups for a minute or so, so a re-run immediately after the update can still see the
old value.

## Gotchas

### Subscriptions don't matter here

`az keyvault secret show` and `az keyvault secret list` go to the vault's **data plane**,
addressed by DNS, so they work whatever `az account show` says. Only control-plane calls
(`az keyvault show`, anything listing vaults) resolve through ARM and need the right
subscription selected:

```
$ az account show --query name -o tsv
DCD-CNP-DEV
$ az keyvault secret show --vault-name rd-perftest --name professional-api-POSTGRES-USER --query value -o tsv
pgadmin                                          # works
$ az keyvault show --name rd-perftest --query name -o tsv
ERROR: The Vault 'rd-perftest' not found within subscription.   # needs DCD-CFTAPPS-TEST
```

So you don't need `az account set` for this recipe — but do remember the environment→
subscription mapping if you go looking at the server in the portal, because it isn't what
you'd guess (AAT lives in `DCD-CFTAPPS-STG`, perftest in `DCD-CFTAPPS-TEST`). See
[CNP environments](../reference/cnp-environments.md).

### AAD token auth fails on these servers

Authenticating as yourself with an access token looks like it should work and doesn't:

```bash
export PGUSER="First.Last@HMCTS.NET"
export PGPASSWORD="$(az account get-access-token --resource https://ossrdbms-aad.database.windows.net --query accessToken -o tsv)"
```

```
FATAL: password authentication failed for user "First.Last@HMCTS.NET"
FATAL: no pg_hba.conf entry for host "10.x.x.x", user "First.Last@HMCTS.NET", database "postgres"
```

Your account isn't an Entra admin on non-prod flexible servers, and non-prod services
generally don't enable the JIT reader/writer group access that would map you to a role
(`enable_read_only_group_access` / `enable_write_group_access` in the
[postgresql-flexible module](https://github.com/hmcts/terraform-module-postgresql-flexible#access-to-databases)).
Use the vault's `pgadmin` credentials instead. AAD tokens are the right mechanism for
**production**, alongside an access package.

Note the second error line also names the wrong database — `postgres` exists but is empty.
Always take `PGDATABASE` from the vault.

### VPN connected after the devcontainer started

If you work in the devcontainer and connected the VPN afterwards, internal hostnames return
NXDOMAIN inside the container even though they resolve on the host. Rebuild the container.
