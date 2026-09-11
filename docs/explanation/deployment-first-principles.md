---
title: Why CFT deploys the way it does — first principles
topic: deployment-first-principles
diataxis: explanation
product: workspace
audience: both
---
# Why CFT deploys the way it does — first principles

Every mechanism in the CFT delivery chain — common component charts, per-PR preview stacks, Key
Vault CSI, image retagging, GitOps, image automation, pre-merge cleanup — exists because of a
specific problem. None of them is arbitrary, and none of them is obvious from reading the YAML.

This page derives the whole system from its constraints. Each section is **problem → forced move →
what it costs you**. Read it once to build the model; after that, the failure grammar in §12 is the
part you come back to.

The companion page, [Helm common components, Flux, and preview stacks](helm-common-components.md),
is the *descriptive* version — which file does what, with `pcs-api` and `pcs-frontend` as the worked
example. This page is the *why*.

---

## 0. The constraints everything follows from

Six facts about CFT. Nothing below is a design preference; it all falls out of these.

1. **Scale asymmetry.** Roughly 200 services and 40-odd delivery teams share one platform team.
   Anything that requires the platform team to touch each service does not scale.
2. **Services are only correct together.** A CCD case-type change is not testable in one repo — it
   spans the definition store, the data store, XUI, and often role assignment. Unit tests cannot
   catch integration defects by construction.
3. **Shared environments are scarce and serialising.** There is one AAT. If it is the only place
   integration is provable, every team queues behind every other team, and one bad deploy blocks
   everyone.
4. **Secrets cannot be in git.** Not encrypted-in-git for app credentials, not baked into images,
   not in the chart.
5. **What you tested must be what you run.** Any step that *rebuilds* between test and production
   invalidates the test.
6. **Every change must be auditable and revertible.** "What was running in perftest last Tuesday,
   and who changed it?" must have an answer that is not a Jenkins log retention policy.

---

## 1. Problem: N services × M Kubernetes concerns

**The problem.** Every web service needs the same objects — Deployment, Service, Ingress, HPA, PDB,
ConfigMap, a secrets mechanism, probes, affinity, topology spread. With 200 services hand-writing
them, you get 200 subtly different interpretations of "correct", and a platform-wide fix (a probe
default, a CSI driver upgrade, a security header) becomes 200 pull requests. By constraint 1, that
never happens, so the fix never lands.

**The forced move.** Factor the invariant part out. The *shape* of an HMCTS workload is fixed; only
the parameters vary. That is exactly what a Helm library chart is:

```
library (v2)          # the templates — _deployment.tpl, _ingress.tpl, _hpa.tpl, …
   ↑
java / nodejs         # the runtime contract: which values exist, what they mean
   ↑
pcs-api / pcs-frontend   # parameters only — no templates of its own
```

`charts/pcs-api/` contains a `NOTES.txt` and nothing else under `templates/`. It is a *values file
with a dependency list*. That is the intended end state, not an omission.

**What it costs.** Defaults become invisible. You cannot see, from your repo, what the base chart is
already doing for you — and Helm's merge semantics are unforgiving: overriding a **list** replaces
it rather than merging it. Overriding XUI's `keyVaults` secret list in a preview overlay silently
dropped a secret the base chart mounted by default, `/api/monitoring-tools` began returning 500,
and every make-a-claim journey died — with no change in the PCS repo to explain it.

> **The rule this implies.** Before overriding any list-valued key in a common chart, render the
> chart without your override and diff. `helm template` is cheap; a lost default is not.

---

## 2. Problem: integration bugs only exist where services meet

**The problem.** Constraint 2 says correctness is a property of the assembly, not the parts.
Constraint 3 says the shared assembly is a bottleneck. Together these are the central tension in
CFT delivery: *the only place you can prove your change is the one place you cannot have to
yourself.*

**The naive answer and why it fails.** "Test on AAT." Then: you queue; you cannot run destructive
tests because someone else's data is there; a broken deploy blocks 40 teams; and you find the
integration bug at the *end* of your change, when it is most expensive to fix.

