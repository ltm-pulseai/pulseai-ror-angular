# Feature Spec: Users

> Phase 2 (migrated together with Sessions — see `02-sessions.md`). Users and
> Sessions are circularly coupled: signup (`UsersController#create`) creates the
> `User` row that login (`SessionsController#create`) authenticates against, and
> nearly every action in this file is gated by `SessionsHelper#current_user` /
> `#logged_in?`. Read `02-sessions.md` alongside this file — several fields here
> (auth transport, `current_user` resolution) are decided once for both specs,
> not independently.

## 1. Routes

| Verb | Path | Controller#Action | Auth required? (before_action) |
|------|------|--------------------|----------------------------------|
| GET | `/signup` | `users#new` | No |
| POST | `/users` | `users#create` | No |
| GET | `/users` | `users#index` | Yes — `logged_in_user` |
| GET | `/users/:id` | `users#show` | No (public profile page) |
| GET | `/users/:id/edit` | `users#edit` | Yes — `logged_in_user`, `correct_user` |
| PATCH/PUT | `/users/:id` | `users#update` | Yes — `logged_in_user`, `correct_user` |
| DELETE | `/users/:id` | `users#destroy` | Yes — `logged_in_user`, `admin_user` |
| GET | `/users/:id/following` | `users#following` | Yes — `logged_in_user` |
| GET | `/users/:id/followers` | `users#followers` | Yes — `logged_in_user` |

Source: `config/routes.rb` — `get '/signup', to: 'users#new'` plus
`resources :users do member { get :following, :followers } end`.

## 2. Controller Actions

### `users#index`
- Params: `page` (pagination)
- Filters: `logged_in_user` — on failure calls `store_location` then redirects to
  `login_url` with `flash[:danger] = "Please log in."` (see `02-sessions.md` §2,
  `ApplicationController#logged_in_user`)
- Success: `@users = User.paginate(page: params[:page])`; renders `index`
- Failure: N/A — only failure mode is the filter redirect above
- Side effects: none

### `users#show`
- Params: `id`
- Filters: none (public)
- Success: `@user = User.find(params[:id])`; `@microposts = @user.microposts.paginate(page: params[:page])`; renders `show`
- Failure: `ActiveRecord::RecordNotFound` is not explicitly rescued here — falls through to Rails' default 404 page
- Side effects: none

### `users#new`
- Params: none
- Filters: none
- Success: `@user = User.new`; renders `new`
- Failure: n/a
- Side effects: none

### `users#create`
- Params: `user_params` = `params.require(:user).permit(:name, :email, :password, :password_confirmation)`
- Filters: none
- Success: `@user.save` succeeds → `@user.send_activation_email` (calls `UserMailer#account_activation`, `deliver_now`) → `flash[:info] = "Please check your email to activate your account."` → `redirect_to root_url`. **The user is NOT logged in at this point** — `User#activated` defaults false and `SessionsController#create` refuses login until activation (see `02-sessions.md`).
- Failure: `render 'new'` with `@user.errors` (422-equivalent)
- Side effects: creates a `User` row (`activated: false`, `activation_digest` set via `before_create :create_activation_digest`); sends one email

### `users#edit`
- Params: `id`
- Filters: `logged_in_user`, `correct_user` (`@user = User.find(params[:id]); redirect_to(root_url) unless current_user?(@user)` — enforces "only the owner may edit their own profile")
- Success: renders `edit`
- Failure: n/a
- Side effects: none

### `users#update`
- Params: `id` + `user_params` (password fields may be blank on update — `has_secure_password` treats a blank password as "leave unchanged")
- Filters: `logged_in_user`, `correct_user`
- Success: `@user.update(user_params)` → `flash[:success] = "Profile updated"` → `redirect_to @user`
- Failure: `render 'edit'` with `@user.errors`
- Side effects: none

### `users#destroy`
- Params: `id`
- Filters: `logged_in_user`, `admin_user` (`redirect_to(root_url) unless current_user.admin?`)
- Success: `User.find(params[:id]).destroy` → `flash[:success] = "User deleted"` → `redirect_to users_url`. Cascades: `has_many :microposts, dependent: :destroy` and both relationship associations (`active_relationships`, `passive_relationships`) `dependent: :destroy`.
- Failure: n/a (no explicit rescue)
- Side effects: destroys the user, all of their microposts, and every relationship row where they are follower or followed

### `users#following` / `users#followers`
- Params: `id`, `page`
- Filters: `logged_in_user`
- Success: `@title = "Following"`/`"Followers"`; `@user = User.find(params[:id])`; `@users = @user.following` (or `.followers`) `.paginate(page: params[:page])`; both render the shared `show_follow` template
- Failure: n/a
- Side effects: none

