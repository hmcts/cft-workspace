#!/usr/bin/env bash
# Shared environment resolution for the PCS case tooling. Sourced by create-case
# and manage-case; it is not runnable on its own.
#
# Holds the four things both scripts would otherwise get wrong: the per-environment
# URL map (which differs in shape between local, preview and the named CNP envs),
# which IDAM users exist where, the Key Vault lookups, and the translation from an
# HTTP status to a cause worth acting on.
#
# A plugin runs from ~/.claude/plugins/cache/, so scripts/lib/_cft.sh in the
# workspace root is not reachable from here. The logging vocabulary and
# require_internal_dns are deliberately re-declared rather than shared.

# ---------------------------------------------------------------------------
# Logging. Everything goes to stderr so stdout stays a clean channel for the
# result — a JSON object under --json, a table under --list.
# ---------------------------------------------------------------------------

if [[ -t 2 && -z "${NO_COLOR:-}" ]]; then
    C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'; C_GRN=$'\033[32m'
    C_YEL=$'\033[33m'; C_RED=$'\033[31m'; C_RESET=$'\033[0m'
else
    C_BOLD=""; C_DIM=""; C_GRN=""; C_YEL=""; C_RED=""; C_RESET=""
fi

log()  { printf '%s\n' "$*" >&2; }
ok()   { printf '%s%s%s\n' "$C_GRN" "$*" "$C_RESET" >&2; }
warn() { printf '%s%s%s\n' "$C_YEL" "$*" "$C_RESET" >&2; }
err()  { printf '%s%s%s\n' "$C_RED" "$*" "$C_RESET" >&2; }
die()  { err "$*"; exit 1; }

# Commentary that --json callers don't want interleaved with progress noise.
note() { (( JSON_OUT )) || log "$*"; }

require_tools() {
    local missing=() t
    for t in "$@"; do
        command -v "$t" >/dev/null 2>&1 || missing+=("$t")
    done
    (( ${#missing[@]} == 0 )) || die "not on PATH: ${missing[*]}"
}

# The core-compute hosts only resolve over the VPN, and a devcontainer snapshots
# DNS at start — so connecting the VPN afterwards looks like NXDOMAIN forever.
require_internal_dns() {
    local host="$1"
    if command -v getent >/dev/null; then
        getent hosts "$host" >/dev/null 2>&1
    else
        dscacheutil -q host -a name "$host" 2>/dev/null | grep -q ip_address
    fi || die "cannot resolve $host — connect the VPN.
If you connected it after starting the devcontainer, rebuild the container."
}

# ---------------------------------------------------------------------------
# Environment resolution
# ---------------------------------------------------------------------------

# Set by resolve_env.
ENV_SLUG=""        # local | preview | aat | demo | perftest | ithc
ENV_LABEL=""       # what to print, e.g. "preview-1234"
ENV_KIND=""        # local | preview | named
PR_NUMBER=""
VAULT=""
TESTING_SUPPORT=0  # is /testing-support served in this environment?

# CNP environments whose service URLs follow the standard patterns. Mirrors
# NIGHTLY_ENV_SLUGS in pcs-api/src/e2eTest/config/global-setup.config.ts.
NAMED_ENVS="aat demo perftest ithc"

resolve_env() {
    local arg
    arg="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"

    case "$arg" in
        prod|production)
            die "this tooling does not touch production." ;;
        local)
            resolve_env_local ;;
        preview-*)
            PR_NUMBER="${arg#preview-}"
            [[ "$PR_NUMBER" =~ ^[0-9]+$ ]] \
                || { err "preview needs a PR number, e.g. preview-1234 (got: $1)"; exit 2; }
            resolve_env_preview ;;
        preview)
            err "preview needs a PR number: preview-1234"
            exit 2 ;;
        aat|demo|perftest|ithc)
            ENV_SLUG="$arg"
            resolve_env_named ;;
        *)
            err "unknown environment: $1"
            log "valid: local, preview-<PR>, aat, demo, perftest, ithc"
            exit 2 ;;
    esac
}

