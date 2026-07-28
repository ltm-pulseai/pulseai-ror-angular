# Rails → Angular: Agentic Migration Pipeline

A Ruby on Rails app (Michael Hartl's [Rails Tutorial sample
app](https://github.com/JetBrains/sample_rails_app), server-rendered ERB +
jQuery) migrated to a standalone Angular SPA, with Rails thinned to a pure
JSON API underneath — the whole migration driven by reusable Claude Code
Skills, not a one-off script.

**Status: migration complete.** All 7 features pass parity, Rails is a pure
`/api` JSON backend, Angular is standalone-components + signals throughout.
See [`docs/MIGRATION_PROCESS.md`](docs/MIGRATION_PROCESS.md) for the full
narrative — problem, architecture decisions, the 5-stage pipeline,
phase-by-phase walkthrough, and the 7 real bugs found and fixed along the
way (not just ported).

## Quick links

- **Process write-up**: [`docs/MIGRATION_PROCESS.md`](docs/MIGRATION_PROCESS.md)
- **Live-demo deck** (click-through, before/after code transformation):
  https://claude.ai/code/artifact/77f2da1b-baca-4fd8-a70f-9543a4c1e13a
- **Gamma presentation** (generated from the process write-up):
  https://gamma.app/generations/BnStvpGrGEUdnvCmXj3ZB
- **Knowledge graph** (interactive, `graphify` output): `graphify-out/graph.html`

## Repo layout

```
rails-src/          Rails app — pure /api JSON backend (cookie+CSRF auth)
angular-app/         Angular SPA — standalone components, signals
graphify-out/        Knowledge graph of rails-src/ (graph.json, graph.html, GRAPH_REPORT.md)
specs/               One migration spec per feature (specs/<NN>-<feature>.md)
state/               migration-state.json (status) + run-log.ndjson (audit trail)
reports/
  golden/            Pre-migration captured flows, one per feature
  parity/            Post-migration verification reports, one per feature
docs/
  MIGRATION_PROCESS.md   The full write-up (feeds the Gamma deck)
.claude/skills/      The authored Skills that ran this migration (see below)
CLAUDE.md            Orchestrator instructions for resuming/extending the migration
```

## Running it locally

Requires Ruby 3.1.x (this repo was built against Ruby 3.1.7 + DevKit via
RubyInstaller on Windows), Node 20+, and Yarn.

**Rails API** (port 3001):
```bash
cd rails-src
bundle install
bundle exec rails db:prepare
bundle exec rails s -p 3001
```
Windows/Ruby-3.1 note: `rails-src/.bundle/config` already sets
`BUNDLE_WITHOUT=production` (the `pg` gem needs PostgreSQL headers this repo
doesn't have installed) and a `sqlite3` build flag pointing at the
RubyInstaller MSYS2 toolchain — `bundle install` should just work without
extra flags.

**Angular app** (port 4200, proxies `/api` to Rails on 3001):
```bash
cd angular-app
npm install
ng serve
```
Then open `http://localhost:4200`.

## The migration pipeline

Five stages, run once per feature, gated by a human checkpoint before any
code was written:

```
graphify → codespec-generate → [human checkpoint] → feature-migrate → parity-verify
```

1. **`graphify`** (installed, third-party) — Tree-sitter + LLM knowledge
   graph of the whole Rails app. Run once: 361 nodes, 304 edges, 105
   communities, 97% EXTRACTED / 3% INFERRED / 0% AMBIGUOUS. Output in
   `graphify-out/`.
2. **`codespec-generate`** (`.claude/skills/codespec-generate/`) — reads the
   graph + source, writes one `specs/<NN>-<feature>.md` per feature: routes,
   controller actions, data shape, view→component decomposition, an **Open
   Questions** section that's never silently resolved.
3. **Human checkpoint** — every Open Question stopped the pipeline until
   answered explicitly (auth transport, authorization gaps, scope
   decisions).
4. **`feature-migrate`** (`.claude/skills/feature-migrate/`) — approved spec
   → Angular feature code + thinned Rails JSON controller for that one
   feature.
5. **`parity-verify`** (`.claude/skills/parity-verify/`) — golden (pre-migration)
   vs. Angular+JSON parity diff, `ng build`/Minitest gates, writes
   `reports/parity/<feature>.md`. Only a recorded pass gates deleting the
   old ERB view.

## Migration status

| Feature | Phase | Status |
|---|---|---|
| Static Pages | 1 | ✅ pass |
| Users | 2 | ✅ pass |
| Sessions | 2 | ✅ pass |
| Microposts | 3 | ✅ pass |
| Relationships | 4 | ✅ pass |
| Password Resets | 5 | ✅ pass |
| Account Activations | 6 | ✅ pass |
| Cutover (JSON-only, webpacker/turbolinks removed, CORS) | 7 | ✅ pass |
| Docs + presentation | 8 | ✅ done |

`destroy`/`following`/`followers` were dropped entirely in the Phase 7
cutover — a deliberate human decision (no Angular consumer was ever built
for them), not silent scope creep. Full detail in `state/migration-state.json`.

Final test suite: **52 runs, 135 assertions, 0 failures, 0 errors**
(`bundle exec rails test` from `rails-src/`).

## Real bugs found (not just refactoring)

Seven, catalogued in full in
[`docs/MIGRATION_PROCESS.md` §5](docs/MIGRATION_PROCESS.md#5-real-bugs-and-gaps-found-not-just-refactoring):
an app-initializer race condition, a CSRF origin-check incompatibility, an
unscoped `destroy` authorization gap, a missing duplicate-follow guard,
format-unaware auth/password-reset filters, and an unrescued
`ActiveRecord::RecordNotFound` that would've served Rails' default HTML
error page from a JSON-only API. Every one was found *while migrating*, not
added for a demo.

## Running the live pipeline demo

`.claude/skills/live-demo/` runs three of the real skills above
(`codespec-generate` → `feature-migrate` → `parity-verify`) live, in order,
against the Relationships feature — deletes the generated
`FollowButtonComponent`, watches the running app break, regenerates it from
the spec, and verifies Follow/Unfollow works for real against the running
Rails API. `scripts/cleanup.sh` resets the repo to its committed state
before and after every run, so it's fully repeatable. See
`.claude/skills/live-demo/SKILL.md` for the full script.

## Skills authored for this migration

- `codespec-generate` — writes one feature spec from the graph + source.
- `angular-scaffold` — one-time Angular workspace bootstrap (already run).
- `feature-migrate` — implements one feature end to end from an approved spec.
- `parity-verify` — golden-vs-migrated comparison; gates ERB deletion.
- `live-demo` — orchestrated live re-run of the pipeline for presentations.

`graphify` itself is an installed third-party tool, not authored here.
