#!/bin/zsh
# Stop and remove the Symbiotes launchd agent.
LABEL="com.joelabeyta.symbiotes"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/$LABEL.plist"
echo "Symbiotes agent removed."
