# Feature Spec: Microposts

## 1. Routes

| Verb   | Path            | Controller#Action     | Auth required? (before_action)                          |
|--------|-----------------|------------------------|-----------------------------------------------------------|
| POST   | /microposts     | microposts#create      | `logged_in_user`                                           |
| DELETE | /microposts/:id | microposts#destroy     | `logged_in_user`, then `correct_user` (scopes lookup to `current_user.microposts`) |

Declared via `resources :microposts, only: [:create, :destroy]` in `config/routes.rb` — there is no index/show/new/edit route; the feed itself is rendered by `StaticPagesController#home` (Phase 1/2 territory) and `UsersController#show` (Phase 2), not by this controller. This spec covers only what `MicropostsController` and its views own.

## 2. Controller Actions

### `microposts#create`
- Params: `micropost[content]` (string, required), `micropost[image]` (uploaded file, optional) — via `micropost_params = params.require(:micropost).permit(:content, :image)`.
- Filters: `logged_in_user` (redirects to `login_url` with flash `:danger` "Please log in." if not authenticated; also calls `store_location`).
- Success: `@micropost = current_user.microposts.build(micropost_params)`; `@micropost.image.attach(params[:micropost][:image])` (attach happens unconditionally, even when no file was chosen — Active Storage no-ops on a nil param); if `@micropost.save` succeeds, `flash[:success] = "Micropost created!"` and `redirect_to root_url`.
- Failure: no flash is set; controller re-derives `@feed_items = current_user.feed.paginate(page: params[:page])` and does `render 'static_pages/home'` — i.e. on validation failure the home page re-renders with the failed `@micropost` object still holding its errors, which `shared/_micropost_form.html.erb` displays via `shared/_error_messages` bound to `f.object`.
- Side effects: creates a `microposts` row + (conditionally) an `active_storage_blobs`/`active_storage_attachments` row pair. No session/cookie/mailer side effects.

