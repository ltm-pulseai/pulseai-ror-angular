#!/usr/bin/env bash
# Start everything for the full live demo in one shot:
#   - sandbox Rails (original, untouched jQuery/ERB "before")  -> :3099
#   - real Rails JSON API (finished migration)                 -> :3001
#   - real Angular app (finished migration)                    -> :4200
# Idempotent — skips any server already listening. Opens two browser tabs
# (sandbox + real app) at the end. See ..\..\..\..\..\ror-angular-live-demo\LIVE_DEMO_SCRIPT.md
# for the full presenter script this feeds into.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
SANDBOX_DIR="$(cd "$REPO_ROOT/../ror-angular-live-demo/rails-src-original" && pwd)"
cd "$REPO_ROOT"

RUN_DIR="${TMPDIR:-/tmp}/live-demo-run"
mkdir -p "$RUN_DIR"
SANDBOX_LOG="$RUN_DIR/sandbox-rails.log"
RAILS_LOG="$RUN_DIR/rails.log"
NG_LOG="$RUN_DIR/ng.log"
SANDBOX_PID="$RUN_DIR/sandbox-rails.pid"
RAILS_PID="$RUN_DIR/rails.pid"
NG_PID="$RUN_DIR/ng.pid"

echo "== start-all: $REPO_ROOT =="

# 1. git clean on the real repo (the sandbox at $SANDBOX_DIR is a separate
#    repo, untouched by the demo, and is not gated on this)
DIRTY="$(git status --porcelain)"
if [ -n "$DIRTY" ]; then
  echo "FAIL: git status not clean in $REPO_ROOT:"
  echo "$DIRTY"
  echo "Resolve/commit/stash before demo — cleanup.sh assumes clean start."
  exit 1
fi
echo "OK  git status clean"

port_up() {
  curl -s -o /dev/null -m 2 "http://localhost:$1$2" 2>/dev/null
}

start_bg() {
  # runs "$4..." in dir "$1", backgrounded + disowned so it survives this
  # script's own process exiting (plain `nohup ... &` alone does not
  # reliably survive under Git Bash/MSYS on Windows)
  local dir="$1" log="$2" pidfile="$3"; shift 3
  ( cd "$dir" && nohup "$@" >"$log" 2>&1 & echo $! >"$pidfile"; disown ) &
  wait
}

# 2. Sandbox Rails (original, untouched) on :3099
if port_up 3099 /; then
  echo "OK  Sandbox Rails already up on :3099"
else
  echo "..  starting sandbox Rails ($SANDBOX_DIR, port 3099)"
  start_bg "$SANDBOX_DIR" "$SANDBOX_LOG" "$SANDBOX_PID" bundle exec rails s -p 3099
  for i in $(seq 1 30); do
    port_up 3099 / && break
    sleep 1
  done
  if port_up 3099 /; then
    echo "OK  Sandbox Rails up on :3099 (pid $(cat "$SANDBOX_PID"), log $SANDBOX_LOG)"
  else
    echo "FAIL: sandbox Rails did not come up in 30s — check $SANDBOX_LOG"
    exit 1
  fi
fi

# 3. Real Rails JSON API on :3001 — /api/csrf_token is a real unauthenticated route
if port_up 3001 /api/csrf_token; then
  echo "OK  Rails API already up on :3001"
else
  echo "..  starting Rails API (rails-src, port 3001)"
  start_bg "$REPO_ROOT/rails-src" "$RAILS_LOG" "$RAILS_PID" bundle exec rails s -p 3001
  for i in $(seq 1 30); do
    port_up 3001 /api/csrf_token && break
    sleep 1
  done
  if port_up 3001 /api/csrf_token; then
    echo "OK  Rails API up on :3001 (pid $(cat "$RAILS_PID"), log $RAILS_LOG)"
  else
    echo "FAIL: Rails API did not come up in 30s — check $RAILS_LOG"
    exit 1
  fi
fi

# 4. Angular on :4200
if port_up 4200 /; then
  echo "OK  Angular already up on :4200"
else
  echo "..  starting Angular (angular-app, port 4200)"
  start_bg "$REPO_ROOT/angular-app" "$NG_LOG" "$NG_PID" ng serve
  for i in $(seq 1 60); do
    port_up 4200 / && break
    sleep 1
  done
  if port_up 4200 /; then
    echo "OK  Angular up on :4200 (pid $(cat "$NG_PID"), log $NG_LOG)"
  else
    echo "FAIL: Angular did not come up in 60s — check $NG_LOG"
    exit 1
  fi
fi

# 5. Open browser tabs — sandbox "before" + real Angular "after". Login is
#    manual (needs a real cookie session, not a scripted one); both apps use
#    the same seed creds.
open_url() {
  ( command -v start >/dev/null && cmd.exe /c start "" "$1" ) \
    || ( command -v xdg-open >/dev/null && xdg-open "$1" ) \
    || ( command -v open >/dev/null && open "$1" ) \
    || echo "    (no opener found — open manually: $1)"
}
echo "..  opening browser tabs"
open_url "http://localhost:3099/login"
open_url "http://localhost:4200/login"

cat <<EOF

== everything up ==
Sandbox Rails (before) : http://localhost:3099  (log: $SANDBOX_LOG)
Rails API (after)      : http://localhost:3001  (log: $RAILS_LOG)
Angular (after)        : http://localhost:4200  (log: $NG_LOG)

Log in on both tabs with:
  email:    example@railstutorial.org
  password: foobar
Sandbox user #1 already follows several others (100 seeded users) — an
Unfollow button is visible with no setup click.

Full presenter script: ../ror-angular-live-demo/LIVE_DEMO_SCRIPT.md

To stop everything this script started:
  kill \$(cat "$SANDBOX_PID") \$(cat "$RAILS_PID") \$(cat "$NG_PID") 2>/dev/null || true
EOF
