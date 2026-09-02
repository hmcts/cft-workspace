#!/usr/bin/env bash
# Shared helpers for scripts that talk to running CFT services.
# Usage: source "$(dirname "$0")/lib/_cft.sh"   (sources _common.sh itself)
#
# Kept separate from _common.sh, which is workspace plumbing (yq, manifest) and
# has no notion of environments or credentials.

# Resolve _common.sh relative to THIS file, not the caller's cwd, so the lib
# works whether it's sourced by a script in scripts/ or interactively.
source "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/_common.sh"

# --- generic ---------------------------------------------------------------

require_tools() {
    local t
    for t in "$@"; do command -v "$t" >/dev/null || die "$t not on PATH"; done
}

uuid() { cat /proc/sys/kernel/random/uuid; }

# N random digits. Deliberately NOT `tr -dc 0-9 </dev/urandom | head -cN`:
# head closes the pipe, tr dies with SIGPIPE and `set -o pipefail` then aborts
# the caller with status 141 — silently, having printed nothing.
digits() {
    local n="$1" out=""
    while (( ${#out} < n )); do out+=$(( RANDOM % 10 )); done
    printf '%s' "$out"
}

# Internal *.service.core-compute-<env>.internal hostnames need the VPN.
require_internal_dns() {
    local host="$1"
    getent hosts "$host" >/dev/null 2>&1 || die "cannot resolve $host — connect the VPN.
If you connected it after starting the devcontainer, rebuild the container."
}

# --- IDAM ------------------------------------------------------------------

idam_web() { printf 'https://idam-web-public.%s.platform.hmcts.net' "$1"; }

# Decode a JWT payload to JSON. Handles base64url and missing padding.
jwt_payload() {
    local tok="$1" body
    body=$(printf '%s' "$tok" | cut -d. -f2 | tr '_-' '/+')
    printf '%s==' "$body" | base64 -d 2>/dev/null | jq . 2>/dev/null
}

# --- S2S -------------------------------------------------------------------

# Lease an S2S token. Args: <microservice_with_underscores> <env>
#
# The Key Vault secret name uses HYPHENS where the microservice name uses
# underscores: xui_webapp -> microservicekey-xui-webapp.
s2s_lease() {
    local microservice="$1" env="$2" secret otp token
    [[ -n "$microservice" ]] || die "s2s_lease: microservice required"
    require_tools az curl

    secret=$(az keyvault secret show --vault-name "s2s-$env" \
        --name "microservicekey-${microservice//_/-}" --query value -o tsv 2>/dev/null) \
        || die "could not read microservicekey-${microservice//_/-} from vault s2s-$env
Check: az keyvault secret list --vault-name s2s-$env -o tsv --query '[].name' | grep microservicekey-"

    if command -v oathtool >/dev/null; then
        otp=$(oathtool --totp -b "$secret")
    else
        command -v docker >/dev/null || die "need oathtool or docker to generate the S2S TOTP"
        otp=$(docker run --rm hmctsprod.azurecr.io/imported/toolbelt/oathtool \
                  --totp -b "$secret" | tr -d '\r\n')
    fi

    local s2s_url="http://rpe-service-auth-provider-$env.service.core-compute-$env.internal"
    require_internal_dns "rpe-service-auth-provider-$env.service.core-compute-$env.internal"
    token=$(curl -sS -X POST "$s2s_url/lease" -H 'Content-Type: application/json' \
        -d "{\"microservice\":\"$microservice\",\"oneTimePassword\":\"$otp\"}")
    [[ -n "$token" ]] || die "S2S lease failed for $microservice in $env"
    printf '%s' "$token"
}

# Report whether a microservice is on a service's flux S2S allowlist.
# Args: <flux-app-path> <microservice> <env>
# Returns 0 = on it, 1 = not on it, 2 = allowlist unreadable.
s2s_allowlisted() {
    local app_path="$1" microservice="$2" env="$3"
    local file="$WORKSPACE_ROOT/platops/cnp-flux-config/apps/$app_path/$env.yaml" list
    [[ -f "$file" ]] || return 2
    list=$(grep -oE 'S2S_AUTHORISED_SERVICES: .*' "$file" | head -1 | sed 's/.*: //')
    [[ -n "$list" ]] || return 2
    printf '%s' "$list" | tr ',' '\n' | sed 's/ //g' | grep -qx "$microservice"
}
