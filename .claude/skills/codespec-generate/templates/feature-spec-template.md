# Feature Spec: <FeatureName>

## 1. Routes

| Verb | Path | Controller#Action | Auth required? (before_action) |
|------|------|--------------------|----------------------------------|
|      |      |                    |                                  |

## 2. Controller Actions

For each action: params consumed, before_actions/filters that gate it, success path
(redirect/response), failure path, side effects (session, cookies, mailer calls).

### `<controller>#<action>`
- Params:
- Filters:
- Success:
- Failure:
- Side effects:

## 3. Data Shape

Inferred from model attributes/associations + what the views actually read (no
serializer exists yet — jbuilder is available in the Gemfile but unused, so this
is view-driven inference, not copied from an existing JSON contract).

```json
{
}
```

## 4. View → Component Decomposition

| ERB view/partial | Proposed Angular component | Type (page/shared) | Inputs | Outputs |
|-------------------|------------------------------|---------------------|--------|---------|
|                    |                              |                     |        |         |

## 5. Forms & Validations

| Field | Rails validation (model) | Angular reactive validator | Server error surfacing |
|-------|---------------------------|------------------------------|--------------------------|
|       |                           |                              |                          |

## 6. JS/AJAX Behaviors → Angular Reactivity

Describe any `.js.erb` / `remote: true` behavior found and its Angular equivalent
(signal update + optimistic UI vs. subscribe-and-patch). Write "None" if the
feature has no AJAX behavior.

## 7. Styling

SCSS partial(s) involved → component-scoped CSS vs. shared theme file. List
Bootstrap classes in use that need a replacement or a keep-as-is decision.

## 8. Dependencies

Other features/models this depends on (from the graph — cite the god-node /
community findings from `graphify-out/GRAPH_REPORT.md` where relevant), and what
must exist first (e.g. Phase 0 shell, Phase 2 auth).

## 9. Open Questions

Explicitly unresolved items (e.g. auth transport: cookie+CSRF vs JWT). Never
force a default here — flag for a human decision before `feature-migrate` is
run against this spec. Write "None" only if there is genuinely nothing
unresolved.
