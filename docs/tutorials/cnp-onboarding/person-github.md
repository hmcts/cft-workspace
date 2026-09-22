---
title: GitHub
topic: person-github
diataxis: tutorials
product: workspace
audience: both
---

# GitHub

## Join GitHub

You can request GitHub access after you have your `hmcts.net` or `justice.gov.uk` email account and Confluence access.

There are two ways to get access:

1. If someone in your team already has access, ask them to add you to the `DTS GitHub Access` group using the [Microsoft Entra ID groups](person-entra-id.md#microsoft-entra-id-groups) instructions.
2. If you're the first person in your team, raise a help request in [#platops-help](https://hmcts-reform.slack.com/archives/C8SR5CAMU). Ask for GitHub access and say that you agree to the [Acceptable Use Policy](https://tools.hmcts.net/confluence/display/RPE/Acceptable+Use+Policy+and+Contractor+Security+Guidance).

Once you've been added you will be able to join GitHub from your [myapps.microsoft.com](https://myapps.microsoft.com/hmcts.net) dashboard.

Make sure you accept the GitHub invite sent to your email address. You can also visit [github.com/hmcts](https://github.com/hmcts) after your access has been added.

Once you've joined GitHub make sure you add your user to the [Slack to GitHub mapping](person-slack.md#github-to-slack-mapping).

## Keep access active

- You must sign in to [GitHub using SSO](https://github.com/orgs/hmcts/sso) at least once every 30 days to retain your GitHub licence.
- Users who do not sign in within this period will be removed based on SSO login logs, helping ensure access is revoked for leavers.
- If you have multiple email aliases, use your primary/main ID when signing in with GitHub SSO.

## Troubleshooting

### Add a new user

- Follow [Join GitHub](#join-github) to request access.
- Make sure the user has accepted the invite received on the email address set up in GitHub, or by visiting [github.com/hmcts](https://github.com/hmcts).

### Cannot access a repository

- Check that access is granted through the correct GitHub team.
- Check whether the team is linked to the correct Microsoft Entra ID group.
- If no one from your team has access, ask the org admins in [#platops-help (Slack)](https://hmcts-reform.slack.com/app_redirect?channel=platops-help) — the upstream "asking for help" page was not ported.

### Cannot add someone to a GitHub team

Teams are populated in one of two ways, and the fix depends on which:

- **Linked to a Microsoft Entra ID group** — members are added automatically when they join the group, so the change belongs in [azure-access](https://github.com/hmcts/azure-access), not in GitHub.
- **Managed manually** — a team maintainer or org admin adds members by hand, and adding someone to an Entra ID group will not do it.

Both kinds exist, so check the team's settings on GitHub before deciding which change to make. [Team onboarding](team-github.md#github-teams) asks teams to link "where possible" and notes that an unlinked team has its membership managed by a senior member of the team.

A `DTS <Team>` Entra ID group and a GitHub team of the same name are separate objects, and matching names do not mean they are linked. Being added to `DTS Civil` grants the Azure and application access listed under [Common access groups](person-entra-id.md#common-access-groups); it changes the `Civil` GitHub team only if that team is linked to that group.

Two things apply either way:

- Organisation membership comes before team membership. If a new starter cannot be found in the team member picker, they have not finished joining the organisation — have them complete [Join GitHub](#join-github) first.
- `DTS GitHub Access` grants organisation eligibility only. It surfaces the GitHub tile on [myapps.microsoft.com](https://myapps.microsoft.com/hmcts.net) and triggers the org invite; it does not add anyone to a team.

Team membership was once managed as code in `hmcts/github-management`. That repository was archived in March 2023 and now points at Entra ID group linking, so an unlinked team is managed through GitHub itself.

### Removed because SSO was not used

If you have been removed because you did not sign in using SSO within 30 days:

1. Try signing in again using [GitHub SSO](https://github.com/orgs/hmcts/sso).
2. If that does not restore access, ask someone in your team to add you back to the `DTS GitHub Access` Microsoft Entra ID group.

Use the [Microsoft Entra ID groups](person-entra-id.md#microsoft-entra-id-groups) instructions when adding the group.

### Tenant account inactive or deleted

If you received an inactive account email, or your tenant account has been deleted, follow [Microsoft Entra ID troubleshooting](person-entra-id.md#troubleshooting) first.

GitHub access can only be restored after your Microsoft Entra ID account and access groups are restored.