Worse, the shared environment is sometimes not merely contended but **unable** — the platform
capability your change depends on is switched off there, or unreleased, and enabling it is another
team's decision. Then there is no amount of waiting that makes AAT a valid test. §11 works through
exactly this case, and it is the strongest argument for what follows.

**The forced move.** Make the dependencies **installable**. If every service is packaged as a chart,
then any team can stand up a *private copy of someone else's service* inside their own release. Four
lines of `Chart.yaml`:

```yaml
  - name: ccd
    version: 9.2.3
    repository: 'oci://hmctsprod.azurecr.io/helm'
    condition: ccd.enabled
```

…gets a pull request its own definition store, data store, API gateway, admin web, Elasticsearch,
XUI and CDAM — versions pinned, maintained by the teams that own them.

This is the single biggest idea in the whole system. Everything else in this document is either an
enabler of it or a consequence of it. It moves integration testing **left**, from a shared
end-of-cycle environment onto the pull request, and it converts "wait for AAT" into "add a label".

**What it costs.** You now depend on other teams' *charts*, not just their APIs — a much wider
contract. And the preview overlays pin `:latest` for some upstreams, which means "whatever that team
last promoted to prod", so an upstream release can turn your PR red overnight with no change on
your side.

---

## 3. Problem: a full stack per PR is expensive

**The problem.** §2's answer, applied naively, gives every pull request a dozen services. Most PRs
change a validator and need none of them.

**The forced move.** Default everything off, and make the topology a **per-PR choice**. Two
mechanisms compose:

- `condition: ccd.enabled` in `Chart.yaml`, with `ccd: { enabled: false }` in `values.yaml`.
- A label convention: `pr-values:<x>` on the PR causes the pipeline to merge
  `values.<x>.<environment>.template.yaml` into the release.

So `pr-values:ccd` costs you a CCD estate, `pr-values:wa` costs you Camunda and the WA task APIs,
and a plain PR costs one pod and a database. The topology becomes a dial rather than a constant.

**What it costs.** Configuration is now assembled from an ordered list of overlays whose order is
determined by *GitHub label ordering*, and later files win. Two overlays that both set the same
list-valued key (`postgresql.setup.databases`: three entries in the CCD overlay, six in the WA one)
do not merge — the last one decides. Combinations are not tested; only individual overlays are.

---

## 4. Problem: five environments, one service

**The problem.** aat, demo, ithc, perftest, prod. The naive answer is `values.<env>.yaml` per
environment — five near-identical files that drift, where the diff between them is 95% noise and the
5% that matters is invisible.

**The forced move.** Notice that most "environment differences" are not differences at all — they
are the *same string with the environment substituted*:

```
pcs-api-aat.service.core-compute-aat.internal
pcs-api-prod.service.core-compute-prod.internal
```

So make the values file itself a template. The common charts run values through `tpl`, and the
deployer injects `global.environment`. One `values.yaml` covers every environment:

```yaml
ingressHost: pcs-api-{{ .Values.global.environment }}.service.core-compute-{{ .Values.global.environment }}.internal
```

Per-environment patches then carry **only genuine differences** — prod's is seven lines, because
prod's IDAM really is at a different hostname. The signal-to-noise ratio inverts: a patch file is now
a list of things that are actually special about that environment.

**What it costs.** Two templating languages in one file (`${SHELL}` substitution in the pipeline,
`{{ Helm }}` at render time), and a values file that cannot be read literally.

---

## 5. Problem: secrets

**The problem.** Constraint 4. The application needs credentials; git must not have them; the image
must not have them; and 200 services cannot each invent an answer.

**The forced move.** Separate the **reference** from the **value**. Git holds a declaration of
*which* secret is wanted and *what env var it should become*:

```yaml
keyVaults:
  pcs:
    secrets:
      - name: api-POSTGRES-PASS
        alias: PCS_DB_PASSWORD
```

