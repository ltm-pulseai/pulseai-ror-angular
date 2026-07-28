#!/usr/bin/env bash
# Prep for live-demo: clean git, Rails on :3001, Angular on :4200, browser
# tab open at /login (seed creds printed). Idempotent — skips servers
# already listening.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
cd "$REPO_ROOT"

RUN_DIR="${TMPDIR:-/tmp}/live-demo-run"
mkdir -p "$RUN_DIR"
RAILS_LOG="$RUN_DIR/rails.log"
NG_LOG="$RUN_DIR/ng.log"
RAILS_PID="$RUN_DIR/rails.pid"
NG_PID="$RUN_DIR/ng.pid"

echo "== live-demo prereq check: $REPO_ROOT =="

# 1. git clean
DIRTY="$(git status --porcelain)"
if [ -n "$DIRTY" ]; then
  echo "FAIL: git status not clean:"
  echo "$DIRTY"
  echo "Resolve/commit/stash before demo — cleanup.sh assumes clean start."
  exit 1
fi
echo "OK  git status clean"

port_up() {
  curl -s -o /dev/null -m 2 "http://localhost:$1$2" 2>/dev/null
}

# 2. Rails on :3001 — /api/csrf_token is a real unauthenticated JSON route
if port_up 3001 /api/csrf_token; then
  echo "OK  Rails already up on :3001"
else
  echo "..  starting Rails (rails-src, port 3001)"
  ( cd rails-src && nohup bundle exec rails s -p 3001 >"$RAILS_LOG" 2>&1 & echo $! >"$RAILS_PID" )
  for i in $(seq 1 30); do
    port_up 3001 /api/csrf_token && break
    sleep 1
  done
  if port_up 3001 /api/csrf_token; then
    echo "OK  Rails up on :3001 (pid $(cat "$RAILS_PID"), log $RAILS_LOG)"
  else
    echo "FAIL: Rails did not come up in 30s — check $RAILS_LOG"
    exit 1
  fi
fi

# 3. Angular on :4200
if port_up 4200 /; then
  echo "OK  Angular already up on :4200"
else
  echo "..  starting Angular (angular-app, port 4200)"
  ( cd angular-app && nohup ng serve >"$NG_LOG" 2>&1 & echo $! >"$NG_PID" )
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

# 4. Browser tab at /login, seed creds printed (fill manually — demo needs a
#    real logged-in session/cookie, not a scripted one)
LOGIN_URL="http://localhost:4200/login"
echo "..  opening $LOGIN_URL"
( command -v start >/dev/null && cmd.exe /c start "" "$LOGIN_URL" ) \
  || ( command -v xdg-open >/dev/null && xdg-open "$LOGIN_URL" ) \
  || ( command -v open >/dev/null && open "$LOGIN_URL" ) \
  || echo "    (no opener found — open manually: $LOGIN_URL)"

cat <<EOF

== prereqs ready ==
Rails    : http://localhost:3001  (log: $RAILS_LOG)
Angular  : http://localhost:4200  (log: $NG_LOG)
Login at : $LOGIN_URL
  email:    example@railstutorial.org
  password: foobar
Log in, land on that user's profile page (Follow/Unfollow one click away),
then start the live-demo skill.

To stop servers this script started:
  kill \$(cat "$RAILS_PID") "$NG_PID" 2>/dev/null || true
EOF
