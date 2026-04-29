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

# Proxy the host's docker socket (bind-mounted at /var/run/docker-host.sock)
# to a user-owned /var/run/docker.sock via socat. This sidesteps every
# variant of the "supplementary group already cached at fork time" problem:
# the in-container socket is owned by $USER (mode 660), so any process
# running as the container user can talk to docker without group membership.
host_sock=/var/run/docker-host.sock
target_sock=/var/run/docker.sock
if [[ -S "$host_sock" ]] && ! pgrep -fx "socat UNIX-LISTEN:${target_sock}.*" >/dev/null; then
    sudo rm -f "$target_sock"
    sudo nohup socat \
        "UNIX-LISTEN:${target_sock},fork,mode=660,user=$(id -un),backlog=128" \
        "UNIX-CONNECT:${host_sock}" \
        >/tmp/docker-socat.log 2>&1 &
    disown
fi

# Named-volume cache mounts come up root-owned on first start; chown to the
# container user so Gradle/Maven/npm/Yarn can write to them.
for d in "$HOME/.gradle" "$HOME/.m2" "$HOME/.npm" "$HOME/.cache" "$HOME/.cache/yarn"; do
    if [[ -d "$d" && "$(stat -c '%u' "$d")" != "$(id -u)" ]]; then
        sudo chown "$(id -u):$(id -g)" "$d"
    fi
done

# Sweep any vscode-server stdio-tunnel orphans left behind by a previous
# session. See cleanup-vscode-tunnels.sh for why these accumulate.
bash "$(dirname "$0")/cleanup-vscode-tunnels.sh" || true
