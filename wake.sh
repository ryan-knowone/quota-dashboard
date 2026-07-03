#!/usr/bin/env bash
# Generic agent heartbeat — one auto-mode cycle. No-ops unless ARMED exists in this agent's dir.
set -uo pipefail
export PATH="$HOME/.local/bin:$PATH"
A="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
[ -f "$A/ARMED" ] || exit 0
exec 9>"$A/.wake.lock"; flock -n 9 || { echo "$(date -Is) skip(busy)" >> "$A/JOURNAL/heartbeat.log"; exit 0; }
cd "$A" || exit 1
set -a; source "$HOME/.config/ryan/kimi.env"; set +a
echo "$(date -Is) START" >> "$A/JOURNAL/heartbeat.log"
timeout 1800 "$HOME/.local/bin/ryan-claude" --dangerously-skip-permissions -p "$(cat "$A/.wake-prompt.txt")" >> "$A/JOURNAL/$(date +%F)-runs.log" 2>&1
echo "$(date -Is) END rc=$?" >> "$A/JOURNAL/heartbeat.log"
