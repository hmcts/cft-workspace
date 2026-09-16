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

Three parts of that name vary, not just the prefix: the prefix itself
(`professional-api-` in `rd-aat`, but bare `api-` in `pcs-perftest`), the **case**, and the
**last segment**. `dtsse-aat` is lowercase throughout and spells the password secret
`password` rather than `PASS`:

```
github-metrics-postgres-host
github-metrics-postgres-port
github-metrics-postgres-database
github-metrics-postgres-user
github-metrics-postgres-password
```

So list them rather than guessing — and match case-insensitively, because
`contains(name,'POSTGRES')` finds nothing at all in a vault named this way:

```bash
az keyvault secret list --vault-name dtsse-aat \
  --query "[?contains(lower(name),'postgres')].name" -o tsv
```

Listing can return **more than one service's credentials**: `dtsse-aat` holds a bare
`postgres-*` group belonging to a different consumer alongside the `github-metrics-postgres-*`
group. The prefix is the only thing that distinguishes them, so take all five values from a
single prefix rather than whichever secret matched first.

If the vault has no postgres secrets at all, check the service's
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

All five in one go, mapping each secret suffix to its `PG*` variable — here for the lowercase
`dtsse-aat` naming:

```bash
eval "$(for f in host:HOST port:PORT database:DATABASE user:USER password:PASSWORD; do
  printf 'export PG%s=%q\n' "${f#*:}" \
    "$(az keyvault secret show --vault-name dtsse-aat --name "github-metrics-postgres-${f%%:*}" --query value -o tsv)"
done; echo 'export PGSSLMODE=require')"
```

The `%q` is load-bearing: these passwords are 20 characters of generated output and can contain
shell metacharacters, which a bare `$(…)` inside the `eval` would mangle or expand.

Wrap it in a shell function if you do this often. Resolve the real secret names from the vault
first, so the same call works whichever naming convention the vault uses:

```bash
# Usage: pgenv rd-perftest professional-api   -> professional-api-POSTGRES-PASS
#        pgenv dtsse-aat   github-metrics     -> github-metrics-postgres-password
pgenv() {
  local vault=$1 prefix=$2 names field name v
  names=$(az keyvault secret list --vault-name "$vault" \
    --query "[?contains(lower(name),'postgres')].name" -o tsv) || return 1
  for field in HOST PORT DATABASE USER 'PASSWORD|PASS'; do
    name=$(printf '%s\n' "$names" | grep -iE "^$prefix-postgres-($field)$" | head -1)
    [ -n "$name" ] || { echo "pgenv: no $field secret for '$prefix' in $vault" >&2; return 1; }
    v=$(az keyvault secret show --vault-name "$vault" --name "$name" --query value -o tsv) || return 1
    case $field in
      'PASSWORD|PASS') export PGPASSWORD="$v" ;;
      *)               export "PG$field"="$v" ;;
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

## Passfiles and GUI clients

Exporting `PGPASSWORD` is fine for a one-off `psql`, but once you also want a GUI, a passfile
is the better store: `psql` and pgAdmin read the same file, so the credential is configured
once, and it stays out of your shell history and out of the environment.

Write `~/.pgpass` with one line per server, `host:port:database:user:password`:

```bash
umask 077
printf '%s:5432:github_metrics:pgadmin:%s\n' \
  dts-github-metrics-aat.postgres.database.azure.com \
  "$(az keyvault secret show --vault-name dtsse-aat --name github-metrics-postgres-password --query value -o tsv)" \
  >> ~/.pgpass
```

`*` is a valid wildcard in any field except the password, which is useful when one server hosts
several databases.

Set `umask 077` **before** writing the file rather than `chmod 600`-ing it afterwards, so it is
never even briefly world-readable. The `0600` requirement is a hard failure with a misleading
symptom: at `644` libpq does not error, it warns and falls back to prompting for a password.

```
WARNING: password file "/home/you/.pgpass" has group or world access; permissions should be u=rw (0600) or less
```

On the command line you at least see the warning. In a GUI you don't — you just get an
unexplained password prompt on a connection you thought was fully configured.

With the file in place, the passfile can be the only credential source — `PGPASSWORD` unset,
nothing but `PGPASSFILE` (or the default `~/.pgpass`) supplying the password:

```bash
unset PGPASSWORD
export PGPASSFILE=~/.pgpass
psql "host=dts-github-metrics-aat.postgres.database.azure.com port=5432 \
  dbname=github_metrics user=pgadmin sslmode=require" \
  -c "select current_user, current_database()"
```

```
 current_user | current_database
--------------+------------------
 pgadmin      | github_metrics
```

If that hangs or the hostname doesn't resolve, it's the [VPN](#prerequisites), not the passfile.

### pgAdmin

Register the server as usual, then on its **Properties → Parameters** tab add `passfile` = the
path to the file and `sslmode` = `require`, and leave the password field on the **Connection**
tab blank. On older pgAdmin 4 builds these fields are under **Advanced** instead.

This only works in pgAdmin **desktop** mode. In container / web / server mode the `passfile`
path is resolved on the machine pgAdmin itself runs on, not the one your browser is on, so
`~/.pgpass` simply isn't found unless you mount it into the container. Use pgAdmin's own
encrypted "Save password" there instead.

DBeaver is often configured the same way, but its PostgreSQL driver is JDBC rather than libpq,
so passfile support there is unverified — fall back to DBeaver's own credentials store.

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
