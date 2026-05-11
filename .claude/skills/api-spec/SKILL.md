---
name: api-spec
description: Summarise one HMCTS service's OpenAPI spec from the local clone of cnp-api-docs (platops/cnp-api-docs/docs/specs/). Reports title, version, auth, endpoint count by tag, owning product, hosted Swagger UI link, and local file path. Use when the user asks "what does pcs-api expose", "summarise ccd-data-store-api", "what auth does X use", "show me the endpoints of Y".
---

# Summarise an API spec

Give a one-screen overview of a single HMCTS service's OpenAPI spec from the local clone at `platops/cnp-api-docs/docs/specs/`.

## When to use

- "What does `pcs-api` expose?"
- "Summarise `ccd-data-store-api`."
- "What auth does `aac-manage-case-assignment` use?"
- "How many endpoints does `civil-service` have?"

## When NOT to use

- For *which service has a given path* — `/find-endpoint`.
- For an explanation of a CCD concept — `/ccd-explain`.

## Inputs

`$ARGUMENTS` is a service name. Match flexibly:

- Exact filename minus `.json` (e.g. `pcs-api`) — preferred.
- Substring (e.g. `pcs`) — resolves to all matching specs.
- A versioned variant suffix (e.g. `ccd-data-store-api.v2_internal`) — preferred for multi-version services.

If the user just says "pcs", show *all* matching specs (some services publish multiple — e.g. `pcs-api.json`, `pcsAPI.json`, `pcs-backend-api.json`; CCD data store publishes four versioned variants).

## Procedure

1. **Confirm the local clone is present.**
   ```bash
   [ -d platops/cnp-api-docs/docs/specs ] || {
       echo "platops/cnp-api-docs not cloned. Run: ./scripts/add-repo platops/cnp-api-docs hmcts/cnp-api-docs"
       exit 1
   }
   ```

2. **Resolve the spec file(s).**
   ```bash
   ls platops/cnp-api-docs/docs/specs/ | grep -F "$ARGUMENTS" | head -10
   ```
   If zero matches, suggest a shorter substring and list a few candidates by `ls | grep -i` (case-insensitive). If many matches and the user gave an unambiguous-looking token, prefer the exact match.

3. **For each resolved spec, extract a fixed set of summary fields.** Use `yq` for the simple top-level scalars and `jq` for the tag grouping (the workspace's `yq` is mikefarah/yq, not jq-compatible; both are on PATH and allowed by `.claude/settings.json`).

   ```bash
   spec="platops/cnp-api-docs/docs/specs/<name>.json"

   # Summary fields — yq is fine for flat extraction
   yq -p=json -o=json '{
     "title": .info.title,
     "version": .info.version,
     "description": .info.description,
     "spec_version": (.openapi // .swagger),
     "server_count": (.servers // [] | length),
     "first_server": (.servers // [.host])[0],
     "path_count": (.paths | length),
     "tag_count": (.tags // [] | length),
     "auth_schemes": (.components.securitySchemes // .securityDefinitions // {} | keys)
   }' "$spec"

   # Endpoint count grouped by first tag — use jq (yq syntax can't group_by here)
   jq -r '
     [ .paths | to_entries[] | .value | to_entries[]
       | select(.key | test("^(get|post|put|patch|delete|head|options)$"))
       | (.value.tags // [""])[0] ]
     | group_by(.) | map({tag: .[0], count: length}) | sort_by(-.count)
     | .[] | "  \(.count)\t\(.tag // "(untagged)")"
   ' "$spec"
   ```

   Keep payload small — never dump the whole spec.

4. **Resolve the owning product.** Grep for the spec filename in `apps/*/CLAUDE.md`, `libs/CLAUDE.md`, `platops/CLAUDE.md` `api_specs:` lists:
   ```bash
   grep -lF "<filename>" apps/*/CLAUDE.md libs/CLAUDE.md platops/CLAUDE.md 2>/dev/null
   ```
   If no match, mark `(not in workspace)` — the spec is published by a repo not cloned here.

5. **Render the summary.** Use the format below; keep it scannable.

## Output format

```
ccd-data-store-api.v2_internal  (product: apps/ccd)

  Title:    CCD Data Store API
  Version:  v2.4.0
  Spec:     OpenAPI 3.0.1
  Server:   https://ccd-data-store-api.aat.platform.hmcts.net (1 server)
  Paths:    30 endpoints across 6 tags
  Auth:     ServiceAuthorization, AuthorizationToken (header)

  Endpoints by tag:
    8  Case
    7  Event
    5  Internal Search
    4  Document
    4  Decentralised
    2  Health

  Local file: platops/cnp-api-docs/docs/specs/ccd-data-store-api.v2_internal.json
  Docs:       https://hmcts.github.io/cnp-api-docs/swagger.html?url=https://hmcts.github.io/cnp-api-docs/specs/ccd-data-store-api.v2_internal.json
```

If multiple specs match, render each as its own block separated by a blank line.

If `description` is long, trim to ~200 chars. Skip `description` if blank/null.

## Don't

- Don't `cat` the whole spec into your context. Always go through `yq -p=json` with a focused expression.
- Don't fabricate values. If `yq` returns null/empty for a field, omit it from the rendered summary.
- Don't load every spec when the substring matches many — cap at 10 and tell the user to narrow.
- Don't run network calls. The local clone is authoritative; refresh with `./scripts/sync platops/cnp-api-docs`.
