# Feature Spec: Relationships

## 1. Routes

| Verb   | Path               | Controller#Action        | Auth required? (before_action) |
|--------|--------------------|----------------------------|-----------------------------------|
| POST   | /relationships     | relationships#create       | `logged_in_user`                   |
| DELETE | /relationships/:id | relationships#destroy      | `logged_in_user`                   |

Declared via `resources :relationships, only: [:create, :destroy]` in `config/routes.rb`. There is no `index`/`show` for relationships directly — the follower/following *lists* are served by `UsersController#following`/`#followers` (`GET /users/:id/following`, `GET /users/:id/followers`, both rendering `users/show_follow.html.erb`), which is Phase 2 (Users) territory, not this controller's. This spec covers only what `RelationshipsController` and its own views (`create.js.erb`/`destroy.js.erb`, the follow/unfollow partials) own — but section 6 and section 8 both need to describe how those Phase 2 views hook into this feature, since the follow button and the follower/following counts are physically rendered on the Users#show page.

## 2. Controller Actions

### `relationships#create`
- Params: `followed_id` (user id to follow — submitted as a *top-level* hidden field, not nested under `relationship[...]`; see `users/_follow_form.html.erb`: `hidden_field_tag :followed_id, @user.id`).
- Filters: `logged_in_user`.
- Success: `@user = User.find(params[:followed_id])`; `current_user.follow(@user)` (i.e. `current_user.following << @user`, an `ActiveRecord` `has_many :through` append which creates a `relationships` row with `follower_id = current_user.id, followed_id = @user.id`); then `respond_to { |format| format.html { redirect_to @user }; format.js }` — dual response format depending on request type.
- Failure: none handled explicitly — `User.find` raises `ActiveRecord::RecordNotFound` (uncaught, 404) if `followed_id` doesn't resolve to a user; `follow` has no idempotency guard against double-following (the DB's unique index on `[follower_id, followed_id]` would raise on a duplicate, uncaught).
- Side effects: creates one `relationships` row. No session/cookie/mailer side effects.

### `relationships#destroy`
- Params: `id` (the **relationship's** id, not the followed user's id — path is `/relationships/:id`).
- Filters: `logged_in_user`.
- Success: `@user = Relationship.find(params[:id]).followed`; `current_user.unfollow(@user)` (i.e. `current_user.following.delete(@user)`, deletes the join row); `respond_to { |format| format.html { redirect_to @user }; format.js }`.
- Failure: none handled explicitly — `Relationship.find` raises `ActiveRecord::RecordNotFound` (uncaught, 404) if the id doesn't exist; no check that the relationship being destroyed actually belongs to `current_user` (i.e. `current_user.unfollow(@user)` is called with whatever user `@user` resolves to, regardless of whose relationship row `params[:id]` pointed at — this is a real authorization gap in the source, flagged in section 9, not something to silently "fix" by inventing a different flow).
- Side effects: deletes one `relationships` row.

## 3. Data Shape

Inferred from `app/models/relationship.rb`, the `relationships` table in `db/schema.rb`, and the associations on `app/models/user.rb`. No serializer exists.

```json
{
  "id": 1,
  "follower_id": 1,
  "followed_id": 2,
  "created_at": "2026-07-24T12:00:00Z",
  "updated_at": "2026-07-24T12:00:00Z"
}
```

Derived, view-facing shapes actually consumed by the templates (not raw `relationships` rows):

```json
// follow-state for a single profile being viewed (drives users/_follow_form.html.erb)
{
  "viewedUserId": 2,
  "isFollowing": true,
  "relationshipId": 1,          // needed for the unfollow DELETE, since destroy keys on relationship id, not followed_id
  "followersCount": 42,
  "followingCount": 17           // both counts are of the CURRENT user in shared/_stats.html.erb's default (@user ||= current_user) case, or of the PROFILE user when _stats is rendered from users/show(_follow)
}
```

`User` associations backing this: `has_many :active_relationships` (as follower, `foreign_key: "follower_id"`), `has_many :passive_relationships` (as followed, `foreign_key: "followed_id"`), `has_many :following, through: :active_relationships, source: :followed`, `has_many :followers, through: :passive_relationships, source: :follower`. Helper methods: `User#follow(other_user)`, `#unfollow(other_user)`, `#following?(other_user)`.

## 4. View → Component Decomposition

