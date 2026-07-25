# Parity Report: static_pages (Phase 1)

**Update:** Ruby 3.1.7 + Bundler were installed this session and the live
Rails app (`bundle exec rails s -p 3001`) was brought up successfully. This
report now reflects a true live Rails-vs-Angular comparison, not the
source-derived placeholder from the first pass. Getting Rails running
required fixing five genuine environment-compatibility issues (all documented
inline in `rails-src`, none of them functional/app-logic changes):

1. `sqlite3` 1.4.2's C extension fails to compile under GCC 14 (implicit
   pointer-type mismatches are hard errors as of GCC 14) and has no
   precompiled Windows binary → bumped to `~> 1.6` (still satisfies Rails
   6.1's `~> 1.4` adapter requirement, ships a precompiled `x64-mingw-ucrt`
   binary). (`Gemfile`)
2. Rails 6.1 + Ruby 3.1 load-order bug — `ActiveSupport::LoggerThreadSafeLevel`
   references the stdlib `Logger` constant before it's guaranteed loaded →
   added `require 'logger'` in `config/boot.rb` and `bin/webpack`.
3. `bootsnap` 1.7.2's `realpath_cache` has a Windows path bug (`nil into
   String` in `dirname`) under this Ruby build → bumped to `~> 1.24`.
4. `matrix` and `rexml` are no longer default stdlib gems as of Ruby ~3.1,
   but `capybara`/`selenium-webdriver` still require them transitively →
   added both explicitly to the `:test` group.
5. Compiling webpacker assets needed Yarn (installed via `npm install -g
   yarn`) and `NODE_OPTIONS=--openssl-legacy-provider` (this old webpack
   version's MD4 hash usage is rejected by OpenSSL 3 on Node ≥17/25).

## Flows (live Rails `localhost:3001` vs. Angular `localhost:4200`)

| Flow | Rails (live) | Angular | Result |
|------|--------------|---------|--------|
| home (logged out) | title "Ruby on Rails Tutorial Sample App"; `<h1>` literally renders `translation missing: en.static_pages.home.welcome` (confirmed live — the i18n key really is broken, exactly as predicted from source) | title matches; renders "Welcome to the Sample App" (Open Question 1 decision: reproduce intended copy, not the broken string) | **PASS** (intentional, documented divergence) |
| help | title "Help \| Ruby on Rails Tutorial Sample App"; "Get help on the Ruby on Rails Tutorial..." | identical | **PASS** (exact match) |
| about | title "About \| Ruby on Rails Tutorial Sample App"; "...Learn Enough family of tutorials..." | identical | **PASS** (exact match) |
| contact | title "Contact \| Ruby on Rails Tutorial Sample App"; "Contact the Ruby on Rails Tutorial..." | identical | **PASS** (exact match) |

## Structural checks

- Header/footer nav, Rails logo asset, no console errors — all confirmed in the first pass and unchanged.

## Build/test gates

- `ng build`: **clean** (unchanged from first pass).
- `ng test`: still not run — no Angular unit tests were generated for this smoke-test pass; recommend adding them before Phase 2 lands more surface area.
- **Minitest: RUN**, before and after ERB deletion (see below). Full suite: **63 runs, 339 assertions, 0 failures, 0 errors.**

## ERB cleanup (per `parity-verify`'s "delete on full pass" rule)

Checked cross-references (`grep`) before deleting anything:
- `help.html.erb`, `about.html.erb`, `contact.html.erb` — referenced only by their own controller actions, no other feature touches them. **Deleted.**
- `home.html.erb` — **kept**. `app/controllers/microposts_controller.rb:13` renders it directly as an error fallback (`MicropostsController#create`, Phase 3 — not yet migrated), and `test/integration/site_layout_test.rb` asserts on it. Deleting it now would break a not-yet-migrated feature. Revisit once Phase 3 lands.
- Updated `test/controllers/static_pages_controller_test.rb`: removed the 3 test methods for the deleted views (their `assert_response :success` would now fail against a missing template — expected, not a regression), kept `should get home`, documented why inline.
- Re-ran the full suite after deletion: still **0 failures**.

## Outcome

**Full PASS.** Live Rails-vs-Angular comparison confirms content parity on
all four routes (with one intentional, spec-documented divergence on the
broken i18n string), zero console errors, clean Angular build. `rails_status`
for `static_pages` is now genuinely `json_only`-equivalent for 3 of 4 routes
(help/about/contact — Rails no longer renders them, ERB deleted) and stays
`dual` for `home` (Rails still renders it, kept alive for Microposts'
cross-feature dependency until Phase 3).
