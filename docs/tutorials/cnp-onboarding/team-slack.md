---
title: Slack
topic: team-slack
diataxis: tutorials
product: workspace
audience: both
---

# Slack

For individual Slack workspace access, profile setup and common channels, use [Slack onboarding](person-slack.md).

When creating a new team, create the relevant Slack channels.
The following channels should be created for every team:

- A team contact channel. This must be public because people from other teams use it to contact you. This is often your regular developer chat channel.
- A build notices channel. This should be public because build failures should be visible.

These channel names are used in [team metadata required for pipelines](team-jenkins.md#team-metadata-required-for-pipelines).

Once you've created a build notices channel you will need to invite our 'Jenkins' bot user into the channel.

```shell
/invite @Jenkins
```

Make sure you pick the Jenkins \[app] user:

<img src="/images/slack-jenkins-user-invite.png"/>
