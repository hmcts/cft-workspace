#!/usr/bin/env bash
set -euxo pipefail

# Workspace bootstrap. Tooling is baked into the image; this script only does
# work that depends on user/host state (git auth, etc.).
cd "$(dirname "$0")/.."

# A fresh named volume is created root-owned, so every mkdir below it fails for uid 1000 and bootstrap
# clones nothing. Docker offers no way to set the owner at mount time.
sudo chown "$(id -u):$(id -g)" \
    apps libs platops deed-poll-admin deed-poll-api deed-poll-web deed-poll-infra

# Mounting a volume on apps/ hides the tracked files underneath it — apps/*/CLAUDE.md and apps/*/docs/
# are workspace scaffolding, not clones (see .gitignore's re-includes), and DOCS.md, INDEX.md and the
# /cft-* skills all route through them. The volume starts empty, so restore them from HEAD.
git checkout -- apps

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