The chart renders that into a `SecretProviderClass`. At pod start, the Azure Key Vault CSI driver
resolves it using the workload identity named by `aadIdentityName`. The secret exists only in Key
Vault and in the running pod's mount.

Three properties fall out, and they are the reason this shape is worth the indirection:

- `helm template` works with no Azure access at all — CI can render and lint the chart offline.
- Rotating a secret requires no deployment; the next pod start picks it up.
- Access is an *identity* question (`aadIdentityName` → which vaults), auditable in Azure rather
  than in YAML.

**What it costs.** Failures move to pod-start time and read as unrelated symptoms — a missing secret
surfaces as a 500 from some endpoint, not as a config error. See §1's cost: this is the same trap,
because `keyVaults` is a list.

---

## 6. Problem: what you tested must be what you run

**The problem.** Constraint 5. If the artifact is rebuilt on the way to production — even from the
same commit — you are running something you never tested. Non-hermetic builds, moving base images
and transitive dependency resolution make "same commit" a much weaker guarantee than people assume.

**The forced move.** Build once; **promote by retagging**. The image is pushed once with a build
tag, and passing each gate retags the identical bytes:

```
<tag>-<sha>-<ts>   →   staging-<sha>-…   →   aat-<sha>-…   →   prod-<sha>-…   →   latest
```

Nothing is rebuilt. A promotion is an assertion — "this artifact passed the previous stage" —
recorded in the registry.

**What it costs.** Tags are mutable pointers, and the registry purges them on a schedule (prod tags
live longest; other stages are aggressive). So a tag is a fine *promotion marker* and a poor *pin*:
pinning a PR-tagged image into a long-lived environment means depending on something the registry is
entitled to delete. It also means `:latest` is meaningful (last prod promotion) but not stable.

---

## 7. Problem: nobody knows what is running

**The problem.** Constraint 6. Under push-based CD, the desired state of production exists only as
the side effect of the last successful pipeline run. There is no artifact you can diff, no history
you can bisect, and "roll back" means "find and re-run an old build".

**The forced move.** Invert the direction. Put desired state in git; let a controller in the cluster
reconcile toward it. Then:

- `git log apps/pcs/pcs-api/` **is** the deployment history for that component.
- Rollback is `git revert`.
- Drift is corrected continuously, not at the next deploy.
- Access control is code review.

**What it costs.** The cluster is no longer authoritative — a manual `kubectl` change is transient
and will be reverted, which is correct but surprising. And a mistake in the repo propagates
automatically and quickly.

---

## 8. Problem: GitOps adds friction to the thing you do most

**The problem.** §7 says the desired image tag lives in git. But a release *is* an image tag change,
and it happens many times a day. If a human must open a PR against a config repo for every release,
you have traded auditability for latency — and by constraint 1, the platform team cannot be that
human.

**The forced move.** Split **policy** from **instance**. Humans own the policy — *which class of
tag this environment should track*, expressed declaratively:

```yaml
# ImagePolicy: track the newest prod-promoted build
filterTags: { pattern: '^prod-[a-f0-9]+-(?P<ts>[0-9]+)', extract: '$ts' }
```

A controller owns the instance — it resolves the policy against the registry and commits the
concrete tag back to git, as a bot. Auditability is preserved (it is still a commit) and latency
disappears.

**What it costs — and this is the expensive one.** You have introduced a *third* configuration
surface, distinct from the chart and from the HelmRelease, with its own failure modes that are
silent by construction:

- The automation only rewrites lines whose trailing comment is keyed **`$imagepolicy`**. A marker
  keyed anything else is not an error — the line is simply never updated, forever.
- To keep the fleet consistent, a platform-wide kustomize patch **overwrites** `filterTags` on every
  policy that does not carry `hmcts.github.com/prod-automated: disabled`. So a policy that asks for
  a non-prod pattern and forgets the annotation does not fail — it quietly gets the prod pattern
  instead.

