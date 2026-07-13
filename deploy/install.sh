#!/bin/zsh
# Install Symbiotes as an always-on launchd agent (auto-starts on login,
# restarts if it dies). Re-run this after upgrading Node via nvm — it
# re-detects the node/npm paths and rewrites the plist.
set -e

LABEL="com.joelabeyta.symbiotes"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
NPM="$(command -v npm)"
NODE_BIN="$(dirname "$(command -v node)")"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ -z "$NPM" ]; then echo "npm not found on PATH"; exit 1; fi
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"

echo "Building the frontend…"
npm --prefix "$REPO" run build >/dev/null

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NPM</string>
    <string>start</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$REPO</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$NODE_BIN:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/symbiotes.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/symbiotes.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed. Symbiotes is running at http://localhost:3000 and will start on login."
echo "Logs: ~/Library/Logs/symbiotes.log"
