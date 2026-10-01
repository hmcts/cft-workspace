#!/usr/bin/env bash
# Scan a file for the secret-shaped strings listed in scripts/lib/secret-patterns.
# Usage: source "$(dirname "$0")/lib/_secret_scan.sh"; secret_scan_file <file>
#
# Returns grep's status: 0 a match, 1 clean, anything else an error. A missing
# or empty pattern list returns 2, so a caller that blocks on any status but 1
# fails closed. Reads a file rather than a pipe: grep -q exiting early SIGPIPEs
# the writer and pipefail hides the match. LC_ALL=C so an invalid byte can't
# hide a line.

SECRET_PATTERNS_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/secret-patterns"

secret_scan_file() {
    local file="$1" line
    local args=()
    [[ -r "$SECRET_PATTERNS_FILE" ]] || return 2
    while IFS= read -r line || [[ -n "$line" ]]; do
        case "$line" in
            '' | '#'*) continue ;;
        esac
        args+=(-e "$line")
    done < "$SECRET_PATTERNS_FILE"
    [[ ${#args[@]} -gt 0 ]] || return 2
    LC_ALL=C grep -Eq "${args[@]}" "$file"
}
