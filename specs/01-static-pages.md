# Feature Spec: StaticPages

## 1. Routes

| Verb | Path | Controller#Action | Auth required? (before_action) |
|------|------|--------------------|----------------------------------|
| GET | `/` (root) | `static_pages#home` | No |
| GET | `/help` | `static_pages#help` | No |
| GET | `/about` | `static_pages#about` | No |
| GET | `/contact` | `static_pages#contact` | No |

`StaticPagesController` has **zero** `before_action` filters (confirmed by reading `rails-src/app/controllers/static_pages_controller.rb` — no `before_action` calls anywhere in the class, and `ApplicationController` itself defines a private `logged_in_user` filter method but does not apply it to itself). This is the lowest-risk controller in the app and the reason it is Phase 1.

## 2. Controller Actions

For each action: params consumed, before_actions/filters that gate it, success path
(redirect/response), failure path, side effects (session, cookies, mailer calls).

### `static_pages#home`
- Params: none
- Filters: none
- Success: renders `home.html.erb`. Branches on `logged_in?`:
  - If logged in: builds `@micropost = current_user.microposts.build` and `@feed_items = current_user.feed.paginate(page: params[:page])`, then renders the logged-in dashboard partials (`shared/user_info`, `shared/stats`, `shared/micropost_form`, `shared/feed`).
  - If logged out: renders a static jumbotron ("welcome" message, Rails Tutorial blurb, "Sign up now!" button linking to `/signup`, Rails logo image linking to rubyonrails.org).
- Failure: none (no failure path — no params to validate).
- Side effects: none (read-only; no session/cookie/mailer writes in this action itself).

**Phase 1 scope note:** since the Angular `AuthService` is a stub in this phase (`currentUser` signal always `null`), the Angular `HomeComponent` will always render the **logged-out branch** in Phase 1. The logged-in branch (micropost feed, `shared/user_info`, `shared/stats`, `shared/micropost_form`, `shared/feed`, and the `User`/`Micropost` model data behind them) is out of scope for this spec and belongs to a later phase once auth and microposts are migrated. See section 9.

### `static_pages#help`
- Params: none
- Filters: none
- Success: renders `help.html.erb` (static content, page title "Help")
- Failure: none
- Side effects: none

### `static_pages#about`
- Params: none
- Filters: none
- Success: renders `about.html.erb` (static content, page title "About")
- Failure: none
- Side effects: none

### `static_pages#contact`
- Params: none
- Filters: none
- Success: renders `contact.html.erb` (static content, page title "Contact")
- Failure: none
- Side effects: none

## 3. Data Shape

No model-backed data for this feature in Phase 1 scope (logged-out branch only). The
only "data" consumed by these views is static copy plus the page title computed by
`ApplicationHelper#full_title`:

```json
{
  "pageTitle": "string (e.g. 'Help', 'About', 'Contact', or '' for Home)",
  "fullTitle": "computed client-side as `${pageTitle} | Ruby on Rails Tutorial Sample App` or just the base title when pageTitle is empty — see ApplicationHelper#full_title, rails-src/app/helpers/application_helper.rb:4-11"
}
```

Out-of-scope data shape (deferred to the phase that migrates auth + microposts, noted here only for traceability): `@micropost` (new `Micropost` for `current_user`), `@feed_items` (paginated `current_user.feed`, `app/models/user.rb:81`).

## 4. View → Component Decomposition

| ERB view/partial | Proposed Angular component | Type (page/shared) | Inputs | Outputs |
|-------------------|------------------------------|---------------------|--------|---------|
| `app/views/static_pages/home.html.erb` (logged-out branch only) | `HomeComponent` | page | none | none |
| `app/views/static_pages/help.html.erb` | `HelpComponent` | page | none | none |
| `app/views/static_pages/about.html.erb` | `AboutComponent` | page | none | none |
| `app/views/static_pages/contact.html.erb` | `ContactComponent` | page | none | none |
| `app/views/layouts/application.html.erb` | `AppShellComponent` / root layout (already scaffolded in Phase 0 — this feature only supplies the routed content) | shared | none | none |
| `app/views/layouts/_header.html.erb` | `HeaderComponent` | shared | `currentUser` (from stubbed `AuthService.currentUser` signal) | none |
| `app/views/layouts/_footer.html.erb` | `FooterComponent` | shared | none | none |
| `app/views/static_pages/home.html.erb` (logged-in branch: `shared/user_info`, `shared/stats`, `shared/micropost_form`, `shared/feed`) | *(not built in this phase)* | — | — | — |