resolve_env_local() {
    ENV_SLUG="local"; ENV_LABEL="local"; ENV_KIND="local"
    VAULT=""

    # Ports are fixed by the cftlib bootstrapper and pcs-api's own config, not by
    # anything overridable — see libs/rse-cft-lib bootstrapper LibRunner and
    # pcs-api/build.gradle's CftlibExec block.
    export DATA_STORE_URL_BASE="http://localhost:4452"
    export CASE_API_URL="http://localhost:3206"
    export MANAGE_CASE_BASE_URL="http://localhost:3000"
    export IDAM_WEB_URL="http://localhost:5062"
    export IDAM_TESTING_SUPPORT_URL="http://localhost:5062"
    export S2S_URL="http://localhost:8489/testing-support/lease"

    # The local CCD data-store validates document URLs against
    # ccd.document.url.pattern, which bootWithCCD leaves at the upstream default —
    # and that only accepts dm-store:8080. Pointing at AAT's dm-store makes every
    # document-bearing fixture fail validation, so use the host the pattern expects.
    #
    # Nothing is fetched: DocumentValidator only matches the URL, so the documents
    # themselves need not exist locally. The references are dangling, which is fine
    # for exercising case data.
    apply_dm_store "http://dm-store:8080"

    # bootWithCCD sets ENABLE_TESTING_SUPPORT=true for every CftlibExec task.
    TESTING_SUPPORT=1

    # The IDAM simulator only knows the users CftlibConfig seeds, and rejects
    # anything else with a 401. The AAT E2E users are not among them.
    export PCS_CLAIMANT_EMAIL="pcs-solicitor1@test.com"
    export PCS_ADMIN_EMAIL="pcs-hearing-centre-team-leader-01@localhost"
    export PCS_CASEWORKER_EMAIL="caseworker@pcs.com"

    # The simulator checks neither the password nor the client secret; it only
    # needs them non-empty because IdamUtils sends them.
    export PCS_IDAM_PASSWORD="password"
    export PCS_IDAM_CLIENT_ID="pcs-api"
    export PCS_IDAM_CLIENT_SECRET="local"
}

resolve_env_preview() {
    ENV_SLUG="preview"; ENV_LABEL="preview-$PR_NUMBER"; ENV_KIND="preview"

    # Preview app URLs are public, but IDAM and S2S are not deployed per-PR —
    # they fall back to AAT, which is why the VPN is still needed here and why
    # the vault is pcs-aat rather than pcs-preview.
    VAULT="pcs-aat"
    export DATA_STORE_URL_BASE="https://ccd-data-store-api-pcs-api-pr-${PR_NUMBER}.preview.platform.hmcts.net"
    export CASE_API_URL="https://pcs-api-pr-${PR_NUMBER}.preview.platform.hmcts.net"
    export MANAGE_CASE_BASE_URL="https://xui-pcs-api-pr-${PR_NUMBER}.preview.platform.hmcts.net"
    export IDAM_WEB_URL="https://idam-api.aat.platform.hmcts.net"
    export IDAM_TESTING_SUPPORT_URL="https://idam-testing-support-api.aat.platform.hmcts.net"
    export S2S_URL="http://rpe-service-auth-provider-aat.service.core-compute-aat.internal/testing-support/lease"

    # Preview has no dm-store of its own; the suites fall back to AAT.
    apply_dm_store "http://dm-store-aat.service.core-compute-aat.internal"

    # values.preview.template.yaml sets ENABLE_TESTING_SUPPORT: true.
    TESTING_SUPPORT=1
    resolve_aat_users
}

resolve_env_named() {
    local e="$ENV_SLUG"
    ENV_LABEL="$e"; ENV_KIND="named"
    VAULT="pcs-$e"

    export DATA_STORE_URL_BASE="http://ccd-data-store-api-${e}.service.core-compute-${e}.internal"
    export CASE_API_URL="http://pcs-api-${e}.service.core-compute-${e}.internal"
    export MANAGE_CASE_BASE_URL="https://manage-case.${e}.platform.hmcts.net"
    export IDAM_WEB_URL="https://idam-api.${e}.platform.hmcts.net"
    export IDAM_TESTING_SUPPORT_URL="https://idam-testing-support-api.${e}.platform.hmcts.net"
    export S2S_URL="http://rpe-service-auth-provider-${e}.service.core-compute-${e}.internal/testing-support/lease"

    apply_dm_store "http://dm-store-${e}.service.core-compute-${e}.internal"

    # ENABLE_TESTING_SUPPORT is set for aat, demo and perftest in
    # cnp-flux-config/apps/pcs/pcs-api/*.yaml. ithc.yaml does not set it, so
    # everything under /testing-support 404s there.
    case "$e" in
        aat|demo|perftest) TESTING_SUPPORT=1 ;;
        ithc)              TESTING_SUPPORT=0 ;;
    esac
    resolve_aat_users
}

