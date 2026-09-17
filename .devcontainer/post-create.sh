#!/usr/bin/env bash
set -euxo pipefail

# Workspace bootstrap. Tooling is baked into the image; this script only does
# work that depends on user/host state (git auth, etc.).
cd "$(dirname "$0")/.."
if gh auth status >/dev/null 2>&1; then
    ./scripts/bootstrap || true
    # After bootstrap, because it is what creates the clone directories the links live in. The clones are
    # on named volumes now, so anything untracked inside one is lost on a `docker volume prune` — this puts
    # the per-engineer files back from their host-visible copies. See scripts/link-local-notes.
    ./scripts/link-local-notes || true
    ./scripts/doctor --quiet || true
else
    echo
    echo "==> Skipped scripts/bootstrap — run 'gh auth login' then './scripts/bootstrap'."
    echo
fi
