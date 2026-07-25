# Parity Report: relationships (Phase 4)

**Scope delivered**: follow/unfollow via a single signal-driven
`FollowButtonComponent` (replacing the three ERB partials + `.js.erb`
DOM-swap pattern), embedded in `ProfileComponent`. `FollowListComponent`
(`/users/:id/following`/`followers`) explicitly **not built** — it's listed
in the spec as Phase 2/Users territory and wasn't in either phase's
delivered scope; the counts/links still show as plain text in
`StatsComponent` (decision made back in Phase 3).

## Two open questions resolved as intentional fixes, not preserved bugs

1. **`destroy` authorization gap** (spec Open Question 1): original Rails
   code did `Relationship.find(params[:id]).followed` with no ownership
   check. Fixed: `current_user.active_relationships.find(params[:id])` —
   a relationship id belonging to another user now 404s instead of silently
   no-op'ing (or worse, in principle, being exploitable).
2. **No duplicate-follow guard** (spec Open Question 3): original code had
   none — a double-click would hit the DB's unique index and 500. Fixed:
   `current_user.follow(@user) unless current_user.following?(@user)`,
   verified idempotent via curl (two rapid follow calls → same
   `relationshipId` both times, no error, no duplicate row).

Response-format duality (Open Question 2) resolved as anticipated: `/api`
routes return pure JSON (`follow_state_json`), HTML/`.js.erb` paths
untouched.

## Flows (live)

| Flow | Result |
|------|--------|
| `POST /api/relationships {followed_id}` → 200, correct follow-state | **PASS** (curl, 2 real users) |
| Viewed user's `GET /api/users/:id` reflects the new follower/relationshipId | **PASS** |
| `DELETE /api/relationships/:id` → 200, state reverts, counts update | **PASS** |
| Duplicate-follow (2 rapid POSTs) → idempotent, same relationshipId, no error | **PASS** |
| Browser: Unfollow → Follow toggle on another user's profile, instant UI update, no reload | **PASS** |
| Browser: no follow button rendered on one's own profile | **PASS** |

No console errors observed. No DOM string replacement anywhere — confirmed
by inspection (`FollowButtonComponent` is pure signal state + `@if`/`@else`,
no `innerHTML` writes).

## Build/test gates

- `ng build`: clean.
- Rails Minitest (full suite): **63 runs, 339 assertions, 0 failures, 0 errors.**
- `ng test`: still not run — same pre-existing gap as prior phases.

## Outcome

**PASS** for the scope delivered. Rails HTML/`.js.erb` paths for
relationships are untouched (not deleted) — the app isn't fully migrated yet,
so those still serve real traffic for any user who hits Rails directly.
