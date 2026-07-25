Rails.application.routes.draw do
  # Phase 7 (Cutover): Rails is now a pure JSON API — Angular (angular-app/)
  # is the only frontend. All HTML routes/views/turbolinks/webpacker have
  # been removed. destroy/following/followers were never migrated to
  # Angular (deferred in Phases 2/4) and are dropped here rather than kept
  # as Rails-only HTML pages (user decision, Phase 7).
  scope '/api', defaults: { format: :json } do
    post   'login',      to: 'sessions#create'
    delete 'logout',     to: 'sessions#destroy'
    get    'me',         to: 'sessions#me'
    get    'csrf_token',  to: 'application#csrf_token'
    resources :users, only: [:create, :show, :update, :index]
    # Feed is User#feed (union of followed + own posts), owned by
    # static_pages#home historically, not a Microposts index action.
    get 'feed', to: 'static_pages#home'
    resources :microposts, only: [:create, :destroy]
    # destroy is scoped to current_user's own relationships
    # (relationships_controller.rb) — the original Rails destroy had an
    # authorization gap here, intentionally fixed rather than preserved.
    resources :relationships, only: [:create, :destroy]
    # :id in password_resets edit/update and account_activations edit is
    # the raw reset/activation token.
    resources :password_resets, only: [:create, :edit, :update]
    resources :account_activations, only: [:edit]
  end
end
