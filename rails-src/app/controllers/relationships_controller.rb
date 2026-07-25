class RelationshipsController < ApplicationController
  before_action :logged_in_user

  # Phase 7 (Cutover): JSON-only — the format.js branch (create.js.erb/
  # destroy.js.erb, jquery-ujs DOM-swap) is gone along with those views.
  def create
    @user = User.find(params[:followed_id])
    # Duplicate-follow guard (specs/04-relationships.md Open Question 3):
    # the original Rails action had none — a double-click race would 500 on
    # the DB's unique index. Idempotent here: following an already-followed
    # user just returns the current state instead of erroring.
    current_user.follow(@user) unless current_user.following?(@user)
    relationship = current_user.active_relationships.find_by(followed_id: @user.id)
    render json: follow_state_json(@user, relationship_id: relationship&.id)
  end

  def destroy
    # Authorization fix (specs/04-relationships.md Open Question 1): the
    # original Rails action did `Relationship.find(params[:id]).followed`
    # unscoped, never checking the relationship belonged to current_user.
    # Scoped to current_user.active_relationships so a relationship id
    # cannot be used to affect anyone else's follow state.
    relationship = current_user.active_relationships.find(params[:id])
    @user = relationship.followed
    current_user.unfollow(@user)
    render json: follow_state_json(@user, relationship_id: nil)
  end
end
