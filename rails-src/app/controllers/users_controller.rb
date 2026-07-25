class UsersController < ApplicationController
  before_action :logged_in_user, only: [:index, :update]
  before_action :correct_user,   only: :update

  # Phase 7 (Cutover): JSON-only. new/edit actions removed (dead — no route,
  # no HTML view; Angular's SignupComponent/EditComponent render their own
  # forms, EditComponent prefills via GET show, not a server "edit" call).
  # destroy/following/followers dropped entirely — never migrated to
  # Angular (deferred in Phases 2/4), no consumer exists, and their views
  # are gone (user decision, Phase 7).
  def index
    users = User.paginate(page: params[:page])
    render json: { users: users.map { |u| user_json(u) }, pagination: pagination_json(users) }
  end

  def show
    user = User.find(params[:id])
    microposts = user.microposts.paginate(page: params[:page])
    render json: {
      user: user_json(user),
      microposts: microposts.map { |m| { id: m.id, content: m.content, createdAt: m.created_at.iso8601 } },
      pagination: pagination_json(microposts)
    }
  end

  def create
    user = User.new(user_params)
    if user.save
      user.send_activation_email
      # Not logged in on signup — User#activated defaults false and
      # sessions#create refuses login until activation (specs/02-users.md §2).
      render json: { message: "Please check your email to activate your account." }, status: :created
    else
      render json: { errors: user.errors }, status: :unprocessable_entity
    end
  end

  def update
    if @user.update(user_params)
      render json: { user: user_json(@user) }
    else
      render json: { errors: @user.errors }, status: :unprocessable_entity
    end
  end

  private

    def user_params
      params.require(:user).permit(:name, :email, :password, :password_confirmation)
    end

    # Confirms the correct user. Phase 7: format-aware (JSON-only now).
    def correct_user
      @user = User.find(params[:id])
      unless current_user?(@user)
        render json: { error: "You may only edit your own profile" }, status: :forbidden
      end
    end
end
