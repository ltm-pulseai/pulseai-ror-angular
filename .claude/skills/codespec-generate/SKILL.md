---
name: codespec-generate
description: Generate one per-feature migration spec (specs/<NN>-<feature>.md) for the Rails-to-Angular migration, from graphify-out/graph.json + GRAPH_REPORT.md + direct source reads. Use when asked to write/update a feature spec for a named Rails resource/controller.
---

# codespec-generate

Turns one Rails feature (a controller + its views/partials/JS/CSS/routes) into a
single spec document that `feature-migrate` can act on. One feature at a time —
never batch multiple features in one invocation.

## Prerequisites

`graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` must already exist
(produced by the `graphify` skill against `rails-src/`). If they don't exist,
stop and say so — do not fall back to reading source files blind, the whole
point of this skill is to use the graph first.

## Inputs

- `feature` — a Rails resource/controller name, e.g. `static_pages`, `users`,
  `sessions` (Users+Sessions are migrated together per the phase plan but still
  get two spec files, cross-referencing each other in section 8), `microposts`,
  `relationships`, `password_resets`, `account_activations`.
- `phase_number` — the two-digit prefix for the output filename, per the phase
  order in the root `CLAUDE.md` / `state/migration-state.json`.

## graph.json schema (NetworkX node-link format — read this before querying)

- `nodes[]`: `{ id, label, file_type, source_file, source_location, community, norm_label }`
- `links[]`: `{ source, target, relation, confidence (EXTRACTED|INFERRED|AMBIGUOUS), confidence_score, source_file, source_location, weight }`
- `graph.hyperedges[]`: `{ id, label, nodes[], relation, confidence, confidence_score, source_file }`
- Top-level: `directed` (bool), `multigraph` (bool)

There is no bespoke schema beyond this — do not invent additional fields.

## Steps

1. **Filter the graph to this feature.** Load `graphify-out/graph.json` and select every node whose `source_file` falls under the feature's own paths:
   - `app/controllers/<feature>_controller.rb`
   - `app/views/<feature>/**`
   - `app/helpers/<feature>_helper.rb`
   - `app/assets/stylesheets/<feature>.scss`
   - any model(s) reached by a `links[]` edge from the controller/action nodes above (e.g. `model_used_by`/`shares_data_with`/`calls` edges into `app/models/*`)

   Prefer `graphify query "<feature> controller"` or `graphify explain "<Controller>"` (CLI, reads `graphify-out/graph.json` by default) over hand-rolling traversal, when the question maps cleanly to one of those. Fall back to loading the JSON directly for anything query/explain doesn't answer well (e.g. exact form fields).

2. **Cross-check against `GRAPH_REPORT.md`.** Note if the feature's controller shows up in God Nodes (cross-cutting — flag its dependents explicitly in section 8) or in a Surprising Connection (worth a line in Dependencies).

3. **Read the actual source files** for the filtered set — the graph tells you *which* files matter and how they relate; it does not carry exact validation messages, exact field lists, or exact param names. Read controller, views/partials, helper, model, and scss files directly for those details.

4. **Fill `templates/feature-spec-template.md`** section by section. Section 9 (Open Questions) is not optional — if there is genuinely nothing unresolved, write "None" explicitly rather than omitting the section. Do not silently pick a default for anything cross-cutting (auth transport, session vs token) — surface it there instead.

5. **Write the result** to `specs/<NN>-<feature>.md` (zero-padded two-digit phase number, e.g. `specs/02-users.md`, `specs/02-sessions.md`).

## Output

One file: `specs/<NN>-<feature>.md`, fully filled (no template placeholders left in the output — a table with only a header row means "nothing found," write "None" in the body instead of leaving it empty).
