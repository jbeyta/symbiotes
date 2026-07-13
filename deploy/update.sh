#!/bin/zsh
# Rebuild the frontend and restart the running agent to pick up changes.
set -e
LABEL="com.joelabeyta.symbiotes"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
npm --prefix "$REPO" run build
launchctl kickstart -k "gui/$(id -u)/$LABEL"
echo "Rebuilt and restarted. http://localhost:3000"
