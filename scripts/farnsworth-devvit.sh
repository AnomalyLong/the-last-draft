#!/bin/bash
# farnsworth:devvit — boot the Devvit vibe-coding-template dev server in the
# background so Farnsworth IDE can render the live canvas via iframe.
#
# This is the Devvit-specific launcher. Other app types (three.js, blockchain,
# ...) get their own `farnsworth:<type>` scripts that write their own meta file
# (~/.cache/farnsworth-<type>.json). Farnsworth reads the meta matching the
# open workspace's appType.
#
# Writes ~/.cache/farnsworth-devvit.json with {type, url, pid, pids, startedAt, log}.
#
# Spawns:
#   - Vite dev server on port 5174 (client-only; renders the iframe game)
#   - Server runner on port 3000 (runs the workspace's src/server/ tRPC + Hono
#     code with the Farnsworth Devvit emulator backing redis/reddit, so user
#     saves persist across Farnsworth restarts). Added Jul 10.
#
# Usage:
#   npm run farnsworth:devvit          # boot (replaces any running instance)
#   pkill -f vite.devtools.config.ts   # stop (vite)
#   pkill -f server-runner.mjs         # stop (server-runner)
#
# Requires:
#   npm + node on PATH (export PATH="/opt/homebrew/bin:$PATH" if needed)

set -e

APP_TYPE="devvit"
CACHE_DIR="$HOME/.cache"
META_FILE="$CACHE_DIR/farnsworth-${APP_TYPE}.json"
LOG_FILE="$CACHE_DIR/farnsworth-${APP_TYPE}.log"
SERVER_LOG_FILE="$CACHE_DIR/farnsworth-${APP_TYPE}-server.log"
PORT=5174
SERVER_PORT="${DEVVIT_EMULATOR_SERVER_PORT:-3000}"
URL="http://localhost:${PORT}"
SERVER_URL="http://localhost:${SERVER_PORT}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Resolve the Farnsworth-side server-runner.mjs. Override with
# FARNSWORTH_DEVVIT_RUNNER for testing a different runner build.
FARNSWORTH_DIR="${FARNSWORTH_DIR:-$HOME/Documents/Farnsworth}"
SERVER_RUNNER="${FARNSWORTH_DEVVIT_RUNNER:-$FARNSWORTH_DIR/app/devvit-emulator/server-runner.mjs}"

mkdir -p "$CACHE_DIR"

# 1. Kill any old instance (best-effort). Both Vite (pid) and server-runner
# (serverPid) — the latter was added Jul 10 when the emulator server-runner
# shipped. Older meta files without serverPid are handled gracefully.
if [ -f "$META_FILE" ]; then
  KILL_PIDS=$(node -e "
    try {
      const m = JSON.parse(require('fs').readFileSync('$META_FILE','utf8'));
      const ids = [];
      if (m.pid) ids.push(m.pid);
      if (m.serverPid) ids.push(m.serverPid);
      console.log(ids.join(' '));
    } catch(e) {}
  " 2>/dev/null || true)
  for OLD_PID in $KILL_PIDS; do
    if kill -0 "$OLD_PID" 2>/dev/null; then
      echo "killing old ${APP_TYPE} dev process (pid $OLD_PID)"
      kill "$OLD_PID" 2>/dev/null || true
      sleep 0.3
      kill -9 "$OLD_PID" 2>/dev/null || true
    fi
  done
fi
pkill -f 'vite.devtools.config.ts' 2>/dev/null || true
pkill -f 'server-runner.mjs' 2>/dev/null || true
sleep 0.3

# 2. Ensure npm is on PATH (Apple Silicon host_bash shells don't have it)
export PATH="/opt/homebrew/bin:${PATH}"

# 3. Boot vite in the background
cd "$REPO_ROOT"
echo "starting ${APP_TYPE} vite dev server on $URL..."
nohup npm run dev:tools > "$LOG_FILE" 2>&1 </dev/null &
VITE_PID=$!
disown

# 4. Boot the Farnsworth Devvit emulator server-runner. It bundles + runs
# the workspace's src/server/index.ts with the emulator inlined, so the
# user's redis/reddit writes hit the persistent JSON state file (which
# main.js's dev:farnsworth:boot IPC has already configured via env vars).
# If the runner fails to start (e.g. missing esbuild), we log it but don't
# block Vite — the iframe game can still load without server-side data.
SERVER_PID=""
if [ -f "$SERVER_RUNNER" ]; then
  echo "starting ${APP_TYPE} emulator server-runner on $SERVER_URL..."
  nohup /opt/homebrew/bin/node "$SERVER_RUNNER" "$REPO_ROOT" \
    > "$SERVER_LOG_FILE" 2>&1 </dev/null &
  SERVER_PID=$!
  disown
  echo "  server-runner pid: $SERVER_PID  log: $SERVER_LOG_FILE"
else
  echo "warning: server-runner not found at $SERVER_RUNNER (skipping)"
fi

# 5. Write metadata so the Farnsworth main process can find us. pids are an
# object {vite, server} so renderer-side code can stop either independently.
node -e "
const fs = require('fs');
const meta = {
  type: '$APP_TYPE',
  url: '$URL',
  pid: $VITE_PID,
  serverPid: $SERVER_PID,
  serverUrl: '$SERVER_URL',
  startedAt: new Date().toISOString(),
  log: '$LOG_FILE',
  serverLog: '$SERVER_LOG_FILE',
  repoRoot: '$REPO_ROOT',
};
fs.writeFileSync('$META_FILE', JSON.stringify(meta, null, 2));
console.log('wrote $META_FILE');
"

# 6. Wait for the vite server to be ready (max 30s)
echo "waiting for $URL to respond..."
for i in $(seq 1 60); do
  if curl -s -o /dev/null -w '%{http_code}' "$URL/" 2>/dev/null | grep -q '^200$'; then
    echo ""
    echo "✓ farnsworth:${APP_TYPE} dev server up at $URL"
    echo "  vite pid:        $VITE_PID"
    echo "  vite log:        $LOG_FILE"
    if [ -n "$SERVER_PID" ]; then
      echo "  server pid:      $SERVER_PID"
      echo "  server log:      $SERVER_LOG_FILE"
      echo "  server url:      $SERVER_URL"
    fi
    echo "  meta:            $META_FILE"
    echo ""
    echo "next:"
    echo "  - Farnsworth canvas auto-detects this when the open workspace is a ${APP_TYPE} app."
    echo "  - To stop vite:    pkill -f vite.devtools.config.ts"
    echo "  - To stop server: pkill -f server-runner.mjs"
    exit 0
  fi
  sleep 0.5
done

echo ""
echo "✗ farnsworth:${APP_TYPE} dev server failed to respond within 30s"
echo "  tail $LOG_FILE for details"
exit 1