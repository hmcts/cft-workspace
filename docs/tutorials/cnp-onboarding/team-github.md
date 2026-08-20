---
title: GitHub
topic: team-github
diataxis: tutorials
product: workspace
audience: both
---

# GitHub

For personal GitHub access, SSO licence retention and account troubleshooting, use [GitHub onboarding](person-github.md).

## GitHub teams

Create two GitHub teams for your team:

1. Click on the 'teams' tab.
2. Create a team called `<team-name>`.
3. Link this team to your Microsoft Entra ID group created as part of [Microsoft Entra ID onboarding](team-azuread.md). This means team members are automatically added when they join.
4. Create a team called `<team-name>-admins`.

GitHub teams should be [linked to a team Microsoft Entra ID group](https://docs.github.com/en/enterprise-cloud@latest/organizations/organizing-members-into-teams/synchronizing-a-team-with-an-identity-provider-group) where possible.

If a team is not linked to Microsoft Entra ID, a senior member of the team must manage membership.

## Repository access

Repository access must be managed through GitHub teams:

- All repositories should be administered by the team who owns them.
- Access should be managed through GitHub teams, not individual users.
- Do not add collaborators from outside the organisation.
- If no one from your team has access, ask the org admins in [#platops-help (Slack)](https://hmcts-reform.slack.com/app_redirect?channel=platops-help) — the upstream "asking for help" page was not ported.

## Create a GitHub repository

Any developer added to the [HMCTS GitHub organisation](https://github.com/hmcts) can create a new GitHub repository.

See [creating a GitHub repository](../../how-to/new-component/github-repo.md#create-a-github-repository) for naming, visibility, team access and branch protection guidance.

After the repository is created, follow [Jenkins setup](../../how-to/new-component/jenkins-repository.md) to make sure the repository can be scanned, built and deployed.
