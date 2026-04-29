#!/usr/bin/env bash
# Kill leaked VS Code stdio-tunnel helpers inside this dev container.
#
# When VS Code on the host needs to talk to vscode-server inside the
# container (extensions, language servers, IDE bridges, etc.), it spawns
# `docker exec <container> node -e <bridge-script>` for each channel. With
# --network=host the docker-exec orphans don't always receive SIGHUP/EOF
# when their host-side parent dies, so the node bridge sits forever holding
# ~42 MB. Hours of normal use can pile up thousands of these and exhaust
# RAM.
#
# Detection signature:
#   - command matches the inline net.createConnection bridge script
#   - parent pid reports as 0 (parent lives in the host's PID namespace,
#     invisible from inside the container)
#
# Safe to run any time. VS Code respawns the tunnels it actually needs on
# the next IDE interaction; in-flight panels (terminal, language server)
# may briefly reconnect.

set -euo pipefail

PATTERN='vscode-server.*node -e.*const net = require'

count_before=$(pgrep -fc "$PATTERN" || true)
mem_before=$(awk '/MemAvailable/{printf "%.1f", $2/1048576}' /proc/meminfo)

if [[ "$count_before" -eq 0 ]]; then
    echo "no leaked vscode tunnels (mem available ${mem_before} GB)"
    exit 0
fi

echo "killing $count_before leaked vscode tunnels..."
pkill -f "$PATTERN" || true

# pkill returns immediately; give the kernel a moment to reap.
for _ in 1 2 3 4 5; do
    remaining=$(pgrep -fc "$PATTERN" || true)
    [[ "$remaining" -lt "$count_before" ]] && break
    sleep 1
done

count_after=$(pgrep -fc "$PATTERN" || true)
mem_after=$(awk '/MemAvailable/{printf "%.1f", $2/1048576}' /proc/meminfo)
killed=$((count_before - count_after))
freed=$(awk -v a="$mem_before" -v b="$mem_after" 'BEGIN{printf "%.1f", b-a}')

echo "killed $killed tunnels (${count_after} still running)"
echo "memory available: ${mem_before} GB -> ${mem_after} GB (+${freed} GB)"