# Several fixtures carry documents, whose URLs are built from a document-store base
# at module load. pcs-api's modules read DM_STORE and pcs-frontend's read
# DM_STORE_URL, so both have to be set to the same value — miss one and the payload
# goes out with "undefined/documents/<uuid>", which the callback rejects.
#
# The referenced documents are pre-existing uploads in the environment's dm-store,
# addressed by hard-coded UUID. If one has been reaped, those fixtures fail however
# the URL is built.
apply_dm_store() {
    local base="$1"
    export DM_STORE="$base"
    export DM_STORE_URL="$base"
}

# The permanent, pre-provisioned users the E2E suites rely on. See
# pcs-api/src/e2eTest/data/user-data/permanent.user.data.ts.
resolve_aat_users() {
    export PCS_CLAIMANT_EMAIL="pcs-solicitor-user01@test.com"
    export PCS_ADMIN_EMAIL="pcs-hearing-centre-administrator-01@justice.gov.uk"

    # The CTSC staff admin, not the suite's 'caseworker' user. CASE_NOTE_ROLES is
    # a set of AM organisational roles, and pcs-caseworker@test.com holds none of
    # them for this case type — CCD answers "No case type found" rather than 403.
    export PCS_CASEWORKER_EMAIL="pcs-ctsc-admin-01@justice.gov.uk"
    export PCS_IDAM_CLIENT_ID="pcs-api"
}

# ---------------------------------------------------------------------------
# Case type
# ---------------------------------------------------------------------------

# CASE_TYPE_SUFFIX is empty in every environment, including preview and local, so
# the case type is plain PCS. The suffix only matters on AAT, where the definition
# is imported twice and the PCS-staging copy is served by pcs-api-staging.
#
# Both variables have to carry the same value: createCaseWales.api.data.ts builds
# its endpoint from PCS_API_CHANGE_ID while the event-token GET uses
# getCaseTypeId(), which reads CASE_TYPE_SUFFIX. Export only one and the two calls
# address different case types, so the token comes back invalid.
apply_case_type_suffix() {
    local suffix="${1:-}"
    export CASE_TYPE_SUFFIX="$suffix"
    export PCS_API_CHANGE_ID="$suffix"

    if [[ -z "$suffix" ]]; then
        export PCS_CASE_TYPE="PCS"
        return 0
    fi

    export PCS_CASE_TYPE="PCS-$suffix"

    # A suffixed case type is served by its own pcs-api deployment — on AAT the
    # PCS-staging definition points at pcs-api-staging, not pcs-api-aat. Without
    # this, the callbacks would be answered by the instance registered for the
    # unsuffixed case type, and the fee-payment calls would address the wrong one.
    if [[ "$ENV_KIND" == "named" ]]; then
        export CASE_API_URL="https://pcs-api-${suffix}.${ENV_SLUG}.platform.hmcts.net"
        note "${C_DIM}Case type $PCS_CASE_TYPE — using $CASE_API_URL${C_RESET}"
    fi
}

# ---------------------------------------------------------------------------
# Secrets
# ---------------------------------------------------------------------------

# Only three, all from vault pcs-<env>, and only for the non-local environments.
# Anything already exported is left alone so a caller can bypass Azure entirely.
resolve_secrets() {
    [[ "$ENV_KIND" == "local" ]] && return 0

    # The password contains a $, so it is captured into a quoted variable and
    # never passed through eval or a re-quoting layer.
    if [[ -z "${IDAM_PCS_USER_PASSWORD:-}" && -n "${IDAM_PCS_USER_PASSWORD_B64:-}" ]]; then
        IDAM_PCS_USER_PASSWORD="$(printf '%s' "$IDAM_PCS_USER_PASSWORD_B64" | base64 -d)"
        export IDAM_PCS_USER_PASSWORD
    fi

    vault_secret PCS_API_IDAM_SECRET          pcs-api-idam-secret
    vault_secret IDAM_PCS_USER_PASSWORD       idam-pcs-user-password
    vault_secret PCS_SOLICITOR_AUTOMATION_UID pcs-solicitor-automation-uid

    export PCS_IDAM_PASSWORD="$IDAM_PCS_USER_PASSWORD"
    export PCS_IDAM_CLIENT_SECRET="$PCS_API_IDAM_SECRET"
}

