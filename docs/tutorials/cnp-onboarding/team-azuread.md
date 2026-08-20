---
title: Microsoft Entra ID
topic: team-azuread
diataxis: tutorials
product: workspace
audience: both
---

# Microsoft Entra ID

Microsoft Entra ID is used to manage team access to Azure subscriptions, GitHub and other HMCTS resources.

## Access to an existing team

Follow the [Microsoft Entra ID groups section in person onboarding](person-entra-id.md#microsoft-entra-id-groups).

## Creating a new team

If you are a new team, or you need a new access group, create a pull request in [azure-access groups.yml](https://github.com/hmcts/azure-access/blob/master/users/groups.yml).

Get the pull request approved by Platform Operations.

It should look like:

```yaml
groups:
- name: DTS Your Team name
```

After the group exists, use [Github](team-github.md) to link the GitHub team to the Microsoft Entra ID group.
