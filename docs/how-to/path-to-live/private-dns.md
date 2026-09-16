---
title: Expose a service on private DNS only
topic: private-dns
diataxis: how-to
product: workspace
audience: both
---
# Expose a service on private DNS only

Some services should be reachable from the HMCTS network but never from the internet — internal tooling, admin UIs, gateways holding credentials for something expensive. This page covers that case.

It is the mirror image of [Public DNS](public-dns.md) and [Front Door](front-door.md): you deliberately **do not** create a front door CNAME or a `frontends` entry, and the hostname resolves only inside the private zone. Everything else still applies, because the traffic path in front of your pods is the same one every backend service uses.

This page is workspace-owned. [Load balancer configuration](load-balancer-configuration.md), [Public DNS](public-dns.md), [Front Door](front-door.md) and [TLS certificates](tls-certificates.md) alongside it are ported from `platops/hmcts.github.io` and reconciled against upstream SHAs in `docs/.port-manifest.yaml`, so anything added to them is overwritten on the next port.

## The traffic path

```
client on the network
  → <app>.aat.platform.hmcts.net          A record, private zone only
  → 10.10.161.101                          internal application gateway (TLS terminated here)
  → HTTP :80 to 10.10.143.250 / 10.10.159.250   both cluster traefiks, health probed
  → your Ingress (host <app>.aat.platform.hmcts.net)
  → your Service
```

The gateway is the part people miss. As [Load balancer configuration](load-balancer-configuration.md) says, every path-to-live environment runs two clusters and an Azure Application Gateway load balances across them with a health probe per application. Skipping it and pointing DNS straight at both traefik load balancers looks like it works, but DNS round-robins with no health checking, so a drained or unhealthy cluster silently fails a share of requests.

## 1. Add the gateway entry

