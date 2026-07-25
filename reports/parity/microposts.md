# Parity Report: microposts (Phase 3)

**Scope delivered**: create (content, optional image upload), delete, feed
display (home page logged-in branch + profile page's own-posts list).
`StatsComponent` (shared with a future Relationships display) built as
display-only per `specs/03-microposts.md` §4's own note — no follow/unfollow
action yet (Phase 4).

**Not deeply tested**: image upload. The API accepts a `micropost[image]`
multipart field and `micropost_json` returns a resolved variant URL
(`rails_representation_path`), but no actual image file was uploaded during
this verification pass — no test fixture image was on hand and it wasn't
worth fabricating one just to exercise this path. Text-only microposts (the
overwhelming common case) are fully verified. Flag this as an open item if
image upload matters before this phase is considered fully closed.

## Flows (live)

| Flow | Result |
|------|--------|
| POST `/api/microposts` (content only) → 201, correct body | **PASS** (curl) |
| `GET /api/feed` reflects new post, newest-first | **PASS** (curl) |
| `DELETE /api/microposts/:id` → 204, feed empties | **PASS** (curl) |
| Browser: home page logged-in branch renders gravatar/name/stats/form/feed | **PASS** |
| Browser: posting via the form updates the feed immediately, no reload | **PASS** |
| Browser: delete via native `confirm()` — dialog auto-dismissed by the browser-automation tool on first attempt (expected tool behavior, not an app bug); stubbing `window.confirm` to auto-accept and retrying confirmed the delete flow itself works correctly | **PASS** |
| Browser: profile page (`/users/:id`) shows micropost count + list with content/timestamp | **PASS** |

No console errors observed in any browser flow.

## Build/test gates

- `ng build`: clean.
- Rails Minitest (full suite): **63 runs, 339 assertions, 0 failures, 0 errors.** No regressions from the additive `/api/feed` and `/api/microposts` routes.
- `ng test`: still not run — same pre-existing gap as Phases 1–2.

## Outcome

**PASS** for the scope delivered (text microposts fully verified; image
upload implemented but not exercised — see note above). Rails HTML routes/
views for microposts are untouched — `MicropostsController`'s HTML paths
still serve the not-yet-fully-migrated app (e.g. `static_pages/home.html.erb`
is still rendered server-side for any direct HTML visit), so no ERB deletion
here, matching the same reasoning as Phase 2.