`HeaderComponent`/`FooterComponent` are cross-cutting layout partials, not unique to `static_pages`, but this is the first feature to exercise them end-to-end since it is Phase 1 — flagged in section 8.

## 5. Forms & Validations

None. `static_pages` has no forms — `StaticPagesHelper` is an empty module (confirmed by reading `rails-src/app/helpers/static_pages_helper.rb`, and cross-checked against `GRAPH_REPORT.md`'s Knowledge Gaps list, which flags `StaticPagesHelper` as an isolated/≤1-connection node), and none of the four views contain a `form_with`/`form_for`. The only interactive element is the "Sign up now!" link (a styled anchor to `/signup`, not a form) and the header's login/logout links.

## 6. JS/AJAX Behaviors → Angular Reactivity

None. No `.js.erb` files and no `remote: true` links/forms anywhere in the `static_pages` views, header, or footer partials.

## 7. Styling

- `rails-src/app/assets/stylesheets/static_pages.scss` — currently **empty** (only the scaffold comment placeholder, confirmed by reading the file). No feature-specific rules to port; component-scoped CSS files can start empty or be omitted.
- `rails-src/app/assets/stylesheets/custom.scss` — this is the shared theme file, not `static_pages`-specific, but it contains the rules these views actually depend on visually:
  - `.center.jumbotron` / `.center h1` (home page logged-out hero) — port to a shared theme/global stylesheet, not component-scoped.
  - `h1`, `h2`, `p` base typography rules — shared theme.
  - `#logo` (header brand) and `footer` block (incl. the `@media (max-width: 800px)` responsive rule for the footer's `small`/`ul` layout) — belongs to `HeaderComponent`/`FooterComponent` shared styles, not this feature, but first exercised here.
- Bootstrap classes in use that need a replacement or keep-as-is decision:
  - Header: `navbar navbar-fixed-top navbar-inverse`, `navbar-header`, `navbar-toggle collapsed`, `collapse navbar-collapse`, `nav navbar-nav navbar-right`, `dropdown`, `dropdown-toggle`, `dropdown-menu`, `divider`, `caret`, `sr-only`, `icon-bar` — all Bootstrap 3 (via `bootstrap-sprockets`/`bootstrap` gem, confirmed by the `@import` lines in `custom.scss`). These need an explicit decision: keep Bootstrap 3 classes + reintroduce Bootstrap CSS/JS in Angular (incl. its jQuery-dependent collapse/dropdown behavior), or replace with an Angular-native component (e.g. Angular Material / a hand-rolled responsive nav) since Bootstrap's JS plugins (`data-toggle`, `data-target`) have no direct Angular equivalent and currently rely on jQuery (`@rails/ujs`, Sprockets/Webpacker asset pipeline, both out of scope for the Angular app).
  - Home hero: `row`, `col-md-4`, `col-md-8`, `center jumbotron`, `btn btn-lg btn-primary` — same Bootstrap grid/component question applies.
  - Flash messages in `application.html.erb`: `alert alert-<%= message_type %>` — Bootstrap alert classes; flash/toast rendering itself is a cross-cutting layout concern (not unique to this feature) but first surfaces here since this is Phase 1.
  - This Bootstrap-3-vs-Angular-native decision is cross-cutting (affects every future feature's layout, not just `static_pages`) — flagged again in section 9.

## 8. Dependencies

- **Phase 0 shell**: Angular app shell/routing must already exist (root layout, router outlet) before this feature's routes (`/`, `/help`, `/about`, `/contact`) can be wired in.
- **`ApplicationHelper#full_title`** (`rails-src/app/helpers/application_helper.rb`) — used by the layout to set `<title>`. Needs an Angular equivalent (e.g. a `Title` service call per route, or a resolver) producing `"<PageTitle> | Ruby on Rails Tutorial Sample App"` or just the base title when empty.
- **`SessionsHelper`** (`logged_in?`, `current_user`) — per `graphify explain "StaticPagesController"` and the traversal query, `StaticPagesController` inherits `ApplicationController`, which does `include SessionsHelper` (`app/controllers/application_controller.rb:2`). `GRAPH_REPORT.md` places `StaticPagesController` in Community 1 ("Helpers Sessions Helper") alongside `ApplicationController`, `SessionsHelper`, `SessionsController`, `MicropostsController`, `AccountActivationsController` — i.e. this is the shared-auth-context community, not something unique to static pages. `StaticPagesController` is also God Node #7 (6 edges) in `GRAPH_REPORT.md`, but its edges are just its own 4 actions + inheritance + file-containment — it is not itself a hub other features depend on.
  - **In Angular Phase 1, this becomes the stubbed `AuthService`** (per the angular-scaffold skill): `currentUser` signal always `null`. The `HeaderComponent` must be built to consume `AuthService.currentUser` reactively (e.g. via a signal or `@Input`) so that swapping in the real `AuthService` in Phase 2 requires no changes to `HeaderComponent`'s template logic — only the service implementation changes.
- **Phase 2 auth** (`sessions`/`users` features): required before the header's logged-in nav branch (Users link, Account dropdown, Profile/Settings/Log out links) and the `home#home` logged-in dashboard (micropost feed) can be built for real. Until then those code paths are unreachable in the Angular app and are explicitly out of scope here (see sections 4 and 9).
- **`signup_path` (`/signup` → `users#new`)** — the home page's "Sign up now!" button links here. The route must exist (even as a placeholder/stub page) for Phase 1's `HomeComponent` to link somewhere real; if the `users` feature isn't built yet, this can be a dead/placeholder Angular route.
- **i18n locale files** (`config/locales/{en,de,es}.yml`) — `GRAPH_REPORT.md` hyperedge notes these three share the `static_pages.home` key structure. All three have the `home.welcome` (and `home.signup`) keys **commented out** (confirmed by reading `en.yml`) — see Open Questions.
- **`rails.svg`** (`rails-src/app/assets/images/rails.svg`) — confirmed present; the Rails logo image linked from the logged-out home hero needs to be copied into the Angular app's static assets.
- Not a dependency, but confirmed empty/inert: `static_pages.scss` (no rules) and `StaticPagesHelper` (empty module, flagged in `GRAPH_REPORT.md` Knowledge Gaps as an isolated node) — nothing to port from either.

## 9. Open Questions

1. **`home.html.erb`'s `t('.welcome')` call resolves to a missing translation.** All three locale files (`en.yml`, `de.yml`, `es.yml`) have the `static_pages.home.welcome` key commented out (e.g. `en.yml` line 4: `#welcome: "Welcome to the Sample App"`). At Rails runtime this renders as `"translation missing: en.static_pages.home.welcome"` inside the `<h1>`. For the Angular port, should we (a) reproduce this literally (the actual current behavior), or (b) hardcode the evidently-intended text `"Welcome to the Sample App"` (the commented-out value)? Needs a human decision before `feature-migrate` runs — do not default silently.
2. **Header render against a stubbed `AuthService`.** In this phase `AuthService.currentUser` is always `null`, so `HeaderComponent` will only ever exercise its logged-out branch (Home/Help links + "Log in" link) during Phase 1 build-out and QA. The logged-in branch (Users link, Account dropdown with Profile/Settings/Log out) cannot be visually or functionally verified until Phase 2 makes `AuthService` real. This spec's `HeaderComponent` must be re-verified once Phase 2 lands — flag this explicitly as a follow-up QA task, not a defect in this feature's implementation.
3. **Bootstrap 3 UI dependency (navbar collapse, dropdown menu).** The header relies on Bootstrap 3's JS plugins (`data-toggle="collapse"`, `data-toggle="dropdown"`), which in Rails are powered by jQuery/Sprockets, not present in the Angular app. Decision needed: keep Bootstrap (import Bootstrap CSS + JS or a jQuery-free reimplementation) vs. replace with an Angular-native menu/nav (Angular Material, CDK Overlay, or hand-rolled). This is cross-cutting (affects every feature's layout) — surfacing here since `static_pages` is the first feature to touch the header, but the decision should be made once for the whole app, not per-feature.
4. **Home page logged-in dashboard (micropost feed) is explicitly deferred**, not silently dropped — confirm this is acceptable for the Phase 1 milestone (i.e., that `/` in the Angular app is allowed to only ever show the logged-out hero until microposts + auth are migrated), rather than needing a "coming soon" placeholder for logged-in users in the interim.
5. **Flash message rendering** (`application.html.erb`'s `flash.each` → `alert alert-<message_type>`) is layout-level, not `static_pages`-specific, but no feature has claimed it in a spec yet. Confirm which phase/spec owns designing the Angular flash/toast mechanism (likely Phase 0 shell or Phase 2 alongside login) so it isn't missed.