Both failure modes are *invisible*: nothing goes red, the YAML looks right, and the environment runs
the wrong image. In August 2026 a PCS perftest pin hit both in sequence — the pin sat frozen for
three days (wrong marker key), and the moment the key was corrected, automation promptly replaced
the intended PR image with a prod one (missing annotation). Each was a one-line fix; neither
announced itself.

> **The rule this implies.** For anything touching image automation, verify by *rendering*, not by
> reading. `kustomize build … | yq 'select(.kind == "ImagePolicy" and .metadata.name == "…")'` shows
> the policy after patching — which is the only version that matters.

---

## 9. Problem: ephemeral and durable want opposite things

**The problem.** A preview environment and a production environment have contradictory requirements:

| | Preview | Durable (aat…prod) |
|---|---|---|
| Lifetime | minutes | months |
| Topology | arbitrary, per-PR | fixed, reviewed |
| Change rate | every push | on promotion |
| Failure cost | a red build | an incident |
| Wanted property | speed and flexibility | audit and stability |

One delivery mechanism optimised for both would be bad at both.

**The forced move.** Run **two paths over one chart**, deliberately:

- **Jenkins** for ephemeral. Imperative, fast, reads the chart *out of the branch* so an unmerged
  chart change is testable. Installs `pcs-api-pr-2179` (preview) and `pcs-api-staging` (an AAT test
  fixture that lives only for the build).
- **Flux** for durable. Declarative, audited, reads the chart from a *published* location.

This resolves an apparent oddity — "why is the chart in two places?" It is not duplication. Flux must
not depend on the branch state of a service repo, or every unmerged experiment would be one bad
reference away from production. So the master pipeline **publishes** the chart to a chart repository
on a `Chart.yaml` version bump.

**The consequence people trip on.** A chart change with no version bump is not published. The build
goes green, the preview proves the change works, and every Flux-managed environment keeps running
the old templates. The version bump is not bookkeeping; it is the release.

---

## 10. Problem: ephemeral things leak

**The problem.** §9's cheap, disposable environments are only cheap if they actually disappear. They
consume real, shared, finite resources: databases on one small managed Postgres server shared ~70
ways, servicebus subscriptions on a shared topic, persistent volumes.

**The forced move.** Tie teardown to the *build*, not to the merge. The pipeline uninstalls the Helm
release at the end of every deploy section — always on master, and on a PR unless it carries an
explicit keep-alive label. A preview normally exists for the duration of one build; keeping one
alive is an opt-in, and therefore visible.

**What it costs — the important first principle here.** *Helm uninstall removes what Helm made.*
Anything Helm asked **another controller** to make is removed only if that controller reconciles the
deletion. Per-PR databases are Azure Service Operator custom resources; deleting the release deletes
the CRs, and ASO *should* drop the databases. When it doesn't, the database survives — invisibly, on
a server that is already contended.

> **The rule this implies.** Teardown is only as reliable as the weakest cascade in it. For anything
> that crosses a controller boundary, **verify deletion, don't assume it**. This is exactly why the
> workspace's uninstall tooling checks that the databases were dropped rather than trusting the
> uninstall's exit code.

Symptoms of a leak arrive much later and look like something else: a Flyway checksum mismatch
crash-looping a pod because a reused PR number found stale schema state; connection exhaustion on
the shared server; a servicebus subscription quietly accumulating messages.

---

## 11. Problem: you cannot test a change whose dependencies do not exist yet

This is the sharpest form of the tension in §2, and it is the actual reason the preview overlays
exist. The usual framing — "AAT is busy, so we queue" — understates it. Often AAT is not busy. AAT
is **incapable**, because the thing your change depends on is switched off there, or not built yet,
or owned by a team whose release is months out.

