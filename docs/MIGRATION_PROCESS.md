# Rails → Angular Migration: Process & Outcome

## 1. Problem

`rails-src/` began as an unmodified clone of
[JetBrains/sample_rails_app](https://github.com/JetBrains/sample_rails_app)
— Michael Hartl's Rails Tutorial sample app, Rails 6.1.4.6 — a classic
server-rendered monolith: ERB views, jquery-ujs `.js.erb` AJAX partial-swaps,
webpacker/turbolinks, bootstrap-sass. The goal was to migrate its **frontend**
to a standalone Angular SPA while keeping Rails alive underneath, thinned to
a pure JSON API, with the whole effort driven by reusable Claude Code Skills
rather than a one-off script — so the same pipeline could, in principle, run
against a different Rails app.

## 2. Architecture decisions (locked early, inherited by every phase)

| Decision | Choice | Rationale |
|---|---|---|
| Backend fate | Rails stays alive as a JSON API | No rewrite risk on the data/business-logic layer |
| Angular style | Latest, standalone components, signals, no NgModules | Matches current Angular idioms |
| Auth transport | **Cookie + CSRF** (not JWT) | Decided explicitly in Phase 2 (see §4); final for the whole migration per the root `CLAUDE.md` hard rule |
| Migration unit | One feature = one Rails resource/controller | Matches the app's own controller boundaries, keeps each `feature-migrate` run reviewable |
| Repo layout | One repo, sibling subfolders (`rails-src/`, `angular-app/`, `specs/`, `state/`, `reports/`) | Single source of truth for spec, code, and verification state |
| Destroy/following/followers (never migrated) | **Dropped entirely** in Phase 7 cutover | User decision — no Angular consumer ever existed, no Rails-only HTML fallback kept |

## 3. The five-stage pipeline

Each feature moved through the same five stages, in order, gated by an
explicit human checkpoint before code was written:

1. **graphify** (real third-party tool, not hand-rolled) — Tree-sitter AST
   parsing of the whole Rails source plus an LLM semantic pass, merged into
   a NetworkX knowledge graph with Leiden community detection. Output:
   `graphify-out/graph.json`, `graph.html`, `GRAPH_REPORT.md`. Every edge is
   labeled `EXTRACTED`, `INFERRED`, or `AMBIGUOUS` so nothing is asserted
   without a traceable source. Run once against the full `rails-src/`:
   **361 nodes, 304 edges, 105 communities, 97% EXTRACTED / 3% INFERRED / 0%
   AMBIGUOUS**. `SessionsHelper`/`User` surfaced as the highest-degree
   "god nodes," matching the real dependency shape (nearly every controller
   reads `current_user`/`logged_in?`).
2. **codespec-generate** (authored skill) — reads the graph plus direct
   source, writes one `specs/<NN>-<feature>.md` per feature: routes,
   controller actions, data shape, view→component decomposition, forms/
   validation mapping, JS/AJAX→Angular-reactivity translation, styling,
   dependencies, and an **Open Questions** section that is never silently
   resolved.
3. **Human checkpoint** — every Open Question (auth transport, destroy/
   following/followers fate, authorization gaps found while reading the
   spec'd code) stopped the pipeline until the user answered it explicitly.
4. **feature-migrate** (authored skill) — approved spec → Angular feature
   code + thinned Rails controller (JSON-only) for that one feature.
   Updates `state/migration-state.json` + `state/run-log.ndjson`.
5. **parity-verify** (authored skill) — drives the pre-migration "golden"
   flow and the post-migration Angular+JSON flow, diffs them, gates on
   `ng build` / Minitest, writes `reports/parity/<feature>.md`. Only after
   a recorded pass did old ERB views for that feature get deleted.

## 4. Phase order and what actually happened

Phase order was derived from real dependencies in the graph (not guessed):
`SessionsHelper#current_user`/`logged_in?` is read by nearly every
controller and the shared header partial, and Users+Sessions are circularly
coupled (signup creates the row login authenticates against) — so they were
migrated together, not sequentially.

- **Phase 0 — Bootstrap.** `graphify` run, `angular-scaffold` run once
  (standalone workspace, stubbed `AuthService`, shell components).
- **Phase 1 — Static Pages + Shell.** Zero `before_action`s, lowest risk;
  validated the whole pipeline end-to-end (real header/footer/flash) before
  auth existed.
- **Phase 2 — Users + Sessions (combined).** The auth-transport decision was
  made here: **cookie + CSRF**, over JWT — the user's call, inherited by
  every later phase. Real `AuthService`, route guards, signup/login/logout/
  show/edit/index built. Two real bugs found and fixed: an app-initializer
  `Promise.all` race (two concurrent boot requests could mint mismatched
  CSRF/session state — fixed by sequencing the awaits) and Rails'
  `forgery_protection_origin_check` rejecting legitimate cross-port dev
  traffic (Angular `:4200` calling Rails `:3001`) — fixed by disabling that
  secondary origin check while keeping the actual CSRF token check fully
  enforced.
- **Phase 3 — Microposts.** Depends on `current_user`. Create/delete/feed
  with image upload support (upload path implemented, not exercised live —
  documented gap).
- **Phase 4 — Relationships.** Depends on Users#show + `current_user`. The
  jquery-ujs `.js.erb` AJAX partial-swap pattern became a signal-driven
  `FollowButtonComponent` — no DOM string-replacement, no page reload. Two
  real spec-flagged issues fixed here rather than carried forward: the
  original `destroy` action did an **unscoped** `Relationship.find` (any
  logged-in user could unfollow on anyone else's behalf) — rescoped to
  `current_user.active_relationships`; and there was no duplicate-follow
  guard — made idempotent.
- **Phase 5 — Password Resets.** Depends on Sessions. Found the
  `get_user`/`valid_user`/`check_expiration` filters were HTML-redirect-only
  — a JSON caller hitting an expired/invalid token got a redirect instead of
  a proper status code. Made format-aware (404/410 JSON).
- **Phase 6 — Account Activations.** Depends on Sessions + `UserMailer`.
  Simplest feature — single action, no forms, view-less by design (matches
  the original Rails design, not a simplification we introduced).
- **Phase 7 — Cutover/Hardening.** `routes.rb` rewritten to a pure `/api`
  scope; all 7 controllers reduced to JSON-only; `destroy`/`following`/
  `followers` dropped (never migrated, no consumer, user decision); ERB
  views deleted except mailer templates. The Minitest suite was rewritten
  for JSON-only reality: 9 dead HTML/Capybara integration tests deleted, 5
  controller test files rewritten to assert JSON status codes instead of
  redirects/templates. This surfaced one more real gap: `ActiveRecord::
  RecordNotFound` had no rescue anywhere in the app — in production it
  would have fallen through to Rails' default **HTML** error page despite
  the API being JSON-only. Fixed with a `rescue_from` returning JSON 404.
  Then `turbolinks`/`webpacker` and their config/bin/JS/CSS remnants were
  removed, and `rack-cors` + a production CORS initializer were added
  (`credentials: true`, required by the cookie+CSRF transport). Verified
  with a full whole-journey browser regression: signup → real-token
  activation → auto-login → post → follow → edit profile → real-token
  password reset → auto-login → logout, no console errors at any step.
  Minitest: 52 runs, 135 assertions, 0 failures, 0 errors.
- **Phase 8 — Documentation + Presentation.** This document, plus a Gamma
  deck generated from it.

## 5. Real bugs and gaps found (not just refactoring)

| # | Phase | Issue | Fix |
|---|---|---|---|
| 1 | 2 | App-initializer race: concurrent CSRF-refresh + auth-fetch could mint mismatched session/token state | Sequenced the two awaits |
| 2 | 2 | `forgery_protection_origin_check` rejected legitimate cross-port dev requests | Disabled that check only; real CSRF-token verification stayed on |
| 3 | 4 | `RelationshipsController#destroy` had no ownership check — any user's relationship id could be deleted by anyone logged in | Scoped to `current_user.active_relationships` |
| 4 | 4 | No duplicate-follow guard — a double-click could hit the DB's unique index and 500 | Made `follow` idempotent |
| 5 | 5 | Password-reset filters were HTML-redirect-only for JSON callers | Made format-aware (proper 404/410 JSON) |
| 6 | 7 | `logged_in_user` filter always redirected, even for JSON callers (gap since Phase 2) | Made format-aware (401 JSON) |
| 7 | 7 | No global rescue for `ActiveRecord::RecordNotFound` — would serve Rails' default HTML error page from a JSON-only API in production | Added `rescue_from` → JSON 404 |

## 6. Before / after

**Before:** one Rails app, ERB + jquery-ujs + webpacker/turbolinks,
server-rendered HTML for every route, ActiveRecord models directly backing
views.

**After:** `rails-src/` is a pure `/api`-scoped JSON backend (cookie+CSRF
session auth, CORS-enabled for a separate-origin production Angular
deployment); `angular-app/` is a standalone-component, signal-driven SPA
covering all 7 original features (minus `destroy`/`following`/`followers`,
dropped by user decision as never-migrated dead surface). Every feature has
a recorded golden-vs-parity verification pass in `reports/parity/`.

## 7. What's not done / open follow-ups

- Micropost image upload is implemented but was never exercised against a
  real file in the browser (documented in `reports/parity/microposts.md`).
- `FollowListComponent` (following/followers listing pages) was never built
  — consistent with dropping those actions in Phase 7, but worth naming
  explicitly as scope that was cut, not forgotten.
- Production deployment (single vs. separate origin, `ANGULAR_ORIGIN` env
  wiring, real TLS/CORS validation against a deployed Angular build) has not
  been exercised — only local dev-proxy and same-machine dual-port setups
  have been verified.
