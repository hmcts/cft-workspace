---
title: Environment schedule
topic: auto-shutdown
diataxis: how-to
product: workspace
audience: both
---
# Environment schedule

### Schedule

See below the list of environments that are shut down outside of working hours on Monday to Friday (they are shutdown the whole weekend as well):

| Shared Services | CFT | Shutdown | Start |
|-|-|-|-|
| Staging | AAT | 8pm | 7am |
| Demo | Demo | 8pm | 7am |
| ITHC | ITHC | 8pm | 7am |
| Test | Perftest | 8pm | 7am |
| Dev | Preview | 8pm | 7am |
| PTL | PTL | 8pm | 7am |
| PTLSBOX | PTLSBOX | 8pm | 7am |
| Sandbox | Sandbox | 8pm | 7am |


### How to start and stop the resources for an environment from pipeline

Currently we start and stop the AKS Clusters, Application Gateways and Postgres Flexible Servers for the above mentioned environments. If required, the resources in an environment can be started outside of these hours using a GitHub action on the [auto-shutdown](https://github.com/hmcts/auto-shutdown) repository.

#### Start or Stop a specific environment

This manual job will start or stop the below resources for a specific environment:
- AKS Cluster
- Application Gateway
- Postgres Flexible Server
- Virtual Machines (this includes jumpboxes and bastions)

1. Navigate to [Manual Start / Stop](https://github.com/hmcts/auto-shutdown/actions/workflows/manual-start-stop.yaml) action on the auto-shutdown repository.
2. Select 'Run Workflow'
3. Ensure the 'master' branch and the correct Mode, Business Area and Environment options are selected. Then select 'Run Workflow'
4. Select the new build which will appear at the top under Workflow Runs and will be identifiable by an orange dot which means the build is currently running.

This job selects resources by Azure tag (business area and environment), not by name. For example, running a Postgres Flexible Server stop/start for `CFT` + `Preview` acts on every shared preview flexible server carrying those tags — across every product in that environment — not just the one you're trying to fix. Check with `#platops-help` before using this to restart a single stuck server outside its own resource-specific tooling.

A green workflow run does not guarantee the resource actually started. The underlying start script swallows `az` errors, so dispatching a start while the environment's nightly auto-shutdown is still mid-stop causes Azure to reject the start — the workflow still reports success, and the cluster stays stopped. Confirm the real power state directly (e.g. `az aks show -n <cluster> -g <resource-group> --query powerState.code`) rather than trusting the run's conclusion, especially if you dispatch close to the scheduled shutdown or start times.

### Skip shutdown functionality
In the event that an environment or environments are needed outside of the default hours, you can raise a request to automatically exclude it from the shutdown schedule.
You can view more details in the auto-shutdown [README](https://github.com/hmcts/auto-shutdown/blob/master/README.md)

### Renovate automerge and the shutdown window

A PR rebuild that lands while its environment's AKS cluster is powered off for the shutdown window fails its deploy stage — typically with a DNS-lookup-style error that looks environmental rather than dependency-related, and this can happen even outside Renovate's own configured schedule, since another PR merging can trigger a `synchronize` rebuild at any time. With automerge enabled, one PR failing this way blocks every automerge PR queued behind it. Scheduling Renovate's own runs around the window doesn't prevent this on its own; a retry that re-runs a PR only when the deploy stage was its sole failure is more reliable than trying to time around the schedule.

### How to ask for help
If you need help you can raise a help request to the Platform Operations team via the [#platops-help (Slack)](https://hmcts-reform.slack.com/app_redirect?channel=platops-help) channel.