| ERB view/partial | Proposed Angular component | Type (page/shared) | Inputs | Outputs |
|-------------------|------------------------------|---------------------|--------|---------|
| `app/views/users/_follow_form.html.erb` | `FollowButtonComponent` (unfollowed state) | shared | `profileUser: User` | `followed` (emits after successful POST) |
| `app/views/users/_unfollow.html.erb` | `FollowButtonComponent` (followed state) | shared | `profileUser: User`, `relationshipId: number` | `unfollowed` (emits after successful DELETE) |
| `app/views/users/_follow.html.erb` | (merged into `FollowButtonComponent`) | shared | n/a — this partial is just the `if/else` switch between follow/unfollow, replaced by an `@if (isFollowing())` branch inside one component | n/a |
| `app/views/shared/_stats.html.erb` | `StatsComponent` (shared with microposts spec, `specs/03-microposts.md` section 4) | shared | `user?: User` | none |
| `app/views/users/show_follow.html.erb` | `FollowListComponent` (used for both `/following` and `/followers`; Phase 2/Users territory — listed here only because it's the page that displays relationship data) | page | `title: string`, `users: User[]`, `profileUser: User` | none |

Recommend collapsing `_follow.html.erb` + `_follow_form.html.erb` + `_unfollow.html.erb` (three ERB partials that exist only because Rails' partial-swap AJAX pattern needs a separate file per DOM state) into a **single** `FollowButtonComponent` with an internal signal for follow-state — the three-way ERB split is an artifact of the `.js.erb` replace-by-partial-name mechanism (section 6), not a meaningful Angular component boundary.

## 5. Forms & Validations

| Field | Rails validation (model) | Angular reactive validator | Server error surfacing |
|-------|---------------------------|------------------------------|--------------------------|
| `follower_id` | `presence: true` (on `Relationship`) | N/A — set server-side from the authenticated user, never user-supplied in the Angular form | N/A (never fails from client input; would only fail if unauthenticated, which is already gated by route auth) |
| `followed_id` | `presence: true` (on `Relationship`) | N/A — set from the profile page's own route/context (the id of the user being viewed), not a free-text field the user fills in | If `followed_id` doesn't resolve to a real user, Rails currently 404s uncaught (see section 2) — the Angular API should return a structured 404/error instead of letting this surface as a generic failure |

There is no user-facing form validation UI at all for this feature in the Rails source — both forms (`_follow_form.html.erb`, `_unfollow.html.erb`) are single-button forms with one hidden/implicit id field; `shared/_error_messages` is not rendered by either. Nothing to port beyond "handle the 404/failure case gracefully," which the Rails version currently does not do.

## 6. JS/AJAX Behaviors → Angular Reactivity

This is the feature's core translation challenge — the jquery-ujs `remote: true` + `.js.erb` partial-replace pattern, described exactly as found:

**Rails/jquery-ujs pattern:**
1. `users/_follow_form.html.erb` and `users/_unfollow.html.erb` both use `form_with(..., remote: true)`. jquery-ujs intercepts the form submit, serializes it, and does an AJAX POST/DELETE with `Accept: text/javascript`, instead of a normal browser navigation.
2. Because the request's `Accept` header asks for JS, Rails' `respond_to` block picks `format.js`, which renders `app/views/relationships/create.js.erb` (for POST) or `destroy.js.erb` (for DELETE) instead of `format.html`'s `redirect_to @user`.
3. Each `.js.erb` template is literally a string of JavaScript, evaluated in the browser by jquery-ujs after the AJAX response returns:
   - `create.js.erb`:
     ```js
     $("#follow_form").html("<%= escape_javascript(render('users/unfollow')) %>");
     $("#followers").html('<%= @user.followers.count %>');
     ```
   - `destroy.js.erb`:
     ```js
     $("#follow_form").html("<%= escape_javascript(render('users/follow')) %>");
     $("#followers").html('<%= @user.followers.count %>');
     ```
   In both cases: the server re-renders the *opposite-state* partial as an HTML string server-side, escapes it for JS-string embedding, and the client does a raw DOM replace of `#follow_form`'s `innerHTML` — plus a second raw DOM replace of `#followers`' text content with a freshly-computed count. This is a full server round-trip that re-renders HTML on every click; there is no client-side state at all, the DOM literally holds the only copy of "am I following this user" (encoded as *which partial is currently in `#follow_form`*).
   - The `id="follow_form"` container comes from `users/_follow.html.erb`; the `id="followers"` element comes from `shared/_stats.html.erb`'s `<strong id="followers" class="stat">`.

**Angular equivalent (no DOM string replacement, signal-driven):**
- A single `FollowButtonComponent` holds `isFollowing = signal<boolean>(initialValue)` and `followersCount = signal<number>(initialCount)` (or these live in a shared `RelationshipsService`/`UserProfileStore` if `StatsComponent` and `FollowButtonComponent` are siblings needing the same counts, which they are on every page this renders).
- Click handler: optimistically flips `isFollowing.set(true)` (or `false`) and increments/decrements `followersCount` immediately for a snappy UI, fires `POST /relationships { followedId }` (or `DELETE /relationships/:relationshipId`) in the background, and rolls the signal back + shows an error toast if the request fails.
- No template is ever re-rendered server-side and shipped down as an HTML string; the button's label and the counter's number are just computed from the signals via Angular's own change detection (`@if (isFollowing()) { ... } @else { ... }`), not by swapping which chunk of markup is physically present.
- This explicitly is **not** a Stimulus/Hotwire-style turbo-stream/frame replacement (the app predates both) and should not be modeled as one — it's plain signal state + an HTTP call, the same pattern as any other Angular mutation.
- Follow-up detail: because `destroy` currently keys off `relationship.id` (not `followed_id`), the Angular service needs the current profile's `relationshipId` available before it can unfollow — either returned by whatever endpoint loads the profile page, or by the `create` response echoing back the new relationship's id so a freshly-followed button knows its own id for a subsequent unfollow without a page reload.

## 7. Styling

`app/assets/stylesheets/relationships.scss` is an empty stub (just the scaffold comment, no rules) — nothing to port. The actual visual styling for the follow button/list (`.users.follow`, `.user_avatars`, `.stats`/`.stat` from `shared/_stats.html.erb`) lives in the site-wide stylesheet, not this feature's own file. Bootstrap classes in direct use: `btn btn-primary` (follow button), `btn` (unfollow button, no color modifier — visually a plain/default button, worth confirming intentional vs. an oversight when the button is rebuilt in Angular).

## 8. Dependencies

- **Phase 2 (`current_user` + `Users#show`)**: every relationship action requires `logged_in_user`; the follow button itself is rendered by `users/show.html.erb` (`render 'follow_form' if logged_in?`) — a Phase 2 page. This spec's `FollowButtonComponent` must be embedded into whatever `UserProfileComponent` Phase 2 already specified; verify `specs/02-users.md` accounts for a slot/composition point for it.
- **`User#follow`/`#unfollow`/`#following?`/`#following`/`#followers`** (model methods + associations on `app/models/user.rb`) — this feature has no model of its own beyond the thin `Relationship` join model; all business logic lives on `User`.
- **`UsersController#following`/`#followers`** (Phase 2) render the actual follower/following list pages (`users/show_follow.html.erb`) — this controller has no index action of its own; don't duplicate that list-rendering logic here.
- Per `GRAPH_REPORT.md`, `RelationshipsController` sits in **Community 3 ("Models Relationship Test")** alongside `ApplicationRecord`, `Micropost`, `Relationship`, and its own test — i.e. graphify's community detection ties this feature to the `Micropost` model in the same cluster (both are simple `belongs_to`-heavy models hanging off `User`), not to `UsersController` directly, even though the UI is embedded in a Users page. Note this as a "surprising" grouping worth being aware of, not a red flag.
- `RelationshipsController` has 4 edges in the God Nodes list (rank 10, least-connected of the ten listed) — genuinely a small, self-contained controller; the complexity in this feature is entirely in the AJAX-to-signals translation (section 6), not in the Ruby logic itself.
- **`will_paginate`** (shared dependency with microposts, `specs/03-microposts.md` section 8) — the follower/following list pages paginate via the same gem.

## 9. Open Questions

- **The `destroy` authorization gap**: `relationships#destroy` calls `current_user.unfollow(@user)` where `@user = Relationship.find(params[:id]).followed` — it never verifies that `Relationship.find(params[:id]).follower_id == current_user.id`. As written, an authenticated user can pass any relationship id and unfollow *that relationship's followed user on their own behalf* (since `unfollow` operates on `current_user.following.delete(@user)`, the actual DB row deleted is `current_user`'s own relationship-with-that-user, if one exists — so the practical exploit is limited to "make me unfollow X" using X's relationship id from someone else's page, which likely no-ops harmlessly since `following.delete` on a non-present association is a no-op). Confirm whether to preserve this exact behavior (using `followed_id` instead of a relationship id, so the DELETE body more resembles the create's `followed_id` param) or intentionally fix it in the Angular-facing API's contract — this is a behavior *change* decision, not something to default silently.
- **Response format duality (`format.html`/`format.js`)**: the Angular migration presumably always talks JSON to an API, never HTML or `.js.erb`. Confirm the future API's `create`/`destroy` endpoints should simply return the updated relationship/follow-state JSON (as assumed in section 3) rather than trying to preserve Rails' `respond_to` branching in any form.
- **No duplicate-follow guard surfaced to the user**: the DB has a unique index on `[follower_id, followed_id]`, but neither `User#follow` nor the controller catches the resulting `ActiveRecord::RecordNotUnique`/validation failure — a double-click race on the follow button today would 500. Decide whether the Angular optimistic-update flow (section 6) should add a guard (e.g. disable the button while a request is in-flight) that the Rails version never had, or replicate the fragility.
- **Auth transport** (cookie+CSRF vs JWT) — same cross-cutting item flagged in `specs/03-microposts.md` section 9; relevant here too since every follow/unfollow click becomes its own authenticated API call.
