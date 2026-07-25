---
name: parity-verify
description: Confirm a migrated feature behaves the same as before — golden HTML capture vs. Angular+JSON parity run, plus ng build/test and RSpec gates. Only after this passes does a feature's old ERB views get deleted. Use after feature-migrate for a given feature.
---

# parity-verify

The gate between "Angular code exists" and "the old Rails views can be
deleted." Pragmatic for a solo local workflow — no CI, just golden capture,
a parity re-run, and build/test gates, all local.

## Prerequisites

- Rails app running on `http://localhost:3001` (`bundle exec rails s -p 3001` from `rails-src/`)
- Angular app running on `http://localhost:4200` (`ng serve` from `angular-app/`, proxying `/api` to :3001 per `proxy.conf.json`)
- Playwright MCP tools (already connected — `mcp__plugin_everything-claude-code_playwright__*`)

## Steps

1. **Golden capture (only if `reports/golden/<feature>.json` doesn't exist yet)** — before `feature-migrate` strips a controller's HTML rendering, drive the feature's key flows from the spec's section 1 (Routes table) against the still-full-HTML Rails app (`localhost:3001`, no `/api` prefix, real ERB pages) via Playwright. Capture per flow: rendered text assertions, HTTP status, redirect target, flash message. Write to `reports/golden/<feature>.json`:
   ```json
   {
     "feature": "sessions",
     "captured_at": "2026-07-24T00:00:00Z",
     "flows": [
       {
         "name": "successful login",
         "steps": ["visit /login", "fill session[email]", "fill session[password]", "submit"],
         "expect": { "status": 200, "redirect_to": "/", "flash": null, "text_contains": ["Welcome"] }
       }
     ]
   }
   ```
   If this file already exists, skip capture — golden is captured once, before the feature is touched, never overwritten.

2. **Post-migration parity run** — drive the same flows against Angular (`localhost:4200`) + Rails JSON API (`localhost:3001/api/...` via the proxy). For each golden flow, assert: equivalent rendered text (not byte-identical — Angular's DOM differs, compare meaningful content), correct client-side route after the action, correct HTTP status from the JSON API response, no unexpected browser console errors (check via the Playwright MCP's console-message tool).

3. **Build/test gates**:
   - `ng build` (from `angular-app/`) must be clean — no TS errors.
   - Any component unit tests generated alongside the feature must pass (`ng test`).
   - Run the existing RSpec suite filtered to this feature's controller (`bundle exec rspec spec/requests/<feature>_spec.rb` or the equivalent request/controller spec — adapt from a view spec to a request/JSON spec if that's what's there).

4. **Write the result** to `reports/parity/<feature>.md` — one line per golden flow (pass/fail), plus a summary line, plus any console/network errors seen.

5. **On full pass**: update `state/migration-state.json` — flip this feature's `parity_status: "pass"` and `rails_status: "json_only"`. Only now delete the feature's old ERB views/partials from `rails-src/app/views/<feature>/` (and remove `respond_to :html` if it was explicit). Append to `state/run-log.ndjson`.

6. **On any failure**: do not touch `rails_status` or delete anything. Write the failing flows to `reports/parity/<feature>.md` with enough detail (expected vs. actual, console/network errors) that `feature-migrate` can be re-run to fix the specific gap — report back and stop rather than retrying automatically.

## Output

`reports/golden/<feature>.json` (first run only), `reports/parity/<feature>.md` (every run), and on pass: `rails-src/app/views/<feature>/` ERB files deleted + `state/migration-state.json` updated.
