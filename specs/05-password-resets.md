# Feature Spec: PasswordResets

## 1. Routes

| Verb | Path | Controller#Action | Auth required? (before_action) |
|------|------|--------------------|----------------------------------|
| GET | `/password_resets/new` | `password_resets#new` (bare route — see note) | No |
| GET | `/password_resets/new` (resourceful) | `password_resets#new` | No |
| POST | `/password_resets` | `password_resets#create` | No |
| GET | `/password_resets/edit` | `password_resets#edit` (bare route — see note) | No |
| GET | `/password_resets/:id/edit` (resourceful) | `password_resets#edit` | No login required, but gated by `get_user` + `valid_user` + `check_expiration` before_actions |
| PATCH/PUT | `/password_resets/:id` | `password_resets#update` | No login required, same `get_user` + `valid_user` + `check_expiration` guards as `edit` |

Note: `routes.rb` contains two vestigial bare routes (`get 'password_resets/new'` and `get 'password_resets/edit'`) left over from `rails generate controller PasswordResets new edit`. They duplicate paths already produced by `resources :password_resets, only: [:new, :create, :edit, :update]` on the line below. They are dead weight, not a second code path — flagged again in Open Questions.

None of the four actions require `logged_in_user`. Access control instead relies on possession of a valid `(email, token)` pair delivered via the emailed link — this is intentionally usable by a signed-out visitor who forgot their password.

## 2. Controller Actions

### `password_resets#new`
- Params: none
- Filters: none
- Success: renders the "Forgot password" form (email input only)
- Failure: n/a
- Side effects: none

### `password_resets#create`
- Params: `password_reset[email]`
- Filters: none
- Success: `User.find_by(email: params[:password_reset][:email].downcase)` finds a user → calls `@user.create_reset_digest` (generates `reset_token`, persists `reset_digest` + `reset_sent_at`) → `@user.send_password_reset_email` (synchronous `UserMailer.password_reset(user).deliver_now`) → `flash[:info] = "Email sent with password reset instructions"` → `redirect_to root_url`
- Failure: user not found → `flash.now[:danger] = "Email address not found"`, `render 'new'` (200, same page, not a redirect)
- Side effects: writes `reset_digest`/`reset_sent_at` to the user row; sends an email synchronously (no background job — this app has no ActiveJob queue backing it, `deliver_now` blocks the request)

### `password_resets#edit`
- Params: `id` (the raw reset token, path param), `email` (query param, e.g. `?email=user%40example.com`)
- Filters (via before_actions, in order): `get_user` (`@user = User.find_by(email: params[:email])`) → `valid_user` (redirects to `root_url` unless `@user && @user.activated? && @user.authenticated?(:reset, params[:id])`) → `check_expiration` (if `@user.password_reset_expired?`, sets `flash[:danger] = "Password reset has expired."` and redirects to `new_password_reset_url`)
- Success: renders the reset-password form (hidden `email` field + `password` + `password_confirmation`)
- Failure: redirect to `root_url` (invalid user/unactivated/token mismatch) or to `new_password_reset_url` (token expired)
- Side effects: none