**The worked example.** PCS group access needs four platform flags across `ccd-definition-store-api`
and `ccd-data-store-api`, owned by two other teams. All four are `false` in the base Flux config, and
no environment overrides them — so AAT, demo, ITHC, perftest and prod every one inherit `false`.
With the flags off, the definition store silently discards the AccessType sheets on import and the
data store ignores `CaseAccessGroups` on the case. There is no shared environment in CFT where this
feature can be observed working. Waiting for one means blocking a finished change behind two other
teams' backlogs, and merging it unproven means finding out in production.

**The forced move.** Own the stack. Because §2 made dependencies *installable*, a PR pod can run its
**own** CCD — and the team can set those flags to `true` on their own copy:

```yaml
# values.ccd.preview.template.yaml — on the in-chart CCD, not the platform's
ccd-definition-store-api: { java: { environment: { ENABLE_CASE_GROUP_ACCESS: true } } }
ccd-data-store-api:       { java: { environment: { ENABLE_CASE_GROUP_ACCESS_FILTERING: true } } }
```

That is what a preview chart is *for*. Not "a cheap copy of AAT" — **an environment whose
configuration you control end to end**, so a change can be proven before the platform it depends on
is ready for it. Independence from the queue is a nice side effect; independence from the *state of
the shared platform* is the point.

It also inverts the order of work. Instead of *wait for the platform → then build → then discover
the integration problems*, you build and prove against a stack you configured yourself, and arrive
at the platform conversation with a working demonstration and a precise list of what you need turned
on.

### The consequence: preview config has a lifecycle

Because previews are where you get *ahead* of the platform, the overlays accumulate config that is
true only until the rest of the world catches up. So preview values are not one thing to be kept or
purged wholesale — they are three things with three different lifetimes.

| | What it is | Lifetime | At merge |
|---|---|---|---|
| **1. Scaffolding** | What a preview *is*: hostnames, `ENABLE_TESTING_SUPPORT`, shrunken connection pools, wiremock stubs, in-pod Postgres | Permanent | Keep. Not a cleanup item. |
| **2. Ahead of the platform** | A flag you enable on your own in-chart copy because the platform has it off — group access is the canonical case | Until the platform catches up | Keep, **with a tracked exit**. Not a merge blocker. |
| **3. Build workaround** | A stage commented out, an upstream pinned to a PR image, a secret patching someone else's regression | Should have been hours | **Remove.** |

Category 2 is the one people get wrong in both directions. Deleting it at merge means the feature
stops being testable on any future PR — you have thrown away the only environment that can exercise
it. Leaving it *without a recorded exit* means that years later nobody knows whether the line is
still load-bearing, and the preview quietly diverges from every real environment in a way no one can
justify.

The question that sorts a line into its category is factual, not aesthetic:

> **Who owns this setting outside preview, and what has to become true for this line to be
> deletable?**

- *Nobody — it only means anything in a preview* → category 1. Keep, permanently.
- *Another team owns it, and it goes when they enable it* → category 2. Keep, and write down the
  trigger next to it.
- *Nobody should own it; it exists because a build went red* → category 3. Remove before merge.

Applied to group access: `ENABLE_CASE_GROUP_ACCESS*` stays in the preview overlay — the platform
owns those flags outside preview, and nothing in `values.yaml` or `values.aat.template.yaml` should
mention them. It becomes removable when CCD flips them on in the base Flux config. That is a
sentence worth putting in the file, beside the values.

### Why category 3 is the dangerous one

A value in a preview overlay has a shape no other config in the system has:

- it **never runs** in AAT, demo, perftest or prod — so no environment gate will ever exercise it;
- it **runs on every future pull request** in the repo, for everyone, indefinitely.

Blast radius: all future PRs. Detection probability: approximately zero. It cannot fail in AAT
because it is not in AAT, and it will not fail your build, because it worked on your build — that is
why you added it.

So for preview configuration, **code review at merge is the only gate that exists.** Every later
safety net in the pipeline is structurally incapable of catching it. That is not an argument for
distrusting preview overlays; categories 1 and 2 are exactly what previews are for. It is an
argument for category 3 never surviving the merge that introduced it — because nothing downstream
will notice it.

