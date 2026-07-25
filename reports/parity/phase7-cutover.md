# Phase 7 — Cutover/Hardening: Parity Report

## Scope

Strip remaining HTML/asset-pipeline machinery from `rails-src`, update the
Minitest suite for JSON-only reality, and run a full whole-journey regression
against the fully-cutover stack. Gates deletion of the last HTML remnants and
closes out Phase 7 (Phase 8 — docs + presentation — remains).

## Changes made

1. **Routes/controllers** (prior sessions, already `pass` before this report):
   `routes.rb` rewritten to a pure `/api` scope; all 7 controllers simplified
   to JSON-only. `destroy`/`following`/`followers` dropped entirely (never
   migrated to Angular, no consumer, user decision).
2. **Test suite**: deleted 9 HTML/Capybara integration tests that exercised
   removed views/routes (`following`, `microposts_interface`,
   `password_resets`, `site_layout`, `users_edit`, `users_index`,
   `users_login`, `users_profile`, `users_signup`). Rewrote 5 controller test
   files (`users`, `microposts`, `relationships`, `sessions`, `static_pages`)
   to assert JSON status codes/bodies instead of HTML redirects/templates.
   `account_activations_controller_test.rb` needed no change (already an
   empty placeholder). Model/mailer/helper/channel tests untouched.
3. **Real bug found+fixed**: `ActiveRecord::RecordNotFound` had no rescue
   anywhere in the app — in production this would fall through to Rails'
   default HTML error page even though the API is JSON-only. Added
   `rescue_from ActiveRecord::RecordNotFound` in `application_controller.rb`
   rendering a JSON 404. This also fixed a genuine test gap
   (`RelationshipsControllerTest#test_destroy_should_not_affect_another_user's_relationship`
   expected a 404 but got an uncaught exception before the fix).
4. **Dead dependency removal**: `turbolinks`/`webpacker` gems removed from
   `Gemfile`; `app/javascript/`, `config/webpacker.yml`, `bin/webpack`,
   `bin/webpack-dev-server` deleted; dead per-feature `app/assets/stylesheets/*.scss`
   deleted (no surviving ERB view references them — mailer views have no
   `stylesheet_link_tag`); root `package.json`/`yarn.lock` deleted (superseded
   by `angular-app/package.json`, nothing in Rails needs them once webpacker
   is gone). `Procfile`'s `webpacker:` process line removed.
5. **Production CORS**: added `rack-cors` gem + `config/initializers/cors.rb`,
   scoped to `/api/*`, `credentials: true` (required by the cookie+CSRF
   transport), origin read from `ANGULAR_ORIGIN` env var (defaults to
   `http://localhost:4200` for dev parity).

## Verification

**Automated**: `bundle exec rails test` — 52 runs, 135 assertions, 0 failures,
0 errors (was 63 runs / 8 failures / 22 errors before this task's fixes).

**Live regression** (Rails :3001 + Angular :4200, both restarted clean after
the Gemfile/config changes, confirmed no stale process was masking a boot
failure): full whole-journey flow run in-browser end to end —

1. Sign up new user (`phase7-regression@example.com`) → "Please check your
   email" message shown.
2. Real activation token extracted from `log/development.log` → navigated
   to `/account_activations/:token/edit?email=...` → auto-activated,
   auto-logged-in, redirected to own profile.
3. Posted a micropost → appeared instantly in feed.
4. Followed an existing user (id 1) → button flipped to "Unfollow", counts
   updated live.
5. Edited profile (name change) → "Profile updated" confirmation shown.
6. Logged out → home reverted to logged-out marketing copy.
7. Requested password reset → real reset token extracted from
   `log/development.log` → navigated to `/password_resets/:token/edit` →
   submitted new password → auto-logged-in, redirected to own (updated)
   profile showing the earlier micropost.
8. Logged out again → confirmed logged-out state.

No console errors at any step (`read_console_messages` checked after every
mutating action).

## Outcome

**Pass.** All 7 features remain green after the JSON-only cutover; the test
suite reflects the JSON-only API surface; dead webpacker/turbolinks
machinery is gone; production CORS is in place for the cookie+CSRF
transport. Phase 7 is complete. Phase 8 (docs + Gamma presentation) remains.