Private filters (defined in `UsersController`, `current_user`/`current_user?` come from `SessionsHelper` — see `02-sessions.md`):
- `correct_user`: `@user = User.find(params[:id]); redirect_to(root_url) unless current_user?(@user)`
- `admin_user`: `redirect_to(root_url) unless current_user.admin?`

## 3. Data Shape

Inferred from `app/models/user.rb` attributes/associations and what the views
actually read (no serializer exists — jbuilder is in the Gemfile but unused).
**Never expose** `password_digest`, `remember_digest`, `activation_digest`,
`activation_token`, `reset_digest`, `reset_token`, `reset_sent_at` — these stay
server-side only.

```json
{
  "user": {
    "id": 1,
    "name": "Example User",
    "email": "user@example.com",
    "admin": false,
    "activated": true,
    "createdAt": "2019-08-22T01:39:11Z",
    "gravatarUrl": "https://secure.gravatar.com/avatar/<md5-of-email>?s=80",
    "micropostsCount": 0,
    "followingCount": 0,
    "followersCount": 0,
    "isFollowedByCurrentUser": false
  },
  "microposts": [
    { "id": 1, "content": "...", "createdAt": "2019-08-22T01:39:11Z" }
  ],
  "pagination": { "page": 1, "perPage": 20, "totalPages": 5, "totalCount": 100 }
}
```

`email` should only be included in the payload for the current user's own
profile/edit request — the Rails views never render another user's email
anywhere (see Open Questions §2 re: gravatar hashing implications of this).

## 4. View → Component Decomposition

| ERB view/partial | Proposed Angular component | Type (page/shared) | Inputs | Outputs |
|-------------------|------------------------------|---------------------|--------|---------|
| `app/views/users/index.html.erb` | `UserListPageComponent` | page | route query param `page` | — |
| `app/views/users/_user.html.erb` | `UserListItemComponent` | shared | `user: UserSummary`, `currentUser: User \| null` | `delete: EventEmitter<number>` |
| `app/views/users/new.html.erb` | `SignupPageComponent` | page | — | — (navigates to home on success) |
| `app/views/users/edit.html.erb` | `EditProfilePageComponent` | page | route param `id` | — |
| `app/views/users/show.html.erb` | `UserProfilePageComponent` | page | route param `id` | — |
| `app/views/users/show_follow.html.erb` | `FollowListPageComponent` | page | route param `id` + route data `mode: 'following' \| 'followers'` | — |
| `app/views/users/_follow.html.erb`, `_follow_form.html.erb`, `_unfollow.html.erb` | `FollowButtonComponent` | shared | `user: User`, `isFollowing: boolean` | `followChange: EventEmitter<boolean>` |
| `app/views/shared/_stats.html.erb` | `UserStatsComponent` | shared | `user: User` | — |
| `app/views/shared/_error_messages.html.erb` | `FormErrorsComponent` | shared (reused by every form) | `errors: Record<string,string[]>` | — |
| `app/views/shared/_user_info.html.erb` | `CurrentUserInfoComponent` | shared | `currentUser` from `AuthService` (`02-sessions.md`) | — |
| `app/views/layouts/_header.html.erb` | `NavbarComponent` | shared, cross-feature | `isLoggedIn`/`currentUser` from `AuthService` (`02-sessions.md`) | `logout: EventEmitter<void>` |

## 5. Forms & Validations

Signup (`new.html.erb`) and edit-profile (`edit.html.erb`) share the same field
set, from `app/models/user.rb`:

| Field | Rails validation (model) | Angular reactive validator | Server error surfacing |
|-------|---------------------------|------------------------------|--------------------------|
| `name` | `presence: true`, `length: { maximum: 50 }` | `Validators.required`, `Validators.maxLength(50)` | 422 body `{errors:{name:[...]}}` + `FormErrorsComponent` summary |
| `email` | `presence: true`, `length: { maximum: 255 }`, `format: VALID_EMAIL_REGEX`, `uniqueness: true` (post-downcase) | `Validators.required`, `Validators.maxLength(255)`, `Validators.pattern(<translated regex>)` — uniqueness can only be checked server-side | 422 summary (e.g. "has already been taken") |
| `password` | `has_secure_password` + `validates :password, presence: true, length: { minimum: 6 }, allow_nil: true` (blank = "don't change" on update) | `Validators.required` on signup form only; on edit form, `Validators.minLength(6)` applied only when the field is non-empty | 422 summary |
| `password_confirmation` | must match `password` (via `has_secure_password`) | custom validator asserting equality with `password` control | 422 summary ("doesn't match Password") |

## 6. JS/AJAX Behaviors → Angular Reactivity

