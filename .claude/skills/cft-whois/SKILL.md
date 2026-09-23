---
name: cft-whois
description: Identify the human behind an HMCTS GitHub login, or find the login for a person. Reports their real name, work emails, employer, org and team membership, and which repos they land changes in. Use when the user asks "who is github.com/xyz", "who is this GitHub user", "which HMCTS user is abc123", "what team is this person on", "what's the GitHub handle for Jane Smith".
---

# Identify a GitHub user

Resolve an HMCTS GitHub login to a real person — or a person to their login — using `./scripts/cft-whois`.

## When to use

- "Who is https://github.com/janeSmith42?"
- "Which HMCTS user is `jsmith-moj`?"
- "What team is `pbaker7` on?"
- "Who owns this commit / who should I ask about this PR?"
- Reverse: "What's the GitHub handle for Jane Smith?", "Who commits as `x.y@justice.gov.uk`?"

## When NOT to use

- For *repository* ownership rather than a person — that's `RepositoryOwnership` in `apps/dtsse/dtsse-github-metrics`, or `INDEX.md` for products.
- For what a service exposes — `/cft-api-spec`, `/cft-find-endpoint`.

## The key fact about this lookup

**Most HMCTS engineers leave their GitHub profile blank** — no name, no company, no
public email. `gh api users/<login>` alone will usually tell you nothing.

The identifying signal is the **git author email on their commits**, which is
nearly always a work address (`first.last@justice.gov.uk`, `@hmcts.net`, or a
supplier's own domain). The script reads that and derives a name
from it when the profile is empty. A supplier domain appearing alongside a
`justice.gov.uk` one is the normal contractor pattern, not an anomaly — report
both, since "who employs them" is often the real question.

## Inputs

`$ARGUMENTS` is a single query in any of four forms. The script sniffs which:

| Form | Example | How it resolves |
|---|---|---|
| Login | `janeSmith42` | direct |
| URL or `@handle` | `https://github.com/janeSmith42`, `@janeSmith42` | stripped to the login |
| Work email | `Jane.Smith@justice.gov.uk` | org-scoped commit search → login |
| Full name | `"Jane Smith"` | git author name, then profile-name search |

Quote names containing spaces. Logins are case-insensitive; the script prints
GitHub's canonical spelling.

**Name lookups are the least reliable form.** Many people commit under their
bare login as the git author name, so the org-scoped search misses them and the
script falls back to GitHub's *global* profile-name search — which has no `org:`
qualifier. The script therefore membership-checks every candidate and refuses
rather than returning a namesake from outside the org. If it reports "no `hmcts`
member is named X" while listing non-member matches, believe it: those are
strangers who share the name. Prefer a login or work email when you have one.

## Procedure

1. **Run the script** from the workspace root:
   ```bash
   ./scripts/cft-whois "$ARGUMENTS"
   ```
   Add `--json` if you need to pull specific fields out programmatically, and
   `--org <org>` for an org other than `hmcts`.

2. **Read the output and answer the question that was actually asked.** The
   script prints everything it found; the user usually wants one line of it
   ("this is Jane Smith, a supplier contractor on the CPP platform teams").
   Lead with the name and employer, then the teams, then the activity.

3. **If the name came out `unknown`**, say so plainly rather than guessing. It
   means the profile is blank *and* every sampled commit was authored under the
   bare login with a GitHub-private email. Suggest the fallbacks:
   - the org-graph database behind `apps/dtsse/dtsse-github-metrics` stores
     each member's Entra SSO display name in `org_people.payload.displayName`,
     read through the GitHub App's SAML/SCIM identity mapping. A user token
     can't see that mapping, so the database can name someone whose profile is
     blank;
   - a Slack/Confluence search for the login;
   - the teams the script *did* find usually identify the area even without a name.

4. **Do not post the result anywhere.** This is personal data about a colleague.
   Answer in the conversation; never write it into a PR comment, commit message
   or Jira ticket unless the user explicitly asks.

## Output format

Report the script's findings compactly. A good answer:

```
janeSmith42 is Jane Smith — a contractor at supplier.example (also commits
under Jane.Smith@justice.gov.uk).

  HMCTS org member, 4 teams: cpp-development, cpp-development-idam,
  platform-operations, all-org-members
  147 merged PRs, mostly azure-access (27), cpp-aum-maintenance-configurations
  (21), sds-flux-config (14) — so CPP platform/access engineering.
```

Mention the GitHub profile only if it has something in it; "the profile is
blank" is worth one clause when it explains where the name came from.

## Requirements

`gh` (authenticated) and `jq`. No VPN, no Azure login, no database — everything
comes from the GitHub REST and GraphQL APIs under the engineer's own token.

Team membership uses a GraphQL `teams(userLogins: […])` filter, which needs no
org-admin scope. If teams come back empty for someone you know is a member,
their team memberships are likely private to your token rather than absent.

## Don't

- Don't fall back to scraping github.com HTML — if the API says nothing, say nothing.
- Don't hit the search API in a loop across many logins; it is rate-limited to
  30 requests/minute and one lookup already spends three. For bulk questions,
  query `org_people` / `org_team_memberships` in the `apps/dtsse/dtsse-github-metrics` database instead.
- Don't treat a `justice.gov.uk` address as proof of civil-service employment —
  contractors get one too. The supplier domain is the better employer signal.
- Don't report the derived name as certain when `name_source` is
  `derived from commit email`; it is a `first.last@` convention, not a record.
