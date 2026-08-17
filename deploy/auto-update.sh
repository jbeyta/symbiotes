#!/bin/zsh
# Rebuild + restart the launchd agent, but only when source files changed since
# the last automatic run. The Claude Code Stop hook calls this, so every edit
# lands on http://localhost:3000 without being asked for.
set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$REPO/.deploy-stamp"
cd "$REPO"

# Nothing newer than the last run? Then the build on disk is current.
if [[ -f "$STAMP" && -z "$(find backend/src frontend/src frontend/index.html frontend/vite.config.ts -type f -newer "$STAMP" -print -quit)" ]]; then
  exit 0
fi

# The agent is only worth restarting if it is loaded.
if ! launchctl list com.joelabeyta.symbiotes >/dev/null 2>&1; then
  exit 0
fi

if OUT="$("$REPO/deploy/update.sh" 2>&1)"; then
  touch "$STAMP"
  echo '{"systemMessage":"Symbiotes rebuilt and restarted on http://localhost:3000"}'
else
  printf '{"systemMessage":%s}\n' "$(printf '%s' "Symbiotes rebuild FAILED:
$OUT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
fi
