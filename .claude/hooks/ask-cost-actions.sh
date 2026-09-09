#!/usr/bin/env bash
# PreToolUse(Bash) guard: force a confirmation prompt before any command that
# dispatches the hmcts/auto-shutdown workflows (environment start/stop).
#
# Why this exists: starting a shared Azure environment costs real money, and an
# AI session once dispatched the start workflow unattended. Broad permission ask
# rules (gh workflow run:*, gh api:*) proved too noisy - they prompt on every
# workflow dispatch and every read-only API call. This hook prompts ONLY when a
# command both references auto-shutdown AND uses a dispatch verb, so ordinary
# gh usage (gh run list/view, other repos' workflow runs, gh api reads) stays
# prompt-free. Catches every spelling and tool: gh workflow run, gh api in any
# argument order, curl to the dispatches endpoint.
#
# Output: a PreToolUse permissionDecision of "ask" - the harness shows the user
# an approve/deny prompt even in modes that normally auto-approve.

input=$(cat)
cmd=$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)

[ -z "$cmd" ] && exit 0

if printf '%s' "$cmd" | grep -qi 'auto-shutdown' \
   && printf '%s' "$cmd" | grep -qiE 'workflow[[:space:]]+run|/dispatches|workflow_dispatch'; then
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"This dispatches the auto-shutdown workflow - it starts or stops a shared Azure environment, which costs money. Confirm this specific run."}}'
  exit 0
fi

exit 0