# Azure is only required for the secrets that are not already exported, so the
# tooling stays usable with all three set by hand and no az login at all.
require_azure() {
    [[ -n "${AZURE_CHECKED:-}" ]] && return 0
    require_tools az
    az account show >/dev/null 2>&1 \
        || die "not logged in to Azure — run: az login
Alternatively export PCS_API_IDAM_SECRET, IDAM_PCS_USER_PASSWORD and
PCS_SOLICITOR_AUTOMATION_UID yourself and no Azure access is needed."
    AZURE_CHECKED=1
}

vault_secret() {
    local var="$1" name="$2" value
    [[ -n "${!var:-}" ]] && return 0

    require_azure
    note "${C_DIM}Reading $name from $VAULT …${C_RESET}"
    value="$(az keyvault secret show --vault-name "$VAULT" --name "$name" \
             --query value -o tsv 2>/dev/null)" \
        || die "could not read $name from vault $VAULT.
Check your access with: az keyvault secret list --vault-name $VAULT -o tsv --query '[].name'"

    [[ -n "$value" ]] || die "$name is empty in vault $VAULT"
    declare -g "$var=$value"
    export "$var"
}

# ---------------------------------------------------------------------------
# Preflight
# ---------------------------------------------------------------------------

preflight_reachable() {
    case "$ENV_KIND" in
        local)   preflight_local ;;
        preview) preflight_preview ;;
        named)   require_internal_dns "ccd-data-store-api-${ENV_SLUG}.service.core-compute-${ENV_SLUG}.internal" ;;
    esac
}

preflight_local() {
    require_tools curl
    curl -sf -o /dev/null --max-time 5 "$IDAM_WEB_URL/health" 2>/dev/null || die \
"the local cftlib stack isn't up — run ./gradlew bootWithCCD in apps/pcs/pcs-api.

It is ready when the log counts down to 'Cftlib application … is ready … 0 remaining'.
pcs-api's own :3206/health goes UP before the CCD definition is imported, so a
healthy pcs-api on its own is not enough."

    # Ports 5062, 6432 and 9200 are bound by the fixed 'cftlib' compose project,
    # which is shared across every product's local stack and reused rather than
    # recreated. A stray stack from another repo answers this health check
    # happily while holding a database that has no PCS case type in it.
    if ! curl -sf -o /dev/null --max-time 5 "$DATA_STORE_URL_BASE/health" 2>/dev/null; then
        die "the IDAM simulator is up but CCD data-store on :4452 is not.
If you have a cftlib stack from another repo running, it is the same compose
project and gets reused: docker ps --filter label=com.docker.compose.project=cftlib
Stop it, then re-boot with RSE_LIB_CLEAN_BOOT=1."
    fi
}

preflight_preview() {
    # IDAM and S2S are AAT's even for a preview, so the VPN is still required.
    require_internal_dns "rpe-service-auth-provider-aat.service.core-compute-aat.internal"

    # Without pr-values:ccd there is no preview data-store at all, and the
    # failure would otherwise surface as an opaque DNS error.
    command -v gh >/dev/null 2>&1 || {
        warn "gh not on PATH — skipping the pr-values:ccd label check."
        return 0
    }
    local labels
    labels="$(gh pr view "$PR_NUMBER" --repo hmcts/pcs-api --json labels \
              --jq '.labels[].name' 2>/dev/null)" || {
        warn "could not read labels on hmcts/pcs-api#$PR_NUMBER — continuing anyway."
        return 0
    }
    printf '%s\n' "$labels" | grep -qx 'pr-values:ccd' || die \
"hmcts/pcs-api#$PR_NUMBER has no 'pr-values:ccd' label, so its preview has no CCD
stack — there is no data-store to create a case in.

Add the label, re-run the PR build, then try again. Labels found: $(printf '%s' "$labels" | tr '\n' ' ')"
}

