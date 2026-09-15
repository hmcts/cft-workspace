---
name: env-start
description: Start (or stop) a CFT environment outside the auto-shutdown schedule, via the manual dispatch on hmcts/auto-shutdown. Use when the user asks "start AAT out of hours", "AAT is shut down, can you bring it up", "wake up demo", "I need staging tonight", "turn AAT back off".
---

# Start a CFT environment out of hours

Drive `${CLAUDE_PLUGIN_ROOT}/scripts/env-power`, which dispatches the Manual Start / Stop
workflow on `hmcts/auto-shutdown` and holds the two things that are easy to get wrong: the
exact strings its dropdowns accept, and when the next shutdown sweep will undo you.

Non-prod environments are shut down every day at 20:00 and 23:00, and only started back up
on weekday mornings. A manual start is per **environment and business area** — it powers on
every product's clusters, gateways and databases in that environment, not just PCS. Full
schedule and the platform's own guidance: `docs/how-to/auto-shutdown.md`.

## When to use

- "AAT is down, can you start it?"
- "I need staging up this evening to finish testing"
- "Wake up demo"
- "Turn AAT back off, I'm done"

## When NOT to use

- **A preview PR environment that has vanished** — preview is destroyed nightly, not stopped
  (`docs/reference/cnp-environments.md`). Starting Preview / Dev brings back the shared
  infrastructure, not your PR's namespace; re-run the Jenkins PR build for that.
- **A planned multi-night or recurring need** — that's an auto-shutdown exemption request on
  `hmcts/auto-shutdown`, which takes a Jira ref, a cost justification and dates. Point the
  user at it rather than dispatching a manual start every evening.
- **Production** — there is no auto-shutdown there, and the script refuses.

## Procedure

1. **Read the help** — it is the source of truth for flags and environment names:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/env-power --help
   ```

2. **Resolve the environment from `$ARGUMENTS`.** `aat`/`staging`, `preview`/`dev`, `demo`,
   `ithc`, `perftest`/`test`, `sandbox`, `ptl`, `ptlsbox`. If it's missing or ambiguous, ask —
   don't assume AAT because that's the usual one.

3. **State the cost impact and get an explicit acknowledgement before passing `--yes`.**
   `--dry-run` prints the banner and the dispatch command without firing anything:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/env-power start aat --dry-run
   ```
   Three points, and the banner has the current numbers:
   - it starts the whole CFT business area for that environment, not just PCS;
   - a start before 23:00 is undone by the 23:00 sweep;
   - a start after 23:00 holds until 20:00 the next day — around 21 hours, and on a Saturday
     or Sunday nobody else is using it.

4. **Dispatch** once they've confirmed, and report the run URL:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/env-power start aat --yes
   ```
   A `403` here means the token lacks push on `hmcts/auto-shutdown` or the `workflow` scope —
   the script says so and falls back to the UI link.

5. **Set expectations.** A green run means the start was *requested*; `az aks start` runs with
   `--no-wait`. Nodes take several minutes, pods and ingress longer. If the user needs to know
   it's actually up, poll the service rather than trusting the run status.

6. **Offer to stop it** when the user says they're finished. `stop` needs no confirmation:
   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/env-power stop aat
   ```

## Don't

- Don't pass `--yes` on the strength of the original request. The acknowledgement has to be a
  separate answer to the cost, which is the whole reason the gate exists.
- Don't drive `az aks start` directly. The dispatch keeps the platform's audit trail and also
  covers the application gateway and the databases, which an environment is useless without.
- Don't restate the shutdown times from memory — they change. Quote the banner, or read
  `docs/how-to/auto-shutdown.md`.
