---
name: live-demo
description: Run the real migration pipeline live, in front of an audience, for the Relationships feature — codespec-generate, delete + feature-migrate, then parity-verify, in that order, each producing a real artifact. Ends by resetting the repo to its pristine committed state via scripts/cleanup.sh, so the same run is repeatable. Use when asked to run/demo the live conversion.
---

# live-demo

Proves the pipeline is real by actually running three of its authored
skills — `codespec-generate`, `feature-migrate`, `parity-verify` — against
one feature (`relationships`), live, in their real order, on the finished
repo itself. No second repo, no simulation: every artifact produced during
this run is the real thing, and `scripts/cleanup.sh` guarantees the repo
starts and ends in the exact same pristine, committed state.

## Prerequisites

- Rails JSON API running on `http://localhost:3001` (`bundle exec rails s -p 3001` from `rails-src/`)
- Angular dev server running on `http://localhost:4200` (`ng serve` from `angular-app/`) — hot-reloads on save/delete, which is what makes the live break/recovery visible without a restart
- A browser tab logged in on a profile page (so the Follow/Unfollow button is one click away throughout)
- `git status` clean on the repo before starting (Step 1 enforces this anyway)

## Steps

1. **Reset**: run `scripts/cleanup.sh`. It refuses (exit non-zero, prints the diff) if anything is dirty outside its known target paths — resolve that first rather than forcing past it. On success it prints a clean `git status --porcelain` for every target path.

2. **graphify — shown, not re-run.** Open `graphify-out/GRAPH_REPORT.md`, point at the stats (361 nodes · 304 edges · 105 communities · 97% EXTRACTED / 3% INFERRED / 0% AMBIGUOUS). This step already ran once against `rails-src/`; re-running it live would either no-op (nothing in `rails-src/` has changed, so `--update` hits cache) or misleadingly try to redescribe jQuery-era code that no longer exists. Say so plainly — this is the foundation the next three steps read from, not a skipped step.

3. **Live `codespec-generate` for `relationships`.** Actually invoke the skill (it reads `graphify-out/graph.json` + `GRAPH_REPORT.md` + the current `rails-src/app/controllers/relationships_controller.rb` + `rails-src/config/routes.rb`) and let it rewrite `specs/04-relationships.md` in place. **Narrate honestly**: because Rails here is already the migrated JSON version, the regenerated spec will describe *today's* reality — `/api`-scoped routes, no Open Questions left open — not the original jQuery-era analysis. That's expected, not a bug: the skill documents current source, it isn't hardcoded to this repo's own history.

4. **Live delete.** Remove the generated Angular component:
   ```bash
   rm -rf angular-app/src/app/features/relationships/follow-button
   ```
   Then remove its two usage points in
   `angular-app/src/app/features/users/profile/profile.component.ts` (the
   `FollowButtonComponent`/`FollowState` import and the
   `onFollowStateChange` method) and `.html` (the `<app-follow-button>` tag
   and its surrounding `@if` block). Refresh the browser tab — `ng serve`
   hot-reloads in about a second, showing either the button gone or a
   compile-error overlay if a reference was missed. Either is a legitimate,
   honest "it's broken" beat — don't rush past it.

5. **Live `feature-migrate` for `relationships`.** Actually invoke the
   skill against the spec `codespec-generate` just rewrote in step 3. It
   should rebuild `FollowButtonComponent` (signal-driven, optimistic update
   with rollback, no DOM string replacement) and rewire it into
   `ProfileComponent`. Narrate the tool calls as they happen — this is the
   moment the audience is there for.

6. **Live `parity-verify` for `relationships`.** Actually invoke the skill.
   It runs the `ng build` gate, drives the parity flow against the running
   app, writes `reports/parity/relationships.md`, and — on pass — flips the
   relevant fields in `state/migration-state.json` and appends a line to
   `state/run-log.ndjson`. These are real file changes with real
   timestamps; show the diff/new content briefly.

7. **Payoff.** Refresh the browser, click Follow then Unfollow for real —
   instant, no page reload, hitting the real Rails API on `:3001`.

8. **Tie back to the audit.** Open `rails-src/app/controllers/relationships_controller.rb`
   (already migrated, not touched by this run) and point at the two
   comments citing `specs/04-relationships.md` Open Questions — the
   unscoped-destroy fix and the duplicate-follow guard. These are real
   bugs the original migration found, independent of this demo run.

9. **Reset.** Run `scripts/cleanup.sh` again. Confirm it prints a clean
   `git status --porcelain` for every target path before ending the
   session — the repo must be indistinguishable from before step 1.

## Fallback

If step 5 or 6 stalls, produces an error, or the regenerated code doesn't
compile clean: run `scripts/cleanup.sh` (step 9) immediately — it's a real,
tested, instant restore to the last committed state (`git log` shows the
finished migration in commit `8042278`), not a workaround specific to this
skill.

## Output

None persisted between runs. `scripts/cleanup.sh` restores `specs/04-relationships.md`,
`angular-app/src/app/features/relationships/`,
`angular-app/src/app/features/users/profile/`, `reports/parity/relationships.md`,
`state/migration-state.json`, and `state/run-log.ndjson` to their last
committed state every time, so the same demo can be re-run deterministically.