require_testing_support() {
    local what="$1"
    (( TESTING_SUPPORT )) && return 0
    err "$what needs pcs-api's /testing-support endpoints, which are not enabled in ${ENV_LABEL}."
    log ""
    log "ENABLE_TESTING_SUPPORT is set for aat, demo and perftest in"
    log "platops/cnp-flux-config/apps/pcs/pcs-api/*.yaml, and for preview by the chart."
    log "ithc.yaml does not set it, so the endpoints are not served there at all."
    exit 2
}

# ---------------------------------------------------------------------------
# The TypeScript runner
# ---------------------------------------------------------------------------

# Absolute paths only — a plugin's cwd is its cache directory, not the workspace.
E2E_DIR=""
FRONTEND_UI_DIR=""

resolve_runner_env() {
    local root="${CLAUDE_PROJECT_DIR:-}"
    [[ -n "$root" ]] || root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../../.." && pwd)"

    E2E_DIR="$root/apps/pcs/pcs-api/src/e2eTest"
    FRONTEND_UI_DIR="$root/apps/pcs/pcs-frontend/src/test/ui"

    [[ -d "$E2E_DIR" ]] || die "pcs-api isn't cloned at $E2E_DIR.
Clone it with: ./scripts/add-repo apps/pcs/pcs-api hmcts/pcs-api"

    [[ -x "$E2E_DIR/node_modules/.bin/tsx" ]] || die "tsx is missing from pcs-api's e2eTest.
Run: (cd $E2E_DIR && yarn install)"

    # The fixtures live in both clones; pcs-frontend's are optional so a missing
    # clone degrades to the pcs-api set rather than failing.
    if [[ -d "$FRONTEND_UI_DIR" ]]; then
        export PCS_FRONTEND_UI_DIR="$FRONTEND_UI_DIR"
    else
        export PCS_FRONTEND_UI_DIR=""
    fi
    export PCS_E2E_DIR="$E2E_DIR"
}

# tsx resolves the tsconfig path aliases against the tsconfig's own absolute
# baseUrl and does not care where the importing file lives, so the runner can sit
# in the plugin. Bare specifiers are the exception: Node walks up from the
# importer, and there is no node_modules above apps/pcs/.claude — hence NODE_PATH.
build_runner_cmd() {
    local runner="$1"; shift
    RUNNER_CMD=(
        env
        "NODE_PATH=$E2E_DIR/node_modules"
        # @hmcts/playwright-common logs every request through winston, and its
        # Console transport sends only warn and error to stderr — info goes to
        # stdout, where it would sit in front of the result object.
        #
        # Both are pinned rather than defaulted to the caller's value: an inherited
        # LOG_LEVEL=info or LOG_FORMAT=pretty would put text on stdout, and pretty
        # lines are not JSON at all.
        "LOG_LEVEL=warn"
        "LOG_FORMAT=json"
        "$E2E_DIR/node_modules/.bin/tsx"
        --tsconfig "$E2E_DIR/tsconfig.json"
        "$runner"
        "$@"
    )
}

# Pull the runner's result object out of its stdout.
#
# Takes the last object carrying an "ok" key rather than assuming it is the only
# thing there — a library that logs to stdout would otherwise be parsed as the
# result, failing in a way that hides the real outcome. -R with fromjson? is what
# makes this per-line: reading as JSON, jq aborts the whole stream on the first
# line that isn't, discarding a result that came after it.
extract_result() {
    printf '%s\n' "$1" \
        | jq -Rc 'fromjson? | select(type == "object" and has("ok"))' 2>/dev/null | tail -1
}

# Run a runner command that is expected to answer immediately, such as --check.
# Sets RUNNER_RESULT; propagates the runner's exit code when it has none.
run_runner_query() {
    local body status
    body="$(cd "$E2E_DIR" && "${RUNNER_CMD[@]}")" && status=0 || status=$?
    RUNNER_RESULT="$(extract_result "$body")"
    [[ -n "$RUNNER_RESULT" ]] || exit "${status:-1}"
}

