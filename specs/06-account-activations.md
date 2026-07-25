# Feature Spec: AccountActivations

## 1. Routes

| Verb | Path | Controller#Action | Auth required? (before_action) |
|------|------|--------------------|----------------------------------|
| GET | `/account_activations/:id/edit` | `account_activations#edit` | No login required (no `before_action` declared at all); access is instead gated entirely inline inside the action by `user && !user.activated? && user.authenticated?(:activation, params[:id])` |

Confirmed directly from `routes.rb`: `resources :account_activations, only: [:edit]` — this is the *only* route this feature exposes. There is no `new`, `create`, `update`, `destroy`, or index — the controller (`app/controllers/account_activations_controller.rb`) likewise defines exactly one method, `edit`, and no `before_action` filters.

## 2. Controller Actions

### `account_activations#edit`
- Params: `id` (the raw activation token, path param), `email` (query param, e.g. `?email=user%40example.com`)
- Filters: none
- Success: `user = User.find_by(email: params[:email])`; if `user && !user.activated? && user.authenticated?(:activation, params[:id])` → `user.activate` (sets `activated = true`, `activated_at = Time.zone.now`) → `log_in user` (via `SessionsHelper`) → `flash[:success] = "Account activated!"` → `redirect_to user` (the user's show page)
- Failure: any of (user not found / already activated / token mismatch) → `flash[:danger] = "Invalid activation link"` → `redirect_to root_url`
- Side effects: mutates `activated`/`activated_at` on the `User` row; establishes a session via `log_in` — the same session-creation call used by `password_resets#update` and `sessions#create`

Both branches of this single action always end in a `redirect_to` — there is no `render` anywhere in this controller.

## 3. Data Shape

Inferred from `User` model attributes (`app/models/user.rb`) and `db/migrate/20190823175841_add_activation_to_users.rb` (adds `activation_digest:string`, `activated:boolean default:false`, `activated_at:datetime`). No serializer/jbuilder view exists for this feature — this is action-driven inference, since there is no HTML view to read field usage from (see Section 4).

```json
{
  "accountActivationEditContext": {
    "token": "string (path param, matched against bcrypt activation_digest, never stored in plaintext)",
    "email": "string (query param, used to look up the user)"
  },
  "accountActivationResult": {
    "success": {
      "activated": true,
      "redirectTo": "/users/:id",
      "message": "Account activated!"
    },
    "failure": {
      "activated": false,
      "redirectTo": "/",
      "message": "Invalid activation link"
    }
  },
  "userReferenceFields": {
    "email": "string, present, max 255, format VALID_EMAIL_REGEX, unique, downcased before save",
    "activationDigest": "string | null — bcrypt hash of activation_token, set in User's before_create :create_activation_digest at signup time, never exposed to client",
    "activated": "boolean, default false — flips to true on successful activation",
    "activatedAt": "datetime | null — set to now on activation"
  }
}
```

There is no persisted, resendable `activation_token` — it is a virtual `attr_accessor` on `User`, generated once in `before_create :create_activation_digest` at signup and emailed immediately; this codebase has no "resend activation email" endpoint.

## 4. View → Component Decomposition

| ERB view/partial | Proposed Angular component | Type (page/shared) | Inputs | Outputs |
|-------------------|------------------------------|---------------------|--------|---------|
| None | None | None | None | None |

Confirmed by directory listing: `app/views/account_activations/` does not exist at all in the Rails source. This is expected and by design — `edit` is a mailer-link-triggered, redirect-only flow: every code path calls `redirect_to` (to the activated user's show page, or to `root_url` on failure), so Rails never renders an `account_activations` template.

Proposed Angular equivalent (not a 1:1 ERB port, since there's no ERB to port): a thin `AccountActivationComponent` (or a route resolver/guard) bound to a route like `/account_activations/:token/edit`, whose only job on `ngOnInit` is to fire the activation API call using the route param + query-string `email`, show a brief success/failure toast matching the `flash[:success]`/`flash[:danger]` copy above, and immediately navigate to the user's page or to root — no persistent view needs to render in between.

## 5. Forms & Validations

| Field | Rails validation (model) | Angular reactive validator | Server error surfacing |
|-------|---------------------------|------------------------------|--------------------------|
| None | None | None | None |

There is no user-submitted form in this feature — the only inputs are the `token` (path) and `email` (query string) that arrive pre-filled from the link in the activation email; the user takes no typed input, they simply click the link.

## 6. JS/AJAX Behaviors → Angular Reactivity

None. There are no `.js.erb` files and no `remote: true` forms anywhere in this feature (it has no forms at all).

## 7. Styling

`app/assets/stylesheets/account_activations.scss` was read directly and contains only the Rails-generated placeholder comment (`// Place all the styles related to the AccountActivations controller here...`) — zero actual rules, identical in structure to the `password_resets.scss` stub. No dedicated styling is needed for the Angular port since this feature has no persistent view to style — a redirect/toast-only flow at most needs whatever shared toast/flash-banner styling the app already establishes elsewhere.

## 8. Dependencies

- **Sessions (Phase 2, hard dependency):** the success path calls `log_in user` from `SessionsHelper` — identical mechanism to `password_resets#update` and `sessions#create`. The Angular port must reuse whichever auth/session-establishment service Sessions defines.
- **UserMailer (shared with PasswordResets, Phase 5):** the activation email itself is sent by `User#send_activation_email` (`UserMailer.account_activation(self).deliver_now`), rendered from `app/views/user_mailer/account_activation.html.erb` + `.text.erb`. This is the *same* `UserMailer` class used by `password_resets` (`app/mailers/user_mailer.rb` defines both `account_activation` and `password_reset`), so the Phase 5 UserMailer/transactional-email port should already cover this feature's mailer needs.
- **Users / signup flow (upstream trigger):** `send_activation_email` is called from `UsersController#create` (confirmed via grep on `app/controllers/users_controller.rb:23`) — i.e., account activation is kicked off at signup, not by this feature's own controller. This feature only handles the *inbound* link click; the *outbound* email trigger belongs to the Users spec.
- **User model (`app/models/user.rb`):** `activate`, `authenticated?(:activation, token)`, plus the `activation_digest`/`activated`/`activated_at` columns from `db/migrate/20190823175841_add_activation_to_users.rb`, and `create_activation_digest` (private, called from `before_create` at signup).
- **Graph confirmation of "simplest and least-used" status:** `graphify explain "AccountActivationsController"` returns only **3 edges** (`inherits` from `ApplicationController`, its own `edit` method, and the file-level `contains` edge) — versus `PasswordResetsController`'s 10 edges. It doesn't even appear in the GRAPH_REPORT.md god-node top 10. It's grouped into Community 1 ("Helpers Sessions Helper"), alongside `ApplicationController`, `SessionsController`, `MicropostsController`, `StaticPagesController` — i.e. it's folded into the general controller/session community rather than forming its own, reflecting how thin its footprint is. This corroborates the prompt's framing of it as the simplest, least-connected auth-adjacent flow.
- **Phase ordering:** must land after Phase 2 (Sessions, for `log_in`) and depends on the Users signup flow already existing to trigger the email in the first place — consistent with migrating it last (Phase 6), after Password Resets (Phase 5).

## 9. Open Questions

- **Auth transport for the `log_in` call on activation:** same cross-cutting cookie+CSRF-vs-JWT question flagged in `05-password-resets.md` — this is the third place in the app (after `sessions#create` and `password_resets#update`) that establishes a session. Must resolve identically across all three; not decided here.
- **No "resend activation email" capability exists** in the Rails source — if a user's activation link expires or is lost (there is no expiry check here, unlike password resets, but the email could simply be deleted/lost), there is no self-service way to get a new one short of re-signing-up. Decide whether the Angular/API migration should add a resend endpoint or intentionally preserve current (tutorial-grade) behavior.
- **No dedicated response contract exists** (no jbuilder/serializer, no view) — the "success"/"failure" JSON shape proposed in Section 3 is inferred purely from the two `redirect_to` branches, not copied from an existing contract. Confirm the actual API response shape with whoever owns the new backend before implementing.
- **Route/component design for a view-less feature:** since there's no ERB view to translate 1:1, whether this becomes its own routed component vs. folding into a shared "auth-link handler" component (potentially shared with password-reset's `edit` token-validation logic, which has a similar shape) is a design choice not dictated by the Rails source. Flagged for a human call before `feature-migrate` runs.
