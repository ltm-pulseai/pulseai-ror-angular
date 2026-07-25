# Feature Spec: Sessions

> Phase 2 (migrated together with Users — see `02-users.md`). Sessions is not a
> peer feature: `SessionsHelper` (mixed into `ApplicationController`) supplies
> `current_user`/`logged_in?` to **every** controller and to the shared header
> partial, and `SessionsController#create` authenticates against the `User` row
> that `02-users.md`'s signup flow creates. This spec is where the real
> `AuthService` gets implemented; the auth-transport choice below is
> load-bearing for both spec files.

## 1. Routes

| Verb | Path | Controller#Action | Auth required? (before_action) |
|------|------|--------------------|----------------------------------|
| GET | `/login` | `sessions#new` | No |
| POST | `/login` | `sessions#create` | No |
| DELETE | `/logout` | `sessions#destroy` | No `before_action` — guards internally via `logged_in?` |

Source: `config/routes.rb` — `get '/login', to: 'sessions#new'`, `post '/login', to: 'sessions#create'`, `delete '/logout', to: 'sessions#destroy'`. There is no `SessionsController#edit`/`#show` — sessions are not a CRUD resource with a form-backed model, they are Rails' cookie-store session plus a `User` row.

## 2. Controller Actions

### `sessions#new`
- Params: none
- Filters: none
- Success: renders `new` (login form)
- Failure: n/a
- Side effects: none

