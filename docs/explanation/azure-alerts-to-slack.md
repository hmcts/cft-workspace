---
title: Azure Monitor alerts to Slack
topic: alerting
diataxis: explanation
product: workspace
audience: both
---
# Azure Monitor alerts to Slack

PlatOps runs a central relay, the `azure-alert-to-slack-function` repo, that turns Azure Monitor alerts into Slack messages. It is an Azure Function that accepts alerts in the common alert schema, formats them as a Slack message (rule name, fired or resolved state, a link to the resource, and an optional runbook button) and posts them with a bot token read from a PlatOps Key Vault via managed identity. One instance is deployed per business area (CFT and SDS) in the PTL subscriptions, so individual teams do not create their own Slack apps or tokens.

The destination channel is chosen per alert, not per deployment. The function reads `slackChannelId` from the alert's custom properties and falls back to a test channel when it is absent, so an alert that omits the property does not reach the team's channel. A runbook link is passed the same way. Each relay instance exposes a shared action group with a function receiver; any alert rule that lists that action group and sets the custom properties is relayed.

Team Terraform attaches to the relay by creating its own alert rules (for example a scheduled-query alert on an Application Insights component) that point at the shared action group. The platform grants each subscription's bootstrap service principal the rights needed to reference the action group, so pipelines running as that principal can create such rules. The `terraform-module-application-insights` module already does this for its daily-cap alert, resolving the channel ID from the product's `slack.channel_id` entry in the Jenkins team config; other alerts can resolve the channel the same way rather than hard-coding it.