### `password_resets#update`
- Params: `email` (hidden field carried from the edit form), `user[password]`, `user[password_confirmation]`
- Filters: same three before_actions as `edit` (`get_user`, `valid_user`, `check_expiration`) — run again on submit, so an expired/invalid token is rejected at submit time too, not just at page-load time
- Success (Case 4): `params[:user][:password]` is not empty AND `@user.update(user_params)` passes model validations → `log_in @user` (via `SessionsHelper`, establishes a session exactly like a fresh login) → `flash[:success] = "Password has been reset."` → `redirect_to @user` (the user's show page)
- Failure (Case 3): `params[:user][:password].empty?` → `@user.errors.add(:password, "can't be empty")`, `render 'edit'`
- Failure (Case 2): password present but `@user.update(user_params)` fails validation (e.g. confirmation mismatch, too short) → `render 'edit'` with model errors surfaced by `shared/_error_messages`
- Side effects: persists new `password_digest` on the user; **logs the user in** (creates a session) — this is the reason the feature depends on Sessions (Phase 2)

`user_params` is `params.require(:user).permit(:password, :password_confirmation)`.

## 3. Data Shape

Inferred from `User` model attributes (`app/models/user.rb`) and the two migrations `db/migrate/20190824013003_add_reset_to_users.rb` (adds `reset_digest:string`, `reset_sent_at:datetime`) and the pre-existing `password_digest` (via `has_secure_password`). No serializer/jbuilder view exists — this is view-driven inference.

```json
{
  "passwordResetRequest": {
    "email": "string"
  },
  "passwordResetEditContext": {
    "token": "string (path param, matched against bcrypt reset_digest, never stored in plaintext)",
    "email": "string (query param, used to look up the user)"
  },
  "passwordResetUpdate": {
    "email": "string",
    "user": {
      "password": "string, min length 6",
      "passwordConfirmation": "string, must match password"
    }
  },
  "userReferenceFields": {
    "email": "string, present, max 255, format VALID_EMAIL_REGEX, unique, downcased before save",
    "resetDigest": "string | null — bcrypt hash of reset_token, never exposed to client",
    "resetSentAt": "datetime | null — used by password_reset_expired? (expires 2 hours after send)",
    "activated": "boolean — valid_user rejects unactivated accounts from resetting a password",
    "passwordDigest": "string — bcrypt hash, written on successful update"
  }
}
```

## 4. View → Component Decomposition

| ERB view/partial | Proposed Angular component | Type (page/shared) | Inputs | Outputs |
|-------------------|------------------------------|---------------------|--------|---------|
| `app/views/password_resets/new.html.erb` | `PasswordResetRequestComponent` | page | none | `(submit)` → emits `{ email }` to trigger `create` |
| `app/views/password_resets/edit.html.erb` | `PasswordResetEditComponent` | page | `token` (route param), `email` (query param) | `(submit)` → emits `{ email, password, passwordConfirmation }` to trigger `update` |
| `app/views/shared/_error_messages.html.erb` (reused) | `FormErrorsComponent` (shared across Users/Sessions/PasswordResets forms) | shared | `errors: string[]` | none |

## 5. Forms & Validations

| Field | Rails validation (model) | Angular reactive validator | Server error surfacing |
|-------|---------------------------|------------------------------|--------------------------|
| `email` (new/create) | No model-level validation blocks the request itself — controller does a plain `find_by`; a nonexistent email produces a controller-level flash, not a model error | `Validators.required`, `Validators.email` (client-side hint only; the real check is a server lookup) | Map failure response (e.g. 404/422 "Email address not found") to a page-level banner, mirroring `flash.now[:danger]` |
| `password` (edit/update) | Controller-level: rejects empty string with `"can't be empty"` before hitting model validation. Model-level (`has_secure_password`): `presence: true, length: { minimum: 6 }, allow_nil: true` | `Validators.required`, `Validators.minLength(6)` | Surface both the controller's `"can't be empty"` message and any model length/format errors via the shared error list, matching `shared/_error_messages` |
| `password_confirmation` (edit/update) | `has_secure_password` confirmation validation — must equal `password` | Custom validator comparing against the `password` control value | Surfaced via the same shared error list |

## 6. JS/AJAX Behaviors → Angular Reactivity

None. Both `password_resets/new.html.erb` and `password_resets/edit.html.erb` use `form_with(..., local: true)`, i.e. plain full-page form submits — no `remote: true`, no `.js.erb` responses anywhere in this feature.

## 7. Styling

`app/assets/stylesheets/password_resets.scss` was read directly and contains only the Rails-generated placeholder comment (`// Place all the styles related to the PasswordResets controller here...`) — zero actual rules. This confirms graphify's sensitive-file detector flagged this file purely because its filename contains the substring "password"; it is an ordinary, empty, non-sensitive SCSS stub and requires no redaction or special handling.

Views use only shared Bootstrap classes already used elsewhere in the app: `row`, `col-md-6 col-md-offset-3`, `form-control`, `btn btn-primary`. Decision: no dedicated component SCSS file is needed for this feature — reuse whatever shared "centered auth form" layout component/class is established for Sessions/Users (Phase 2/Phase 1) rather than porting an empty stub forward.

## 8. Dependencies

- **Sessions (Phase 2, hard dependency):** `password_resets#update`'s success path calls `log_in @user` from `SessionsHelper` — a successful password reset logs the user straight into a session, with no separate login step. The Angular port must call whatever auth/session-establishment service Sessions defines (see `02-sessions.md` once written); this feature cannot be migrated meaningfully before that mechanism exists.
- **User model (`app/models/user.rb`):** `create_reset_digest`, `send_password_reset_email`, `password_reset_expired?`, `authenticated?(:reset, token)`, `activated?`, plus the `reset_digest`/`reset_sent_at` columns from `db/migrate/20190824013003_add_reset_to_users.rb`.
- **UserMailer (`app/mailers/user_mailer.rb`):** `password_reset(user)` action, rendered from `app/views/user_mailer/password_reset.html.erb` + `.text.erb`, delivered synchronously (`deliver_now`, no queue). The backend replacement needs an equivalent transactional-email trigger; Angular itself never sends mail.
- **GRAPH_REPORT.md god-node citation:** `PasswordResetsController` is the **#4 god node in the whole graph (10 edges)**, just behind `UsersController` (14) and `ApplicationController` (11). Per `graphify explain "PasswordResetsController"`, however, those 10 edges are almost entirely intra-file (`inherits` from `ApplicationController`, plus its own 5 action methods and 2 private filter methods, all `contains`/`method` edges back to the same source file) — not fan-out to unrelated controllers. So despite the raw edge count, actual cross-feature coupling is narrow: just `User` + `SessionsHelper` (Sessions) + `UserMailer`. Don't over-scope this migration step as touching many other features because of the god-node ranking alone.
- **Phase ordering:** must land after Phase 2 (Sessions), consistent with the prompt's stated phase plan (Phase 5).

## 9. Open Questions

- **Auth transport for the post-reset `log_in` call:** cookie+CSRF session (mirroring Rails' session-cookie model) vs. a JWT/token scheme — this is the same cross-cutting decision the Sessions spec must make. `password_resets#update` is the second place in the app (besides `sessions#create`) that establishes a session, so it must reuse whatever Sessions decides. Not resolved here by design.
- **The two vestigial bare routes** (`get 'password_resets/new'`, `get 'password_resets/edit'`) — confirm whether the Angular router needs equivalent duplicate routes for backward-compat link-following, or whether they're safe to drop as dead code during migration.
- **No rate limiting / abuse throttling** exists on `create` in the Rails source — any email address can trigger unlimited password-reset emails. Decide whether the migrated backend should add throttling or intentionally preserve current (tutorial-grade) behavior.
- **Token storage pattern:** `reset_token` is never persisted (it's a virtual `attr_accessor` on `User`, only alive long enough to email it and embed it in the URL; only its bcrypt `reset_digest` is stored). Confirm the new backend keeps this "never store the plaintext token" pattern rather than simplifying to a stored-token lookup.
- **Response payload shape for `edit`/`update`:** no JSON serializer exists in the Rails source (jbuilder is in the Gemfile but unused anywhere). Whether the API should echo `email` back in the response body vs. relying on the query-string round-trip (as Rails does via `hidden_field_tag :email`) is undecided.
