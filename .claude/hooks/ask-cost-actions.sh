#!/usr/bin/env bash
# PreToolUse(Bash): force a confirmation prompt before dispatching the
# hmcts/auto-shutdown workflows (env start/stop costs money). Matches any
# dispatch spelling; reads and other repos' workflow runs stay prompt-free.

cmd=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))' 2>/dev/null)

[ -z "$cmd" ] && exit 0

if printf '%s' "$cmd" | grep -qi 'auto-shutdown' \
   && printf '%s' "$cmd" | grep -qiE 'workflow[[:space:]]+run|/dispatches|workflow_dispatch'; then
  printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"This dispatches the auto-shutdown workflow - it starts or stops a shared Azure environment, which costs money. Confirm this specific run."}}'
fi

exit 0