### `microposts#destroy`
- Params: `id` (micropost id, from path).
- Filters: `logged_in_user`; `correct_user` — sets `@micropost = current_user.microposts.find_by(id: params[:id])` (scoped to the current user's own microposts, i.e. this doubles as the authorization check) and `redirect_to root_url` if nil (silently — no flash on this failure path).
- Success: `@micropost.destroy` (Active Storage attachment + blob are purged automatically as part of Rails' dependent-destroy behavior for `has_one_attached`); `flash[:success] = "Micropost deleted"`; `redirect_to request.referrer || root_url`.
- Failure: implicit — `correct_user` already redirected away before `destroy` runs if the micropost didn't belong to `current_user` or didn't exist.
- Side effects: deletes the `microposts` row and its attached image (blob + variant records), if any.

## 3. Data Shape

Inferred from `app/models/micropost.rb`, the `microposts`/`active_storage_*` tables in `db/schema.rb`, and what the views read (`micropost.content`, `micropost.user`, `micropost.image`, `micropost.display_image`, `micropost.created_at`). No serializer exists.

```json
{
  "id": 1,
  "content": "string, max 140 chars",
  "user_id": 1,
  "created_at": "2026-07-24T12:00:00Z",
  "updated_at": "2026-07-24T12:00:00Z",
  "user": {
    "id": 1,
    "name": "Example User",
    "email": "user@example.com"
  },
  "image": {
    "attached": true,
    "url": "https://.../rails/active_storage/representations/.../image.jpg",
    "content_type": "image/jpeg"
  }
}
```

Notes for the API layer this spec assumes (not yet built — flagged in section 9):
- `image` is Active Storage's `has_one_attached :image`; `display_image` returns a 500x500 `resize_to_limit` variant. The Angular-facing API must expose a resolved, publicly fetchable URL for the variant (or the original) rather than the internal Active Storage attachment/blob rows.
- `Micropost.default_scope { order(created_at: :desc) }` — newest-first is a model-level default, not something the controller applies explicitly. The Angular API layer must replicate this ordering.
- The feed itself (`User#feed`) is a SQL union: microposts belonging to users the current user follows, OR belonging to the current user — this method lives on `User`, not `Micropost`, and is what `static_pages#home` and `microposts#create`'s failure path both call.

## 4. View → Component Decomposition

| ERB view/partial | Proposed Angular component | Type (page/shared) | Inputs | Outputs |
|-------------------|------------------------------|---------------------|--------|---------|
| `app/views/static_pages/home.html.erb` | `HomeComponent` | page | none (reads current-user state from an injected auth/session service) | none |
| `app/views/shared/_micropost_form.html.erb` | `MicropostFormComponent` | shared | none (posts on behalf of the injected current user) | `created` (emits the new `Micropost` on successful POST, so the parent feed can prepend it) |
| `app/views/shared/_feed.html.erb` | `MicropostFeedComponent` | shared | `feedItems: Micropost[]` (or a signal-backed resource fetched internally via a `MicropostsService`), `page: number` | `pageChange` (emits requested page number to re-fetch) |
| `app/views/microposts/_micropost.html.erb` | `MicropostItemComponent` | shared | `micropost: Micropost` | `deleted` (emits the micropost id after a confirmed, successful DELETE) |
| `app/views/shared/_stats.html.erb` | `StatsComponent` | shared | `user?: User` (defaults to current user, same as the ERB's `@user ||= current_user`) | none |

`StatsComponent` displays `following`/`followers` counts — those counts and their links (`following_user_path`/`followers_user_path`) are functionally owned by the **relationships** feature (see `specs/04-relationships.md`), not microposts. It is included here only because `home.html.erb` renders it alongside the micropost form/feed; do not duplicate its implementation — reference the same component from both pages.

## 5. Forms & Validations

| Field | Rails validation (model) | Angular reactive validator | Server error surfacing |
|-------|---------------------------|------------------------------|--------------------------|
| `content` | `presence: true`, `length: { maximum: 140 }` | `Validators.required`, `Validators.maxLength(140)` | Map `errors.full_messages` (e.g. "Content can't be blank", "Content is too long (maximum is 140 characters)") 1:1 into a form-level error list, mirroring `shared/_error_messages.html.erb`'s "The form contains N error(s)" banner + bulleted list |
| `image` | `content_type: { in: %w[image/jpeg image/gif image/png] }` (via `active_storage_validations` gem) | Client-side `accept="image/jpeg,image/gif,image/png"` on the file input (advisory only) + a custom validator checking `File.type` against the same allow-list before submit | Same `errors.full_messages` list surfaces "Image must be a valid image format" if the server-side check fails |
| `image` | `size: { less_than: 5.megabytes }` (via `active_storage_validations` gem) | Custom validator on file size, replicating the existing inline `<script>` in `_micropost_form.html.erb` that already blocks selection client-side (`this.files[0].size/1024/1024 > 5` → `alert(...)` + clears the input) — port this to a synchronous Angular validator instead of a raw jQuery `$("#micropost_image").bind("change", ...)` handler | Same list surfaces "Image should be less than 5MB" if a request still slips through (e.g. client JS disabled) |

The whole form's error block corresponds 1:1 to `shared/_error_messages.html.erb`, which is generic (bound to any `object`) — reuse a single `FormErrorsComponent` across every form in the app rather than rebuilding this per-feature.

## 6. JS/AJAX Behaviors → Angular Reactivity

None from `MicropostsController` itself — both `create` and `destroy` are plain full-page-redirect actions (no `.js.erb` views, no `remote: true` on the delete link's `link_to ... method: :delete`, which relies on jquery-ujs's UJS data-method rewriting + a `data-confirm` browser `confirm()` dialog, not an AJAX partial swap).

The only client-side JS in this feature is the inline `<script>` in `shared/_micropost_form.html.erb` that validates file size on `change` before submit (see section 5) — this becomes a plain Angular reactive-form validator/signal, no DOM manipulation needed.

Angular equivalent for the delete action's `data: { confirm: "You sure?" }` behavior: a `confirm()` call (or a proper modal) in `MicropostItemComponent`'s delete handler before firing the DELETE request; on success, emit `deleted` so `MicropostFeedComponent` removes the item from its signal-backed list rather than doing a full page reload.

## 7. Styling

`app/assets/stylesheets/microposts.scss` is an empty stub (just the scaffold comment, no rules) — nothing to port. All actual micropost visual styling (the `<li>`/`.content`/`.timestamp`/`.gravatar` rules, the `ol.microposts` list, `.user_avatars`) lives in the site-wide `custom.scss`/`_variables.scss` and Bootstrap, outside this feature's own stylesheet — treat those as shared theme concerns, not something to re-derive per-component here. Bootstrap classes in use directly in these views: `btn btn-primary` (submit button) — keep as-is if Bootstrap (or an equivalent utility set) continues to be used in Angular, otherwise map to whatever design-system button component replaces it.

## 8. Dependencies

- **Phase 2 (`current_user`)**: both actions require an authenticated user (`logged_in_user` before_action, backed by `SessionsHelper#current_user`/`#logged_in?`). This spec assumes Phase 2 has already produced an Angular auth/session service exposing the equivalent of `current_user` and `logged_in?` as signals.
- **`User#feed`, `User#microposts`, `User#following`/`#followers`** (model methods on `app/models/user.rb`) — the feed query itself depends on the relationships table (Phase 4) even though `MicropostsController` doesn't touch `RelationshipsController` directly; `GRAPH_REPORT.md`'s community detection groups `MicropostsController` into Community 1 ("Helpers Sessions Helper") alongside `ApplicationController`/`SessionsController`/`StaticPagesController` — i.e. graphify sees this feature as coupled to the auth/session layer, not to relationships, even though the feed query itself unions in followed users' posts.
- **Active Storage** (`has_one_attached :image`, `active_storage_attachments`/`active_storage_blobs` tables, `image_processing`/`mini_magick`/`active_storage_validations` gems) — the Angular/API layer needs an equivalent file-upload + variant-resize backend; this is not optional infrastructure, it's load-bearing for the image feature of every micropost.
- **`will_paginate`/`bootstrap-will_paginate`** gems — pagination on the feed (`shared/_feed.html.erb`) needs an Angular-side pager component and an API that accepts/returns page metadata (current page, total pages/count) equivalent to what `will_paginate` derives.
- **`static_pages#home` and `users#show`** (Phase 2/1 territory) are the two pages that actually render micropost feeds; `MicropostsController` itself has no index/show action. Confirm those specs account for embedding `MicropostFeedComponent`/`MicropostFormComponent`.
- Per `GRAPH_REPORT.md` God Nodes list, `MicropostsController` has 6 edges (rank 6) — not a cross-cutting hub itself, but its parent `ApplicationController` (11 edges, rank 3) and `User` (37 edges, rank 1) are — no surprising/hidden couplings beyond the ones already listed above.

## 9. Open Questions

- **Image delivery contract**: Active Storage's variant/blob model doesn't map directly onto a typical REST JSON API. Someone needs to decide whether the future Angular-facing backend exposes signed, publicly-fetchable URLs per micropost (simplest for Angular `<img>` tags) or requires an authenticated blob-download proxy endpoint. This governs the `image` shape in section 3 and isn't decidable from the Rails source alone.
- **Pagination contract**: `will_paginate` produces page links server-side rendered as HTML in Rails. The Angular API needs an explicit page-size/page-number/total-count JSON contract (not yet defined anywhere in this codebase) for `MicropostFeedComponent`'s pager — needs a human decision on page size (Rails' default of 30/page from `will_paginate` may or may not be the desired default going forward).
- **Auth transport** (cookie+CSRF session vs JWT/bearer token) for the future API backing `create`/`destroy` — this is a cross-cutting decision that also affects Phase 2's spec; flagging here since microposts is the first feature in this spec set to need a multipart/file-upload POST, which interacts differently with CSRF-token vs bearer-token auth schemes.
- **Client-side file-size/type validation duplication**: should the Angular validator be considered a UX nicety only (with the real enforcement server-side, as today), or does the future API need to reject early enough that no image bytes are ever uploaded for an oversized file? The current Rails app already blocks selection client-side via the inline script, but a user with JS disabled would upload and then fail server-side validation from `active_storage_validations` — not resolved either way in the existing code, so no default should be assumed here.