- **Follow/unfollow** (`_follow_form.html.erb`, `_unfollow.html.erb` — both `form_with(..., remote: true)`, posting to `RelationshipsController#create`/`#destroy`): Rails responds with `create.js.erb`/`destroy.js.erb`, which patch the DOM via jQuery — `$("#follow_form").html(...)` swaps the follow/unfollow partial and `$("#followers").html(...)` updates the follower count, with no page navigation. **Angular equivalent:** `FollowButtonComponent` calls a (future) `RelationshipsService.follow(userId)` / `.unfollow(relationshipId)`, then flips a local `isFollowing` signal and increments/decrements the `followersCount` signal on the profile — same "no navigation" UX, no DOM string-patching needed. Relationships is a later phase; this spec only anticipates the seam.
- **Delete confirmation** (`_user.html.erb`, admin-only delete link: `link_to "delete", user, method: :delete, data: { confirm: "You sure?" }` — Rails-UJS confirm dialog): **Angular equivalent:** a native `confirm()` or a `MatDialog` confirmation before calling `UsersService.deleteUser(id)`, then removing the item from the local list signal on success.
- No other `.js.erb` views exist under `app/views/users/` — everything else in this feature is a plain full-page form submit (`local: true` / default).

## 7. Styling

`app/assets/stylesheets/users.scss` is **empty** (only the default generated
comment — no custom Users-specific styles exist to port). Bootstrap 3 classes
in use across the Users views: `row`, `col-md-4`, `col-md-6`, `col-md-8`,
`col-md-offset-3`, `form-control`, `btn btn-primary`, `btn`, `dropdown`,
`dropdown-toggle`, `dropdown-menu`, `navbar*` (from the shared header, a
cross-feature dependency), `alert alert-danger` (from the shared error
partial), `gravatar`/`gravatar_edit` (custom classes with no scss backing
found — likely styled by the (out-of-scope) global `application.scss`, verify
during implementation). Decision needed on whether to keep Bootstrap 3 classes
as-is for this migration pass vs. replace with a new component library —
flagged lightly in Open Questions, not blocking.

## 8. Dependencies

- `User` is the **#1 god node** in the graph (37 edges — `graphify-out/GRAPH_REPORT.md` God Nodes). `graphify explain "User"` shows inbound `calls` edges from `SessionsController#create`, `UsersController` (index/show/new/create/edit/update/destroy), `PasswordResetsController`, `RelationshipsController`, `AccountActivationsController`, and `SessionsHelper#current_user` — i.e. essentially every controller in the app reaches into `User` directly. This is why Users/Sessions are a Phase-2 primitive, not a peer feature.
- `UsersController` is the **#2 god node** (14 edges). It depends on `SessionsHelper` (`current_user`, `current_user?`, `logged_in?`) and `ApplicationController`'s `logged_in_user` filter, both of which live in the Sessions feature — see `02-sessions.md`.
- Depends on the Phase-2 `AuthService` (from `02-sessions.md`) existing first/alongside: every gated action here (`index`, `edit`, `update`, `destroy`, `following`, `followers`) resolves through it.
- Depends on `UserMailer` (`account_activation`, `password_reset`) — out of scope for this phase's Angular work (mailers stay server-side), but `users#create` still triggers `send_activation_email` today, so the Angular `UsersService.signup()` call must expect that side effect to fire server-side.
- Depends on the `Relationship` model / a future `RelationshipsController` migration for the follow/unfollow behavior embedded in these views (`_follow_form`, `_unfollow`) — treated here as a not-yet-specified `RelationshipsService` seam.
- Depends on the `Micropost` model for the profile feed on `show.html.erb` — treated here as a not-yet-specified `MicropostsService` seam; full Microposts feature is a later phase.
- Requires the Phase 0 Angular shell (routing, HTTP client/interceptor scaffolding) to exist first.

## 9. Open Questions

1. **RESOLVED (user decision): Option A — cookie session + CSRF**, shared with `02-sessions.md` §9 (see there for the implementation details and end-to-end verification). `logged_in_user`/`correct_user`/`admin_user` remain Rails-side filters gating the HTML routes as before; the new `/api` JSON routes for this spec cover `create` (signup), `show`, `update`, `index` only — `destroy`, `following`, `followers` are deliberately deferred (see `reports/parity/users-sessions.md` once written).
2. **Gravatar hashing location.** Today `UsersHelper#gravatar_for` computes `MD5(email)` server-side and the raw email is never sent to the browser for anyone but the profile owner. If Angular computes the MD5 client-side instead, the API would need to expose every listed user's plaintext email — a new information disclosure not present in the current app. Recommend keeping the server-computed `gravatarUrl` field shown in §3 and never shipping other users' emails, but flagging since it's a contract decision, not a copy of an existing JSON shape.
3. **Bootstrap 3 class carryover vs. redesign** (§7) — non-blocking, but worth deciding once across all Phase-2+ specs rather than per-feature.

None of the above should be defaulted silently — confirm before `feature-migrate` runs against this spec.
