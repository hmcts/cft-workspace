---
name: find-endpoint
description: Find which HMCTS API service exposes a given HTTP path. Searches the local clone of cnp-api-docs (platops/cnp-api-docs/docs/specs/*.json) for matching OpenAPI paths and reports the owning service, methods, the local spec file, the hosted Swagger UI link, and (if known) the workspace product that publishes it. Use when the user asks "which service has POST /cases/{id}/...", "what exposes /hearings", "where is /case-types defined", etc.
---

# Find an API endpoint

Locate which HMCTS service exposes an HTTP path by searching the OpenAPI specs published to [`hmcts/cnp-api-docs`](https://github.com/hmcts/cnp-api-docs). The repo is cloned locally at `platops/cnp-api-docs/`.

## When to use

- "Which service has `POST /cases/{caseId}/events`?"
- "What exposes `/hearings`?"
- "Where is `/case-types` defined?"
- "Find every service with a `/health` endpoint."

## When NOT to use

- For *which products* use a CCD feature — `/find-feature` (operates on `INDEX.md`).
- For an explanation of a CCD concept — `/ccd-explain`.
- For a *summary* of one service's API — `/api-spec`.

## Inputs

`$ARGUMENTS` is one of:

- `<METHOD> <path-pattern>` — e.g. `POST /cases`, `GET /hearings/{id}`.
- `<path-pattern>` alone — e.g. `/cases/{caseId}/events` (matches any method).
- A bare token — e.g. `noticeofchange` (loose substring match against path keys).

`path-pattern` is treated as a substring; OpenAPI path parameters like `{caseId}` are matched literally if present.

## Procedure

1. **Confirm the local clone is present.**
   ```bash
   [ -d platops/cnp-api-docs/docs/specs ] || {
       echo "platops/cnp-api-docs not cloned. Run: ./scripts/add-repo platops/cnp-api-docs hmcts/cnp-api-docs"
       exit 1
   }
   ```

2. **Parse the input.** Split off an HTTP method (`GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS`) if present; the rest is the path pattern. Lowercase the method.

3. **Scan specs.** For each `platops/cnp-api-docs/docs/specs/*.json`:
   ```bash
   yq -p=json -o=json '.paths | keys | .[]' "$spec" 2>/dev/null
   ```
   Filter path keys whose string contains the pattern (case-sensitive — OpenAPI paths are case-sensitive). For each matching path, list the operations:
   ```bash
   yq -p=json -o=json ".paths[\"$path\"] | keys | .[]" "$spec"
   ```
   Skip non-HTTP keys (`parameters`, `summary`, `description`).
   If a method filter was given, keep only matching operations.

4. **Resolve the owning product.** Map the spec filename → workspace product by greping every `<product>/CLAUDE.md` for the spec filename in its `api_specs:` list:
   ```bash
   grep -lF "<spec-filename>" apps/*/CLAUDE.md libs/CLAUDE.md platops/CLAUDE.md 2>/dev/null
   ```
   If no match: the spec is published by a repo not cloned in this workspace — report it as `(not in workspace)`.

5. **Render the results.** Group by spec. For each hit:
   - Spec filename + which product publishes it (or `(not in workspace)`).
   - Each matching path with its method(s) and (if available) the operation's `summary`.
   - Local file path: `platops/cnp-api-docs/docs/specs/<filename>`.
   - Hosted Swagger UI link: `https://hmcts.github.io/cnp-api-docs/swagger.html?url=https://hmcts.github.io/cnp-api-docs/specs/<filename>`.

## Output format

```
Found <N> match(es) for <method> <pattern>:

1. ccd-data-store-api.v2_external.json  (product: apps/ccd)
     POST  /cases/{caseId}/events    — Submit an event for a case
   local: platops/cnp-api-docs/docs/specs/ccd-data-store-api.v2_external.json
   docs:  https://hmcts.github.io/cnp-api-docs/swagger.html?url=https://hmcts.github.io/cnp-api-docs/specs/ccd-data-store-api.v2_external.json

2. aac-manage-case-assignment.json  (product: apps/ccd)
     POST  /cases/{caseId}/events    — Proxy to data store
   ...
```

If there are many hits (>10), summarise: list the spec + path + method, but skip the operation summary and links.

If there are zero hits:

```
No paths matching "<pattern>" found across 181 specs in platops/cnp-api-docs/docs/specs/.

Common reasons:
- Try a shorter substring (e.g. "cases" instead of "/cases/{caseId}/events").
- Drop the method filter to see paths with any method.
- The endpoint may not be in the published spec — some services publish only public paths.
```

## Don't

- Don't read entire spec JSON files into your context — they can be megabytes. Use `yq -p=json` or `jq` to extract only what you need, one path at a time.
- Don't auto-fetch specs from GitHub. Always use the local clone. If it's missing, tell the user to clone it.
- Don't invent paths or guess. If `yq` returns nothing, report nothing.
- Don't conflate `pcs-api.json`, `pcsAPI.json`, and `pcs-backend-api.json` — they are separate published files and may all match. Report each separately.
