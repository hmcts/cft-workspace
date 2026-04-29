#!/usr/bin/env bash
set -euxo pipefail

# Workspace bootstrap. Tooling is baked into the image; this script only does
# work that depends on user/host state (git auth, etc.).
cd "$(dirname "$0")/.."
if gh auth status >/dev/null 2>&1; then
    ./scripts/bootstrap || true
    ./scripts/doctor --quiet || true
else
    echo
    echo "==> Skipped scripts/bootstrap — run 'gh auth login' then './scripts/bootstrap'."
    echo
fi
