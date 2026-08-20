---
title: Create a GitHub Repository
topic: github-repo
diataxis: how-to
product: workspace
audience: both
---
# Create a GitHub Repository

Any developer added to the [HMCTS GitHub organisation](https://github.com/hmcts) can create a new GitHub repository.

If you do not have access, follow [GitHub onboarding](../../tutorials/cnp-onboarding/person-github.md#join-github).

1. Naming convention for repository is `{product}-{component}`. For product-level (shared) infrastructure, the name should be `{product}-shared-infrastructure`. [More info](./infrastructure-as-code.md#product-and-component-level-infrastructure)
2. If you are creating a NodeJS front end or Java backend component, you may want to use a template. These templates provide the boilerplate code needed for a new app.
    - [spring-boot-template](https://github.com/hmcts/spring-boot-template)
    - [expressjs-template](https://github.com/hmcts/expressjs-template)
    - Alternatively you can simply create a blank directory. If so, we recommend you draw inspiration from an existing working repository.
3. Repositories should be public. See [GOV.UK guidance](https://www.gov.uk/service-manual/technology/making-source-code-open-and-reusable).
4. Do not add collaborators from outside the organisation. Access must be managed with GitHub teams, not individual users.

    _Note: Remove the user-level admin access you received when creating the repository after you have added your team admins with the admin role._

5. Find or create your GitHub team in [GitHub](../../tutorials/cnp-onboarding/team-github.md). Give your team members the following access to the repository.
    <table>
     <tr>
       <th>GitHub team</th>
       <th>Role</th>
     </tr>
     <tr>
       <td>`<team-name>`</td>
       <td>write</td>
     </tr>
     <tr>
       <td>`<team-name>-admins`</td>
       <td>admin</td>
     </tr>
    </table>

6. Add a branch protection rule for the `master` branch with the recommended settings below. This is in `https://github.com/[REPO]/settings/branches`, then clicking "Add rule" beside Branch protection rules.
   - Enable `Require a pull request before merging` and `Require approvals` (minimum 1)
   - Choose which status checks need to be mandatory for merging PRs. The standard Jenkins check is `continuous-integration/jenkins/pr-merge` (this can be done only after Jenkins checks have run once)
   - We recommend enabling `Do not allow bypassing the above settings`.
