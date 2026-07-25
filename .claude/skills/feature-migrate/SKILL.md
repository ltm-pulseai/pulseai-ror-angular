---
name: feature-migrate
description: Implement one Rails-to-Angular feature end-to-end from an approved spec — Angular components/services/routes plus the thinned (JSON-only) Rails controller for that one feature. Use only after the feature's spec has its Open Questions resolved by the user.
---

# feature-migrate

Turns one approved `specs/<NN>-<feature>.md` into working code, on both sides
of the fence: new Angular feature code, and a thinned Rails controller that
now responds with JSON instead of rendering ERB. One feature per invocation.

## Precondition — do not skip this

Read the spec's **section 9 (Open Questions)**. If anything there is still
open (not annotated with a decision by the user), **stop and ask** rather than
picking a default yourself — this is the whole reason specs carry that
section. This applies in particular to the auth-transport question first
raised in `specs/02-sessions.md` — every later spec that calls `log_in`
inherits whatever was decided there; do not re-decide it per feature.

## Steps

1. **Re-read the spec** (`specs/<NN>-<feature>.md`) fully, plus the real Rails source files it names — the spec is the contract, but exact syntax (validation messages, param names) should be confirmed against source at generation time, not re-derived here.

2. **Angular side** — create `angular-app/src/app/features/<feature>/`:
   - One component per row in the spec's section 4 (View → Component Decomposition table): page components get a route in `angular-app/src/app/app.routes.ts` (lazy-loaded via `loadComponent`), shared/presentational components do not.
   - One service (`<feature>.service.ts`) wrapping `HttpClient` calls to `${environment.apiBaseUrl}/...`, typed against the spec's section 3 (Data Shape).
   - Reactive forms per the spec's section 5 (Forms & Validations table) — mirror each Rails validation with an Angular validator, and surface server-side field errors (422 response body) back onto the matching form control.
   - Any `.js.erb`/AJAX behavior from section 6 becomes a signal-driven update in the relevant component/service — no DOM string replacement, no jQuery.
   - Route guards for any `before_action` filter noted in section 2 (e.g. `logged_in_user`, `correct_user`, `admin_user`) — implemented against `AuthService`, which by this point may still be the Phase-0 stub (features migrated before Phase 2) or the real implementation (Phase 2 onward).

3. **Rails side** — thin the controller named in the spec:
   - Add/confirm `respond_to :json` for the actions this feature covers.
   - Add a `.json.jbuilder` view (jbuilder is already in the Gemfile) or an explicit `render json:` payload matching the spec's section 3 exactly — field names must match what the Angular service expects.
   - **Do not delete the existing ERB views yet.** Keep both HTML and JSON responses working side by side until `parity-verify` passes — this is what makes rollback cheap. Deleting views is `parity-verify`'s job to trigger, not this skill's.

4. **Update state** — in `state/migration-state.json`, set this feature's `angular_status: "implemented"` and `rails_status: "dual"` (both HTML and JSON still respond). Append one line to `state/run-log.ndjson`: `{"ts": "<ISO8601>", "skill": "feature-migrate", "feature": "<feature>", "outcome": "implemented"}`.

5. **Do not** run `parity-verify` yourself as part of this skill — that's a separate step the orchestrator calls next. Report what you built and stop.

## Output

New files under `angular-app/src/app/features/<feature>/`, a modified (not yet stripped) Rails controller + new jbuilder view(s), and updated `state/migration-state.json` + `state/run-log.ndjson`.
