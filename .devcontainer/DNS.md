# DNS in the devcontainer

HMCTS internal hostnames (`*.service.core-compute-*.internal`) only resolve
via the F5 VPN's DNS servers. When the VPN connects on the host, it rewrites
the host's `/etc/resolv.conf` to point at those nameservers. The devcontainer
needs to track that — otherwise lookups for AAT/Preview hosts (Redis, S2S,
CCD, etc.) return `NXDOMAIN` / `ENOTFOUND` from inside the container even
though they resolve fine on the host.

## How the fix works

The container runs with `--network=host`, so it shares the host's network
namespace — including the host's loopback address `127.0.0.53`, which on
Ubuntu hosts is the systemd-resolved stub resolver. On every container
start, [`post-start.sh`](post-start.sh) writes:

```
nameserver 127.0.0.53
```

…to the container's `/etc/resolv.conf`. Lookups inside the container then go
through the host's stub resolver, which always tracks whatever nameservers
the host is currently using — including F5's when the VPN is up.

If the VPN connects/disconnects mid-session and DNS goes stale, run
[`refresh-dns.sh`](refresh-dns.sh) (a thin wrapper around `post-start.sh`)
to re-apply without restarting the container:

```bash
.devcontainer/refresh-dns.sh
```

## macOS hosts: not required

Docker Desktop on macOS runs containers in a Linux VM and proxies DNS through
its own resolver, which already follows the host's network configuration
including any active VPN. `post-start.sh` skips the rewrite on non-Linux
hosts.

## Troubleshooting

- `ENOTFOUND` for `*.core-compute-*.internal` from inside the container:
  - `cat /etc/resolv.conf` — does it say `nameserver 127.0.0.53`?
  - On the host, is the VPN actually up and configuring DNS? `resolvectl
    status` (Linux) should list the F5 nameservers under the VPN interface.
- If the host file is correct but lookups inside the container still fail,
  run `.devcontainer/refresh-dns.sh` and try again.
- If a fresh container behaves wrong (e.g. VPN connected for the first time
  after container create and something cached), rebuild the container with
  the VPN already up: VS Code → **Dev Containers: Rebuild Container**.
