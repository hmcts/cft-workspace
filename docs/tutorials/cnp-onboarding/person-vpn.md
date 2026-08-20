---
title: VPN
topic: person-vpn
diataxis: tutorials
product: workspace
audience: both
---

# VPN

After [Microsoft Entra ID](person-entra-id.md) setup is complete, access [VPN portal](https://portal.platform.hmcts.net/).

[Common access groups](person-entra-id.md#common-access-groups), such as `DTS CFT Developers` or `DTS SDS Developers`, give developers VPN access.

## Troubleshooting

### F5 VPN not connecting or services not available over VPN

Normally connecting to the VPN at [portal.platform.hmcts.net](https://portal.platform.hmcts.net/) should work without issues.

If the VPN hangs while connecting, or connects but some services are not available, disable IPv6 on your device.

This is the most common fix because the F5 VPN has not been configured properly for IPv6, but services behind Azure Front Door are available over IPv6.

Use the right guide for your operating system:

- [Windows](https://www.windowscentral.com/software-apps/windows-11/how-to-disable-tcpipv6-ipv6-on-windows-11)
- [Mac OSX](https://help.nordlayer.com/docs/how-to-disable-ipv6-on-macos)

If that does not work:

1. Apply the latest operating system updates.
2. Restart your device.
3. Raise a ticket in [#platops-help](https://hmcts-reform.slack.com/app_redirect?channel=platops-help) if you still need help.
