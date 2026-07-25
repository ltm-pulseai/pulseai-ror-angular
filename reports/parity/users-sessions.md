# Parity Report: users + sessions (Phase 2)

**Scope delivered**: signup, login (with activation gate), logout, `current_user`
resolution on app init, profile view, users list, edit profile. **Deliberately
deferred** (not built this pass): `destroy` (admin delete), `following`/
`followers`, pagination controls, remember-me cookie behavior beyond passing
`remember_me` through, and the micropost feed on the profile page (Phase 3).

## Auth transport

Cookie + CSRF (user decision, `specs/02-sessions.md` §9). Implementation:
`GET /api/csrf_token`, `HttpInterceptor` attaches `X-CSRF-Token` on mutating
requests + `withCredentials: true`, `provideAppInitializer` resolves the CSRF
token and `current_user` **sequentially** before the app renders.

## Bugs found and fixed during verification (all real, all reproduced live)

1. **`Promise.all` race in the app initializer.** Firing `csrf.refresh()` and
   `auth.fetchMe()` concurrently risked two different Rails sessions being
   minted (each request that arrives without an existing cookie can mint its
   own), leaving the cached CSRF token scoped to a session a second
   concurrent `Set-Cookie` then overwrote. Fixed: sequential `await`s in
   `app.config.ts`.
2. **`ActionController::InvalidAuthenticityToken` on every real browser
   login**, reproduced identically via curl by adding an `Origin` header.
   Root cause: Rails' `forgery_protection_origin_check` (on by default since
   `config.load_defaults 5.0`+) compares the request's `Origin` header
   against Rails' own host:port. Since Angular runs on `:4200` and Rails on
   `:3001` in this dev setup, every legitimate cross-port API call looked
   like a forged cross-site request. Fixed: `config.action_controller.
   forgery_protection_origin_check = false` in `config/application.rb`,
   documented inline — the actual CSRF token check stays fully enforced,
   only the secondary Origin==Host equality check is relaxed. `changeOrigin`
   in `proxy.conf.json` was also flipped `true → false` while diagnosing
   this (keeps the Host header as `:4200` end-to-end) — not itself
   sufficient to fix the bug, but correct either way.
3. **Both `ng serve` and `bundle exec rails s` restarts silently no-op'd**
   earlier in this session: `pkill -f "..."` doesn't work in this Windows
   Git-Bash environment, so "restarted" servers kept running their old,
   pre-fix code while a fresh process failed to bind the already-held port
   (with no visible error in the captured log). Diagnosed via `Get-Process`/
   `Get-NetTCPConnection` in PowerShell, fixed by `Stop-Process -Id <pid>
   -Force`. Worth remembering for any future restart on this machine —
   `pkill`/`pgrep` are not reliable here.

## Flows (live)

| Flow | Result |
|------|--------|
| Signup → 201, correct message | **PASS** |
| Login before activation → 403, correct message | **PASS** |
| Login after activation → 200, correct user body | **PASS** |
| `/api/me` reflects session | **PASS** |
| Logout → 204, `/api/me` → `null` after | **PASS** |
| Browser: login → home, header shows logged-in nav (Users/Account/Profile/Settings/Log out) | **PASS** |
| Browser: `/users` redirects to `/login` when logged out (authGuard) | **PASS** |
| Browser: profile page renders name/gravatar/counts | **PASS** |
| Browser: edit profile pre-fills, PATCH succeeds, shows "Profile updated" | **PASS** |
| Browser: logout reverts header to logged-out nav | **PASS** |

No console errors observed in any of the above.

## Build/test gates

- `ng build`: clean.
- Rails Minitest (full suite, not just this feature — HTML routes are shared infrastructure): **63 runs, 339 assertions, 0 failures, 0 errors.** No regressions from the additive `/api` routes/controller branches.
- `ng test`: not run — no Angular unit tests exist yet for any feature (same gap noted in the Phase 1 report).

## Outcome

**PASS** for the scope delivered. HTML routes/views for users/sessions are
**untouched** (not deleted) — unlike Phase 1's static pages, this feature's
Rails HTML paths still serve real, non-superseded functionality (destroy,
following/followers, password reset flows depend on the session/user
plumbing here) and deletion isn't warranted until those dependent phases
land. `rails_status` stays `dual`.
