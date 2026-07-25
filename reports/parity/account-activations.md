# Parity Report: account_activations (Phase 6)

**Scope delivered**: the entire feature — a single action, no forms, no
persistent view (matching Rails' own view-less, redirect-only design). Own
routed `AccountActivationComponent` (not folded into password-resets'
similarly-shaped `edit` logic — the spec flagged this as a design choice,
not dictated; kept separate since the two token types have different
semantics and premature sharing wasn't worth it for ~30 lines of code).

## Open questions resolved

- **Auth transport**: cookie+CSRF, consistent with Sessions/PasswordResets —
  success calls `AuthService.setCurrentUser()`, same mechanism as the
  password-reset auto-login.
- **No "resend activation email"**: intentionally not added — preserves
  current (tutorial-grade) behavior, matches the spec's "no change" option.
- **Response contract**: `{activated: boolean, user?: User, error?: string}`,
  inferred from the two redirect branches since no serializer/view existed
  to copy from.
- **Route/component design**: own component, per above.

## Flows (live, real tokens extracted from the dev-mode mail log)

| Flow | Result |
|------|--------|
| Invalid token → 404, `{activated:false, error:"Invalid activation link"}` | **PASS** |
| Real token (fresh signup) → 200, `activated:true`, user returned | **PASS** |
| Same token reused after activation → 404 (already activated, correctly rejected) | **PASS** |
| Login works immediately after activation | **PASS** |
| Browser: full signup → activate → auto-login flow — header updates instantly, auto-navigates to profile | **PASS** |

No console errors observed.

## Build/test gates

- `ng build`: clean.
- Rails Minitest (full suite): **63 runs, 339 assertions, 0 failures, 0 errors.**
- `ng test`: still not run — same pre-existing gap as all prior phases.

## Outcome

**PASS.** This closes out all 7 spec'd features (static_pages, users,
sessions, microposts, relationships, password_resets, account_activations).
Remaining work per the phase plan: Phase 7 (Cutover/Hardening — strip
remaining HTML, remove turbolinks/webpacker, final whole-journey regression)
and Phase 8 (docs + presentation).