The failure mode is specific and it comes from time pressure, not carelessness. Each of these was
added to make a build go green, and each of them worked:

- A test stage commented out to get past a flaky dependency — now off for every future PR.
- A secret added to a list to work around an upstream regression — now permanent, undocumented, and
  outliving the regression it patched.
- An upstream service pinned to a PR image to unblock testing — now every future preview runs that
  unreleased build.

**The mechanical check**, and the reason it has to be mechanical: a `git diff` of your own repo does
not show what your branch left in the *config* repo.

```bash
git diff origin/master...HEAD -- charts/ Jenkinsfile_CNP     # in the service repo
# …and check cnp-flux-config for anything this branch pinned there
```

For each hunk: *which of the three categories is this?* Category 3 needs its own PR, its own ticket
and its own expiry — never a quiet ride into master on a feature branch.

## 12. Failure grammar

When something breaks, the symptom usually points at the wrong layer. This maps symptom → violated
principle → where to look.

| Symptom | Principle violated | Look at |
|---|---|---|
| A downstream endpoint 500s and nothing in your repo changed | §1 — overriding a list replaced a base-chart default | Render the chart without your override and diff |
| Works on preview, missing in AAT | §11 — preview enables something the platform still has off | Which values file holds it, and whether the platform flag has flipped |
| Works in AAT, missing in prod | §4 — a genuine environment difference has no patch | `apps/<ns>/<component>/prod.yaml` |
| Build is green, environment runs old code | §9 — no `Chart.yaml` version bump, so no chart publish | Published chart version vs the repo's |
| An environment is stuck on an old image | §8 — wrong setter key, so the line is never rewritten | The trailing `#{"$imagepolicy": …}` marker |
| An environment jumped to an unexpected image | §8 — the platform patch overwrote the intended `filterTags` | `kustomize build … \| yq` on the rendered ImagePolicy |
| Pod crash-loops on a Flyway checksum mismatch | §10 — a leaked database from a reused PR number | Per-PR databases on the shared server |
| Connection exhaustion on preview | §10 — leaked releases holding pools | Live releases vs open PRs |
| Preview came up without an expected database | §3 — two overlays set the same list; last one won | Label order and the overlay `-f` sequence |
| A PR is red and no PCS change explains it | §2 — an upstream `:latest` moved | Recent promotions of the upstream service |

---

## 13. The model in one page

If you keep nothing else:

1. **Your chart is a values file.** The behaviour lives in charts you did not write. Render before
   you override.
2. **Dependencies are installable, so integration testing moves onto the PR.** That is the point of
   the whole design.
3. **Topology is a per-PR dial**, default off, selected by label — and overlays are ordered, not
   merged.
4. **One values file, environment injected.** A per-environment patch should contain only what is
   genuinely special.
5. **Git holds secret *references*, never secrets.** Identity resolves them at pod start.
6. **Build once, promote by retagging.** A tag is a promotion marker, not a pin.
7. **Desired state lives in git**; a controller reconciles. `git log` is the deployment history.
8. **Humans own policy, robots own instances** — and the policy layer fails silently, so verify by
   rendering.
9. **Two delivery paths over one chart**, because ephemeral and durable want opposite things. The
   version bump is the release.
10. **Teardown is only as reliable as its weakest cascade.** Verify deletion.
11. **A preview is an environment you configure end to end** — that is what lets you prove a change
    before the platform it depends on is ready. Its config comes in three lifetimes: scaffolding
    (permanent), ahead-of-the-platform (keep, with a recorded exit), and build workarounds (remove
    before merge — nothing downstream can catch them).

## Related

- [Helm common components, Flux, and preview stacks](helm-common-components.md) — the descriptive
  companion: which file does what, with `pcs-api`/`pcs-frontend` worked through and sources cited
- [Cloud Native Platform](cloud-native-platform.md)
