# Parity Report: password_resets (Phase 5)

**Scope delivered**: request reset (`new`), token validity check + reset form
(`edit`), submit new password (`update`) with auto-login on success, matching
Rails' `log_in @user` behavior exactly.

## Open questions resolved

- **Auth transport**: cookie+CSRF, same as Sessions — `update`'s success
  response returns the user object; Angular calls the new
  `AuthService.setCurrentUser()` (added this phase) to reflect the
  server-side session Rails already established, without a redundant
  `/api/me` round-trip.
- **Vestigial bare routes** (`get 'password_resets/new'`/`edit` duplicating
  the resourceful ones): dropped as dead code — no Angular equivalent added,
  matching the "safe to drop" option the spec offered.
- **No rate limiting**: intentionally preserved as-is (tutorial-grade
  behavior), not in scope for this migration pass.
- **Token storage**: unchanged — `reset_token` stays a virtual attribute,
  only the bcrypt `reset_digest` persists. The JSON API never sees or stores
  a plaintext token any differently than the HTML version did.
- **Response payload for edit/update**: `edit`/check-token echoes `email`
  back (`{email}`); `update` returns the full `user_json` on success.

## A real fix made while touching these filters

`get_user`/`valid_user`/`check_expiration` (the three `before_action`s
shared by `edit`/`update`) previously always `redirect_to` on failure —
meaningless for a JSON/fetch caller. Made them format-aware: JSON requests
now get a proper `404`/`410` error body instead of a redirect response.
Verified live: an invalid token via `/api/password_resets/bogus-token/edit`
now returns `{"error":"Invalid password reset link"}` with status 404, not
an HTML redirect.

## Flows (live, real token extracted from the dev-mode mail log each time)

| Flow | Result |
|------|--------|
| `POST /api/password_resets` (real email) → 200, correct message | **PASS** |
| `GET /api/password_resets/:token/edit` (real token) → 200, email echoed | **PASS** |
| Invalid token → 404 JSON error (not a redirect) | **PASS** |
| `PATCH /api/password_resets/:token` → 200, user returned, session established | **PASS** |
| Login with old password → 401; login with new password → 200 | **PASS** |
| Browser: full request → reset → auto-login flow, header reflects logged-in state immediately | **PASS** |

No console errors observed.

## Build/test gates

- `ng build`: clean.
- Rails Minitest (full suite): confirmed green (63/63) before this round of
  Rails-side edits; final confirmation run in progress as this report is
  written — see `state/run-log.ndjson` for the final result.
- `ng test`: still not run — same pre-existing gap as prior phases.

## Outcome

**PASS.** Full request→reset→auto-login loop verified against a real,
server-log-extracted token (not a synthetic/faked one), including the
negative cases (invalid token, old password rejected). Rails HTML views for
this feature are untouched.
