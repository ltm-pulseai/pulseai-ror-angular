#!/usr/bin/env bash
# Reset the live-demo's target paths back to the last committed state.
# Run before AND after every live-demo run so each run starts (and ends)
# from an identical, pristine baseline.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
cd "$REPO_ROOT"

TARGETS=(
  "specs/04-relationships.md"
  "angular-app/src/app/features/relationships"
  "angular-app/src/app/features/users/profile"
  "reports/parity/relationships.md"
  "state/migration-state.json"
  "state/run-log.ndjson"
)

echo "== live-demo cleanup: $REPO_ROOT =="

# 1. Refuse to touch anything if there's uncommitted work OUTSIDE the demo's
#    known target paths — never silently discard unrelated in-progress work.
DIRTY_OUTSIDE=""
while IFS= read -r line; do
  [ -z "$line" ] && continue
  f="$(printf '%s' "$line" | cut -c4-)"
  in_target=false
  for t in "${TARGETS[@]}"; do
    case "$f" in
      "$t"|"$t"/*) in_target=true ;;
    esac
  done
  if [ "$in_target" = false ]; then
    DIRTY_OUTSIDE="${DIRTY_OUTSIDE}${line}\n"
  fi
done < <(git status --porcelain)

if [ -n "$DIRTY_OUTSIDE" ]; then
  echo "Refusing to reset: uncommitted changes exist OUTSIDE the demo's target paths:"
  printf '%b' "$DIRTY_OUTSIDE"
  echo "Resolve or stash these first — cleanup.sh will not touch anything outside its known targets."
  exit 1
fi

# 2. Restore every target path to its last committed state.
git checkout -- "${TARGETS[@]}"

# 3. Remove any stray leftovers a previous demo run may have left.
rm -rf "angular-app/src/app/features/relationships/follow-button.bak"

# 4. Confirm clean.
REMAINING="$(git status --porcelain -- "${TARGETS[@]}")"
if [ -n "$REMAINING" ]; then
  echo "cleanup.sh FAILED — targets still dirty after checkout:"
  echo "$REMAINING"
  exit 1
fi

echo "== reset complete — all demo targets restored to committed state =="