run_runner() {
    local body status
    body="$(cd "$E2E_DIR" && "${RUNNER_CMD[@]}")" && status=0 || status=$?

    if [[ -n "${PCS_DEBUG:-}" ]]; then
        log "${C_DIM}runner exit $status, stdout:${C_RESET}"
        printf '%s\n' "$body" >&2
    fi

    RUNNER_RESULT="$(extract_result "$body")"

    [[ -n "$RUNNER_RESULT" ]] && return 0

    # The runner exits non-zero with its own guidance on stderr for things it can
    # explain itself, such as a missing argument. That has already been printed,
    # so adding a diagnosis here would only bury it.
    if (( status != 0 )); then
        exit "$status"
    fi

    err "could not find a result object in the runner's output."
    if [[ -n "$body" ]]; then
        printf '%s\n' "$body" >&2
    else
        log "It produced nothing at all — a dropped VPN or a tsx crash both look like"
        log "this. Re-run with --dry-run and try the command by hand."
    fi
    exit 1
}

# ---------------------------------------------------------------------------
# Failure translation. Each entry is a cause worth acting on, not a restatement
# of the status code.
# ---------------------------------------------------------------------------

translate_failure() {
    local result="$1"
    local step status endpoint

    step="$(printf '%s' "$result" | jq -r '.step // "?"')"
    status="$(printf '%s' "$result" | jq -r '.status // 0')"
    endpoint="$(printf '%s' "$result" | jq -r '.endpoint // ""')"

    err "failed at step '$step'${status:+ (HTTP $status)}${endpoint:+ — $endpoint}"

    printf '%s' "$result" | jq -e '.body' >/dev/null 2>&1 \
        && printf '%s\n' "$result" | jq '.body' >&2

    case "$status" in
        # IDAM answers a bad client secret or password with 400 invalid_grant, not
        # 401, so both statuses mean the same thing on a token step.
        400|401)
            if [[ "$status" == 400 && "$step" != *token* && "$step" != *lease* ]]; then
                warn "the request was rejected as malformed."
                log "The body above names the field. A 400 on an event usually means a value"
                log "the CCD definition does not accept, such as an unknown fixed-list code."
                exit 1
            fi
            warn "the credentials for ${ACTING_AS:-$PCS_CLAIMANT_EMAIL} were rejected."
            if [[ "$ENV_KIND" == "local" ]]; then
                log "The IDAM simulator only knows the users seeded by CftlibConfig — an"
                log "email it has never seen returns 401, whatever the password."
            else
                log "pcs-api-idam-secret may have been rotated, or IDAM_PCS_USER_PASSWORD"
                log "came from a different environment's vault than $VAULT."
            fi ;;
        403)
            # CCD's 403s cover two very different causes, and the body says which.
            if printf '%s' "$result" | grep -qi "case role assignments not granted"; then
                warn "the acting user may not read other users' case roles."
                log "CCD restricts this to an organisation case-access administrator"
                log "(caseworker-caa). None of the users this tooling holds is one, so"
                log "listing roles is not possible here — grant and revoke still are."
            else
                warn "the request was refused for case type ${PCS_CASE_TYPE}."
                log "Either the acting user lacks a role granting this event, or pcs_api is"
                log "not authorised on this data-store, or the case type is wrong."
                if [[ "$ENV_SLUG" == "aat" && -z "${CASE_TYPE_SUFFIX:-}" ]]; then
                    log "On AAT the definition is imported twice, and the case may belong to the"
                    log "PCS-staging copy served by pcs-api-staging.aat.platform.hmcts.net."
                fi
            fi
            log "A straight retry produces the same 403." ;;
        404)
            # CCD says "No case type found" when the acting user cannot see the
            # case type at all, which reads like a missing case but is an access
            # problem — the user holds no AM role that grants this event.
            if printf '%s' "$result" | grep -q 'No case type found'; then
                warn "the acting user has no role granting this event on this case."
                log "CCD reports 'No case type found' when the user cannot see the case type,"
                log "not when the case is missing. The hearing-centre roles are AM"
                log "organisational roles and are scoped by region and location, so a user"
                log "assigned to one region gets this on another region's case — Welsh cases"
                log "are the usual example."
                log ""
                log "Act as a user assigned to the right region:"
                log "  manage-case ${ENV_LABEL} <case-ref> <operation> --as <email>"
                log "and check what the user actually holds with /cft-role-assignment."
            elif [[ "$step" == "get-case" ]]; then
                warn "the case is not visible to ${ACTING_AS:-the acting user} in ${ENV_LABEL}."
                log "CCD answers 404 for a case the user has no access to as well as for one"
                log "that does not exist. If it exists, the user is missing an AM role — the"
                log "hearing-centre roles are not provisioned identically across environments."
                log "Check what the user holds with /cft-role-assignment."
            elif [[ "$step" == *token* || "$step" == "create" ]]; then
                warn "case type ${PCS_CASE_TYPE} is not deployed in ${ENV_LABEL}."
                if [[ "$ENV_KIND" == "preview" ]]; then
                    log "A preview's definition is imported by the PR build's highleveldatasetup"
                    log "stage, which only runs with the pr-values:ccd label."
                fi
            else
                warn "the event is not available in the case's current state."
                log "Check where the case actually is:"
                log "  manage-case ${ENV_LABEL} <case-ref> inspect"
            fi ;;
        409)
            warn "the event token went stale between the trigger and the submit — re-run." ;;
        412)
            warn "a feature flag blocked this server-side."
            log "link-defendant-solicitor-to-party is the one endpoint that enforces flags:"
            log "it needs both release-1.2-enabled and cui-respond-to-claim-lr-enabled." ;;
        422)
            # A 422 on the event-trigger GET is CCD refusing the event for the
            # case's current state; on a submit it is pcs-api's callback refusing
            # the data. Same status, opposite fix.
            if printf '%s' "$result" | grep -q 'did not qualify for the event'; then
                warn "the event is not available in the case's current state."
                log "Check where the case is:"
                log "  manage-case ${ENV_LABEL} <case-ref> inspect"
                case "$step" in
                    change-state*)
                        log "changeCaseState needs CASE_ISSUED or later. Issue the case first with"
                        log "the pay operation."
                        if (( ! TESTING_SUPPORT )); then
                            log "That is not possible in ${ENV_LABEL}, which serves no /testing-support"
                            log "endpoints — so no case here can be moved past PENDING_CASE_ISSUED."
                        fi ;;
                    *hearing*)
                        log "manageHearing stops being available once a case moves past CASE_ISSUED,"
                        log "and a case cannot be moved back to it." ;;
                    *) ;;
                esac
            else
                warn "pcs-api's callback rejected the payload."
                log "This is the fixture drifting from the deployed CCD definition, not a"
                log "problem with ${ENV_LABEL}. The body above carries the field-level reason."
                local const
                const="$(printf '%s' "$result" | jq -r '.constName // ""')"
                [[ -n "$const" ]] && log "Compare '$const' against the case type in this environment."
            fi ;;
        502|503|504)
            # A 502 from CCD on a decentralised case type is usually CCD relaying a
            # 500 from pcs-api's own persistence callback — the environment is fine
            # and the payload is at fault. Only a 502 without that signature means
            # the service is unreachable.
            if printf '%s' "$result" | grep -qi 'CDAM'; then
                warn "CCD could not verify the documents in this payload."
                log "It calls CDAM for every document it is given, and the fixtures reference"
                log "pre-existing uploads by hard-coded UUID. Either those documents have been"
                log "reaped from this environment's document store, or the environment has none"
                log "— which is the case locally."
                log "Pick a fixture with 0 in the DOCS column of --list."
            elif printf '%s' "$result" | grep -q 'ccd-persistence'; then
                warn "pcs-api's persistence callback failed on this event."
                log "CCD reports 502 because the call it makes to pcs-api returned 500, so"
                log "this is the submitted data, not ${ENV_LABEL} being down. Check pcs-api's"
                log "logs for the stack trace."
            elif [[ "$ENV_KIND" == "local" ]]; then
                warn "something in the local stack is not answering."
                log "All ten cftlib apps have to be up before the CCD definition is imported."
                log "Check the bootWithCCD output, and note that pcs-api's own /health reports"
                log "DOWN whenever sendLetter is unreachable, which is normal locally."
            elif [[ "$ENV_KIND" == "preview" ]]; then
                warn "the preview pod is asleep, or the PR environment has been torn down."
                log "Preview is destroyed nightly rather than stopped — re-run the PR build."
            else
                warn "${ENV_LABEL} looks shut down."
                log "Bring it up with:  /pcs:start-env ${ENV_LABEL}"
            fi ;;
        *)
            : ;;
    esac
    exit 1
}