### `sessions#create`
- Params: `session[email]`, `session[password]`, `session[remember_me]` (`'1'` or `'0'`, from a checkbox)
- Filters: none
- Success path:
  - `user = User.find_by(email: params[:session][:email].downcase)`
  - if `user && user.authenticate(params[:session][:password])`:
    - if `user.activated?`: `log_in(user)` (sets `session[:user_id] = user.id`); `params[:session][:remember_me] == '1' ? remember(user) : forget(user)`; `redirect_back_or(user)` (redirects to `session[:forwarding_url]` if one was stored by `ApplicationController#logged_in_user`/`store_location`, else to the user's own show page — then clears `session[:forwarding_url]`)
    - else (not activated): `flash[:warning] = "Account not activated. Check your email for the activation link."`; `redirect_to root_url`
- Failure path: user not found, or `authenticate` fails → `flash.now[:danger] = 'Invalid email/password combination'`; `render 'new'` (re-renders the form in place — `flash.now` rather than `flash` because there's no redirect). **Note the message is deliberately generic** — Rails does not reveal whether the email exists or the password was wrong (anti-enumeration).
- Side effects: sets `session[:user_id]`; on `remember_me == '1'`, calls `user.remember` (persists `remember_digest`) and sets `cookies.permanent.encrypted[:user_id]` + `cookies.permanent[:remember_token]`; on not-remembering, calls `forget(user)` which clears `remember_digest` and deletes both cookies; may clear `session[:forwarding_url]`

### `sessions#destroy`
- Params: none
- Filters: none, but the action body itself checks `logged_in?` before logging out (guards against a double-destroy, e.g. two browser tabs both firing logout)
- Success: `log_out if logged_in?` → `redirect_to root_url`
- Failure: n/a
- Side effects: `log_out` calls `forget(current_user)` (clears the DB `remember_digest` + deletes both remember cookies), `session.delete(:user_id)`, and resets the memoized `@current_user` to `nil`

### `SessionsHelper` (`app/helpers/sessions_helper.rb`, mixed into `ApplicationController`, so available in every controller and every view)
- `log_in(user)`: `session[:user_id] = user.id`
- `remember(user)`: calls `user.remember` (model generates + persists a new `remember_token`/`remember_digest` pair); sets `cookies.permanent.encrypted[:user_id] = user.id` and `cookies.permanent[:remember_token] = user.remember_token` — Rails' `permanent` cookie jar defaults to a ~20-year expiry, i.e. this is the "remember me" persistent login
- `current_user`: memoized as `@current_user`. Resolves `session[:user_id]` first; if absent, falls back to the encrypted `user_id` cookie + `remember_token` cookie, verifying the token against `remember_digest` via `user.authenticated?(:remember, cookies[:remember_token])` (bcrypt) — if valid, it transparently re-establishes the session (`log_in user`) so the remember-cookie path and the session path converge
- `current_user?(user)`: `user == current_user`
- `logged_in?`: `!current_user.nil?`
- `forget(user)`: `user.forget` (clears `remember_digest` in the DB) + `cookies.delete(:user_id)` + `cookies.delete(:remember_token)`
- `log_out`: `forget(current_user)`; `session.delete(:user_id)`; `@current_user = nil`
- `redirect_back_or(default)`: `redirect_to(session[:forwarding_url] || default)`; `session.delete(:forwarding_url)`
- `store_location`: `session[:forwarding_url] = request.original_url if request.get?` — called by `ApplicationController#logged_in_user` before it redirects an unauthenticated user to `/login`, so login can bounce them back to where they were headed

### `ApplicationController` (`app/controllers/application_controller.rb`)
- `include SessionsHelper` — this single line is what makes `current_user`/`logged_in?` available application-wide, not just to `SessionsController`
- private `logged_in_user` filter: `unless logged_in?; store_location; flash[:danger] = "Please log in."; redirect_to login_url; end` — used by `UsersController` (`index`, `edit`, `update`, `destroy`, `following`, `followers`, see `02-users.md`) and by other controllers outside this phase's scope (Microposts, Relationships)

## 3. Data Shape

Sessions has no persisted model of its own (no `Session` ActiveRecord class) —
the "resource" is the login/logout request/response contract against the
`User` row (see `02-users.md` §3 for the full `User` shape).

```json
{
  "loginRequest": {
    "session": {
      "email": "user@example.com",
      "password": "plaintext-over-TLS-only",
      "rememberMe": true
    }
  },
  "loginResponseSuccess": {
    "user": { "...": "same User shape as 02-users.md §3" }
  },
  "loginResponseSuccess_ifJWTChosen": {
    "user": { "...": "same User shape as 02-users.md §3" },
    "token": "<opaque or JWT — only present if Open Questions §1 resolves to option B>"
  },
  "loginResponseFailure": {
    "error": "Invalid email/password combination"
  },
  "logoutResponse": "204 No Content (cookie option) — or client-side token discard (JWT option), see Open Questions §1"
}
```

## 4. View → Component Decomposition

| ERB view/partial | Proposed Angular component | Type (page/shared) | Inputs | Outputs |
|-------------------|------------------------------|---------------------|--------|---------|
| `app/views/sessions/new.html.erb` | `LoginPageComponent` | page | — | — (navigates on success) |
| `app/views/layouts/_header.html.erb` | `NavbarComponent` | shared, cross-feature (full spec lives in `02-users.md` §4 — listed here because it's the primary consumer of `AuthService`) | `AuthService.currentUser$` / `isLoggedIn$` | `logout: EventEmitter<void>` |
| `app/views/shared/_user_info.html.erb` | `CurrentUserInfoComponent` | shared (full spec in `02-users.md` §4) | `AuthService.currentUser$` | — |

There is no `sessions#edit` or `sessions#show` view — logout is a single
`delete` link (see §6), not a page.

## 5. Forms & Validations

| Field | Rails validation (model) | Angular reactive validator | Server error surfacing |
|-------|---------------------------|------------------------------|--------------------------|
| `email` | None enforced by the session form itself — an unknown or malformed email simply fails `find_by`/`authenticate` and falls into the generic failure path | `Validators.required`, `Validators.email` (client-side UX only; not a server-side contract today) | one generic message, see below |
| `password` | None enforced by the session form itself | `Validators.required` | same generic message |
| `rememberMe` (checkbox) | n/a (`params[:session][:remember_me] == '1'`) | boolean, defaults unchecked | n/a |

**Server error surfacing is deliberately non-field-specific**: both a
nonexistent email and a wrong password produce the same
`'Invalid email/password combination'` flash (anti-enumeration). The Angular
login form must preserve this — do not split it into per-field errors.

## 6. JS/AJAX Behaviors → Angular Reactivity

None. `app/views/sessions/new.html.erb` uses `form_with(url: login_path, scope: :session, local: true)` — an ordinary full-page HTML form submit, not `remote: true`. Logout (`link_to "Log out", logout_path, method: :delete`, in `_header.html.erb`) is a Rails-UJS method-override link (submits a hidden DELETE form), also not AJAX. **Angular equivalent:** `LoginPageComponent` submits via `AuthService.login()` (an HTTP call) and navigates on success/failure instead of a full-page POST; `NavbarComponent`'s logout button calls `AuthService.logout()` directly — no UJS method-override trick needed since Angular's `HttpClient` can issue a `DELETE` natively.

## 7. Styling

No `sessions.scss` file exists under `app/assets/stylesheets/` — only
`users.scss` was found for these two features, and it is empty (see
`02-users.md` §7). The login form reuses the same Bootstrap 3 classes as the
Users forms (`row`, `col-md-6`, `col-md-offset-3`, `form-control`,
`btn btn-primary`, plus `checkbox inline` for the remember-me label) — the
carryover-vs-redesign decision flagged in `02-users.md` §9 applies here too;
not repeated as a separate open question.

## 8. Dependencies

- `SessionsHelper` is the **#5 god node** in the graph (10 edges — `graphify-out/GRAPH_REPORT.md` God Nodes), mixed into `ApplicationController` (**#3 god node**, 11 edges), which every other controller inherits from. This is precisely the "read by nearly every controller and by the shared header partial" cross-cutting coupling called out in the phase plan — `current_user`/`logged_in?` are a primitive, not a feature-local concern.
- `SessionsController` itself is the **#8 god node** (5 edges).
- Circularly coupled with Users (see `02-users.md`): `SessionsController#create` calls `User.find_by`, `User#authenticate`, and `User#activated?` directly, authenticating against the exact row that `UsersController#create` (signup) produces.
- Depends on `User` model columns added by dedicated migrations (`add_remember_digest`, `add_activation_to_users`, `add_admin_to_users` — visible as Community Hubs in `GRAPH_REPORT.md`) already existing in the schema.
- Every other feature/phase (Microposts, Relationships, PasswordResets, AccountActivations, the StaticPages home sidebar) depends on this phase's `AuthService` existing first, since they all gate on `logged_in?`/`current_user` or read `current_user` data via the shared header/`_user_info` partials.
- Requires the Phase 0 Angular shell (routing + an HTTP client wrapper) so `AuthService` has somewhere to attach `withCredentials` or an `Authorization` header, depending on Open Questions §1.

## 9. Open Questions

1. **RESOLVED (user decision): Option A — cookie session + CSRF.** Implemented as: `GET /api/csrf_token` returns `{csrfToken}`; Angular attaches it as `X-CSRF-Token` on mutating requests via an `HttpInterceptor`; `HttpClient` calls use `withCredentials: true`; `POST /api/login`/`DELETE /api/logout`/`GET /api/me` added to `rails-src/config/routes.rb` under a `scope '/api', defaults: { format: :json }` block, additive alongside the existing HTML routes. Verified end-to-end via curl against the live Rails server: signup → (blocked until activated) → login → `/api/me` reflects the session → logout → `/api/me` returns `null`. Original tradeoff writeup below, kept for context:
   - **Option A — keep the Rails cookie session + CSRF token.** `AuthService.login()` calls `POST /api/login` with `withCredentials: true`; Rails keeps issuing its encrypted session cookie exactly as today, plus the `remember_digest`/`remember_token` permanent cookies for "remember me". Angular reads a CSRF token (via a dedicated endpoint or a readable cookie) and attaches it as a header on mutating requests.
     - Pros: smallest change from the existing implementation — `SessionsHelper#remember`/`#forget`/`#current_user` logic carries over almost unchanged server-side; logout/session invalidation already works via the Rails session store.
     - Cons: cookie + CORS complexity if the Angular app and Rails API end up on different origins/ports during the migration; the SPA must fetch/refresh a CSRF token.
   - **Option B — JWT/opaque token returned by `POST /api/login`, stored in memory** (not `localStorage`, to reduce XSS token-theft exposure). `AuthService` holds the token in a service-level signal/variable; an `HttpInterceptor` attaches it as `Authorization: Bearer <token>`.
     - Pros: no CSRF handling needed; cleaner separation between the API and Rails' session machinery; easier if the API is ever consumed by a non-browser client.
     - Cons: this Rails app has **zero existing JWT/token infrastructure** — issuance, verification, and revocation would all be new server-side work; "remember me" needs a redesigned refresh-token flow since in-memory storage doesn't survive a page reload; logout/revocation needs a server-side blocklist or short token expiry.
   - **Recommendation (not a decision): Option A (cookie + CSRF).** It is the smaller lift given `SessionsHelper` already implements session + remember-me cookie logic that can be reused almost as-is, versus building token infrastructure from nothing for Option B. **This is explicitly NOT decided** — confirm with a human before `feature-migrate` is run against either this spec or `02-users.md`, since the choice reshapes `AuthService`'s public interface, the interceptor design, and how "remember me" is implemented in Angular.
2. **"Remember me" persistence under whichever transport is chosen.** The Rails `cookies.permanent.encrypted[:user_id]` + `cookies.permanent[:remember_token]` pair (effectively a ~20-year persistent login) needs an explicit Angular-side design either way: a long-lived refresh token (if Option B) or a second persistent cookie (if Option A). Not resolved here — depends on §1.
3. **`current_user` resolution timing on page load/refresh.** Rails computes `current_user` synchronously per-request before any view renders. Angular will need an app-init resolver/guard (e.g. an `APP_INITIALIZER` or a route resolver) that populates `AuthService.currentUser` *before* `NavbarComponent` or any auth-gated route renders, to avoid a flash of "logged out" state on refresh. Left open pending §1, since the mechanism differs between cookie-session rehydration and token rehydration.
4. **Generic vs. field-specific login error message** (§5) — recommend preserving Rails' single generic "Invalid email/password combination" message rather than splitting into per-field errors, for parity and to avoid introducing a user-enumeration vector that doesn't exist today. Flagged as a confirmation item, not a silent default.
