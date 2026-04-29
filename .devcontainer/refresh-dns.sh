#!/usr/bin/env bash
# Re-apply the DNS config without restarting the container. Run this if the
# host VPN connects/disconnects mid-session and internal HMCTS hostnames
# stop resolving. Internally, this is just post-start.sh.
set -euo pipefail
exec bash "$(dirname "$0")/post-start.sh"
