# CLAUDE.md — Rails → Angular Migration Orchestrator

This repo migrates the **frontend** of `rails-src/` (a clone of
[JetBrains/sample_rails_app](https://github.com/JetBrains/sample_rails_app),
Michael Hartl's Rails Tutorial sample app) to a standalone Angular SPA
(`angular-app/`), while `rails-src/` stays alive as a thinned JSON API.

Full architecture/rationale: see the plan this repo was built from (ask the
user if they still have it, or re-derive from `graphify-out/GRAPH_REPORT.md` +
the specs below — this file only covers *how a session should operate*, not
*why* each decision was made).

## Directory map

- `rails-src/` — the Rails app. Thinned in place, feature by feature. Do not delete ERB views until `parity_status: "pass"` for that feature.
- `graphify-out/` — output of the `graphify` skill run against `rails-src/`: `graph.json`, `graph.html`, `GRAPH_REPORT.md`. Re-run `graphify` (`--update`) if `rails-src/` changes structurally.
- `specs/` — one file per feature, `<NN>-<feature>.md`, written by the `codespec-generate` skill.
- `angular-app/` — the Angular CLI workspace (standalone components, signals, strict TS). Shell (`HeaderComponent`/`FooterComponent`/`AuthService` stub) exists from Phase 0; feature folders under `src/app/features/` are added one at a time by `feature-migrate`.
- `state/migration-state.json` — single source of truth for what phase/feature is done, in progress, or not started. **Read this first, every session.**
- `state/run-log.ndjson` — append-only audit trail, one JSON line per skill invocation.
- `reports/golden/` and `reports/parity/` — pre/post migration verification artifacts from `parity-verify`.
- `docs/MIGRATION_PROCESS.md` — written once, at the end (Phase 8), summarizing the whole effort for the Gamma presentation.

## What to do at the start of every session

1. Read `state/migration-state.json`.
2. Find the first feature/phase not yet at `parity_status: "pass"` (or, for Phase 0, not yet bootstrapped).
3. Resume that feature's remaining steps, in order: `codespec-generate` (if no spec yet) → **stop and ask the user to resolve section 9 (Open Questions)** if any are unresolved → `feature-migrate` → `parity-verify`.
4. Update `state/migration-state.json` + append to `state/run-log.ndjson` after every step, not just at the end.
5. **Stop and report after each feature completes parity-verify — do not automatically cascade into the next feature.** Each phase boundary is a deliberate checkpoint, not a formality (Phase 2 in particular carries a real decision: cookie+CSRF vs. JWT auth transport, which every later phase inherits).

## Phase order (fixed — do not resequence without re-checking the graph)

0. **Bootstrap** — `graphify` run + `angular-scaffold` run. (Done — see `graphify-out/` and `angular-app/`.)
1. **Static Pages + Shell** — lowest risk, zero `before_action`s, validates the whole pipeline before auth exists.
2. **Users + Sessions/Auth** (combined, not sequential — they're circularly coupled: signup creates the row login authenticates against). **Auth-transport decision happens here** and is inherited by every later phase.
3. **Microposts** — depends on `current_user` (Phase 2).
4. **Relationships** — depends on Users#show (Phase 2) + `current_user`; the jquery-ujs `.js.erb` AJAX pattern gets translated to Angular signals here.
5. **Password Resets** — depends on Sessions (Phase 2).
6. **Account Activations** — depends on Sessions (Phase 2) + UserMailer; simplest, migrated last.
7. **Cutover/Hardening** — strip any remaining HTML from `rails-src/`, remove turbolinks/webpacker/ERB entirely, final whole-journey Playwright regression, production CORS/CSRF config.
8. **Documentation + Presentation** — write `docs/MIGRATION_PROCESS.md`, then generate a Gamma presentation from it (`mcp__ca18dc55…__generate`).

## Skills available in this repo

- `graphify` (installed globally, not authored here) — scan/graph `rails-src/`.
- `codespec-generate` — write one feature's spec from the graph + source.
- `angular-scaffold` — one-time Angular workspace setup (already run).
- `feature-migrate` — implement one feature (Angular + thinned Rails) from an approved spec.
- `parity-verify` — golden-vs-migrated comparison; gates ERB deletion.

## Hard rules

- Never silently resolve an "Open Questions" item from a spec — ask the user.
- Never delete a feature's ERB views before `parity-verify` records a pass for that feature.
- Never batch multiple features through `feature-migrate` in one invocation.
- The auth-transport decision (cookie+CSRF vs. JWT), once made in Phase 2, is final for the rest of the migration — do not revisit it per feature.
