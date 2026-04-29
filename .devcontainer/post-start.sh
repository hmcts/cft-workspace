#!/usr/bin/env bash
# Run on every container start.
#
# DNS sync: with --network=host, the container shares the host's loopback,
# so pointing /etc/resolv.conf at 127.0.0.53 routes lookups through the
# host's stub resolver (which tracks F5 VPN state). On macOS, Docker
# Desktop already proxies DNS — `uname` distinguishes the cases.
#
# Docker config: strip credsStore so the daemon socket we mount via
# --network=host doesn't try to invoke a host-side credential helper that
# isn't on PATH inside the container.
set -euo pipefail

if [[ "$(uname -s)" == "Linux" ]]; then
    if ! grep -q '127.0.0.53' /etc/resolv.conf 2>/dev/null; then
        echo 'nameserver 127.0.0.53' | sudo tee /etc/resolv.conf >/dev/null
    fi
fi

config="$HOME/.docker/config.json"
if [[ -f "$config" ]] && command -v jq >/dev/null; then
    tmp=$(mktemp)
    jq 'del(.credsStore)' "$config" > "$tmp" && mv "$tmp" "$config"
fi

# Reconcile the docker group's GID with the host's mounted socket so the
# already-built-in `docker` group membership of $USER actually grants socket
# access. Retargeting the existing group's GID (rather than creating a new
# group + adding the user at runtime) means new shells see the right GID
# immediately — no re-login needed.
sock=/var/run/docker.sock
if [[ -S "$sock" ]]; then
    sock_gid=$(stat -c '%g' "$sock")
    docker_gid=$(getent group docker | cut -d: -f3)
    if [[ "$sock_gid" != "$docker_gid" ]]; then
        sudo groupmod --gid "$sock_gid" docker
    fi
fi

# Named-volume cache mounts come up root-owned on first start; chown to the
# container user so Gradle/Maven/npm/Yarn can write to them.
for d in "$HOME/.gradle" "$HOME/.m2" "$HOME/.npm" "$HOME/.cache/yarn"; do
    if [[ -d "$d" && "$(stat -c '%u' "$d")" != "$(id -u)" ]]; then
        sudo chown "$(id -u):$(id -g)" "$d"
    fi
done

# Sweep any vscode-server stdio-tunnel orphans left behind by a previous
# session. See cleanup-vscode-tunnels.sh for why these accumulate.
bash "$(dirname "$0")/cleanup-vscode-tunnels.sh" || true
