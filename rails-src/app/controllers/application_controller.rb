class ApplicationController < ActionController::Base
  include SessionsHelper

  # Phase 7 (Cutover): JSON-only API — an unrescued RecordNotFound would
  # otherwise fall through to Rails' default HTML error page, which has no
  # place in an API-only backend.
  rescue_from ActiveRecord::RecordNotFound do
    render json: { error: "Not found" }, status: :not_found
  end

  # Phase 2 JSON API (Angular): exposes the current CSRF token so the SPA can
  # attach it as X-CSRF-Token on mutating requests. GET is exempt from Rails'
  # forgery check by default, so no protect_from_forgery change is needed.
  def csrf_token
    render json: { csrfToken: form_authenticity_token }
  end

  private

    # Confirms a logged-in user. Phase 7 (Cutover): format-aware — the
    # original always redirected, which made no sense for a JSON caller
    # (this was a documented gap since Phase 2, closed here since Rails is
    # now JSON-only and this is the only response format that exists).
    def logged_in_user
      unless logged_in?
        respond_to do |format|
          format.html { store_location; flash[:danger] = "Please log in."; redirect_to login_url }
          format.json { render json: { error: "Please log in." }, status: :unauthorized }
        end
      end
    end

    # JSON shape for a User, per specs/02-users.md section 3. Never includes
    # password_digest/remember_digest/activation_*/reset_* — email is only
    # included when the viewer is the user themself (section 3 + Open
    # Question 2: gravatar stays server-computed so other users' emails are
    # never shipped to the browser).
    def user_json(user, viewer: current_user)
      json = {
        id: user.id,
        name: user.name,
        admin: user.admin,
        activated: user.activated,
        createdAt: user.created_at.iso8601,
        gravatarUrl: gravatar_url_for(user),
        micropostsCount: user.microposts.count,
        followingCount: user.following.count,
        followersCount: user.followers.count,
        isFollowedByCurrentUser: viewer && viewer != user ? viewer.following?(user) : false
      }
      json[:email] = user.email if viewer == user
      if viewer && viewer != user
        relationship = viewer.active_relationships.find_by(followed_id: user.id)
        json[:relationshipId] = relationship&.id
      end
      json
    end

    def gravatar_url_for(user, size: 80)
      gravatar_id = Digest::MD5.hexdigest(user.email.downcase)
      "https://secure.gravatar.com/avatar/#{gravatar_id}?s=#{size}"
    end

    def pagination_json(collection)
      {
        page: collection.current_page,
        perPage: collection.per_page,
        totalPages: collection.total_pages,
        totalCount: collection.total_entries
      }
    end

    # JSON shape for a Micropost, per specs/03-microposts.md section 3.
    def micropost_json(micropost)
      json = {
        id: micropost.id,
        content: micropost.content,
        userId: micropost.user_id,
        createdAt: micropost.created_at.iso8601,
        user: { id: micropost.user.id, name: micropost.user.name }
      }
      json[:image] = if micropost.image.attached?
        {
          attached: true,
          url: Rails.application.routes.url_helpers.rails_representation_path(micropost.display_image, only_path: true),
          contentType: micropost.image.content_type
        }
      else
        { attached: false }
      end
      json
    end

    # Follow-state shape for a profile being viewed, per
    # specs/04-relationships.md section 3. relationship_id is nil when not
    # following (there's no relationship row to reference).
    def follow_state_json(viewed_user, relationship_id: nil)
      {
        viewedUserId: viewed_user.id,
        isFollowing: relationship_id.present? || current_user.following?(viewed_user),
        relationshipId: relationship_id,
        followersCount: viewed_user.followers.count,
        followingCount: current_user.following.count
      }
    end
end