In [`azure-platform-terraform`](https://github.com/hmcts/azure-platform-terraform), edit `environments/<env>/backend_lb_config.yaml`. Note the env name mapping: **AAT is `stg`** and perftest is `test`.

There are two gateways in the file and **the first one is closed** — it carries a five-line `DO NOT ADD ANY MORE SERVICES TO THIS GATEWAY CONFIGURATION ABOVE, USE THE ONE BELOW THIS WARNING` banner. In `stg` the closed gateway holds 98 apps on `10.10.161.100`; the open one holds 50 on `10.10.161.101`. Add to the second, and note its private IP — you need it in step 2.

```yaml
      - product: dtsse
        component: litellm-proxy
        ssl_enabled: true
        host_name_prefix: litellm
        health_path_override: /healthz
        request_timeout: 900
```

The options are all defined in [`terraform-module-application-backend`](https://github.com/hmcts/terraform-module-application-backend):

| Option | Default | When you need it |
|---|---|---|
| `ssl_enabled` | `false` | Sets the listener and probe host to `<name>.<env>.platform.hmcts.net` instead of `<name>-<env>.service.core-compute-<env>.internal`. Set it when humans reach the service by that hostname. |
| `host_name_prefix` | `<product>-<component>` | Overrides the hostname. Without it, `product: dtsse` + `component: litellm-proxy` gives `dtsse-litellm-proxy.aat.platform.hmcts.net`. |
| `health_path_override` | `/health/liveness` | Any service that doesn't serve that exact path — otherwise the probe fails and the gateway marks every backend unhealthy. |
| `request_timeout` | **`30`** | Anything that can take longer than 30 seconds to respond. |
| `cookie_based_affinity` | `Disabled` | Stateful UIs. |

**`request_timeout` is the one that bites.** The default is 30 seconds, and it applies to the whole response, so any long-running request or streamed response is severed mid-flight with no useful error. `prod` already carries a 600s entry for this reason.

Merging this also creates `<product>-<component>-<env>.service.core-compute-<env>.internal` pointing at the gateway, via the `cftapps_private_dns` component. That record is generated — do not add it by hand. It is the name other services use for service-to-service calls, which is why so much flux config contains `http://<app>-<env>.service.core-compute-<env>.internal` URLs.

## 2. Add the private DNS record

The record humans use is **not** generated. In [`azure-private-dns`](https://github.com/hmcts/azure-private-dns), add an `A` record under the `A:` key (capital A — the CNAME section below it is lowercase `cname:`) in `environments/<env>/<zone>.yml`. For AAT that is `environments/staging/aat-platform-hmcts-net.yml`:

```yaml
  - name: litellm
    record:
    - 10.10.161.101
    ttl: 300
```

Point it at the gateway private IP from step 1, not at a traefik address. `camunda-optimize` is a good minimal template.

Then stop. Adding a front door CNAME and a `frontends` entry in `azure-platform-terraform` is what makes a hostname public — see [Front Door](front-door.md). Leaving both out is the entire point here.

## 3. Set the ingress host, without a TLS router

Your `HelmRelease` in [`cnp-flux-config`](https://github.com/hmcts/cnp-flux-config) needs `ingressHost` set to the same hostname the gateway sends:

```yaml
  values:
    nodejs:
      ingressHost: litellm.aat.platform.hmcts.net
```

**Do not enable the traefik TLS router for it.** The gateway terminates TLS with the environment wildcard certificate and connects to the backend over **plain HTTP on port 80** — both the probe and the backend HTTP settings are `protocol = "Http"`. If the ingress only has a TLS router, the gateway's requests and its health probe both go unmatched and every backend reports unhealthy.

The charts already default to this: `disableTraefikTls: true`, so leaving it alone is correct and the ported [TLS certificates](tls-certificates.md) page describes certificates at the gateway, not at traefik. If you are writing raw manifests rather than using a chart, that means **no** `traefik.ingress.kubernetes.io/router.tls: "true"` annotation.

Deploy to both clusters — add the app to `apps/<namespace>/<env>/base/kustomization.yaml`, which both the `00` and `01` overlays include. The gateway's health probe is the thing that makes running on both safe, so there is no reason to pin one.

## When to skip the gateway

A few internal services do point straight at a traefik address, and it is worth knowing why so you don't copy them by mistake. `prometheus-00`/`-01`, `alertmanager-00`/`-01`, `cft-neuvector00`/`01` and `kubecost-00` are per-cluster **by design** — each cluster runs its own instance and you want to open a named one. `grafana` and `jenkins-cluster` are deliberately pinned to a single cluster.

None of that applies to an ordinary stateless service, where per-cluster hostnames just push the choice of cluster into every caller's configuration.

## Checking it

Resolution only works from the network, and a VPN split-tunnel or a devcontainer started before the VPN connected will both give you `NXDOMAIN` — see [Connect via VPN](../connect-via-vpn.md).

```bash
dig +short litellm.aat.platform.hmcts.net          # expect the gateway private IP
curl -sv https://litellm.aat.platform.hmcts.net/healthz
```

If DNS resolves and TLS completes but every request returns 502, the gateway has no healthy backend — check the probe path and the ingress host match what step 1 configured, and that the ingress is not TLS-only.

If the TLS handshake itself fails with a certificate for a name you don't recognise, you are not talking to the gateway at all; re-check the A record.

## Outbound traffic

Egress is separate from any of the above. Traffic leaving the cluster is NATed to the environment's network hub, and **AAT is on the production hub, not the non-production one**. The addresses are in [External IP addresses (Egress)](../external-ip-addresses.md). If your service calls a third party that allow-lists source addresses, that is the list to give them — and note that it is shared by every workload in the hub, so it is a network boundary, not an identity.

Related: [Load balancer configuration](load-balancer-configuration.md), [Front Door](front-door.md), [Public DNS](public-dns.md), [TLS certificates](tls-certificates.md), [External IP addresses (Egress)](../external-ip-addresses.md).
