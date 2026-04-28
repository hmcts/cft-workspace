#!/usr/bin/env bash
# Common bash helpers for cft-workspace scripts.
# Usage: source "$(dirname "$0")/lib/_common.sh"

set -euo pipefail

# Resolve workspace root from THIS file's location:
# <root>/scripts/lib/_common.sh -> dirname x3 = <root>
WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LIB_DIR="$WORKSPACE_ROOT/scripts/lib"
MANIFEST="$WORKSPACE_ROOT/workspace.yaml"

if [[ -t 1 ]]; then
    C_RESET=$'\033[0m'; C_DIM=$'\033[2m'; C_BOLD=$'\033[1m'
    C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_BLUE=$'\033[34m'
else
    C_RESET=''; C_DIM=''; C_BOLD=''; C_RED=''; C_GREEN=''; C_YELLOW=''; C_BLUE=''
fi

log()   { printf '%s\n' "$*"; }
info()  { printf '%s%s%s\n' "$C_BLUE"  "$*" "$C_RESET"; }
ok()    { printf '%s%s%s\n' "$C_GREEN" "$*" "$C_RESET"; }
warn()  { printf '%s%s%s\n' "$C_YELLOW" "$*" "$C_RESET" >&2; }
err()   { printf '%s%s%s\n' "$C_RED"   "$*" "$C_RESET" >&2; }
die()   { err "$*"; exit 1; }

# Verify mikefarah/yq is on PATH. We only support mikefarah/yq (Go-based);
# the python `yq` wrapper around jq has incompatible syntax. yq is provided
# by the devcontainer (ghcr.io/dhoeric/features/yq).
require_yq() {
    if ! command -v yq >/dev/null; then
        die "yq not on PATH. Install via the devcontainer feature 'ghcr.io/dhoeric/features/yq:1' or your package manager."
    fi
    if ! yq --version 2>&1 | grep -q 'mikefarah'; then
        die "yq on PATH is not mikefarah/yq (the python wrapper has incompatible syntax). Install mikefarah/yq."
    fi
}

# List manifest entries as TSV: path<TAB>ssh_url<TAB>ref<TAB>depth
# Empty ref is emitted as the literal "-" because bash's `read` with a
# whitespace IFS (tab counts as whitespace) collapses consecutive empty
# fields, which would silently shift columns. Consumers translate "-" → "".
manifest_tsv() {
    local prefix="${1:-}"
    require_yq
    yq -r '
      .repos
      | to_entries
      | map(select(.value != null))
      | .[]
      | [
          .key,
          ("git@github.com:" + .value.url + ".git"),
          (.value.ref // "default" | sub("^(default|)$"; "-")),
          (.value.depth // 0)
        ]
      | @tsv
    ' "$MANIFEST" | { if [[ -n "${prefix:-}" ]]; then
        awk -F'\t' -v p="${prefix%/}" '$1==p || index($1, p"/")==1'
      else
        cat
      fi; }
}

# Translate the "-" placeholder back to an empty string after reading.
unplaceholder() {
    [[ "$1" == "-" ]] && printf '' || printf '%s' "$1"
}
