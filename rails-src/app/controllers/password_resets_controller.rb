class PasswordResetsController < ApplicationController
  before_action :get_user,         only: [:edit, :update]
  before_action :valid_user,       only: [:edit, :update]
  before_action :check_expiration, only: [:edit, :update]    # Case (1)

  # Phase 7 (Cutover): JSON-only. `new` action removed (dead — no route, no
  # HTML view; Angular's RequestComponent renders its own form).
  def create
    @user = User.find_by(email: params[:password_reset][:email].downcase)
    if @user
      @user.create_reset_digest
      @user.send_password_reset_email
      render json: { message: "Email sent with password reset instructions" }
    else
      render json: { error: "Email address not found" }, status: :not_found
    end
  end

  def edit
    render json: { email: @user.email }
  end

  def update
    if params[:user][:password].empty?                  # Case (3)
      @user.errors.add(:password, "can't be empty")
      render json: { errors: @user.errors }, status: :unprocessable_entity
    elsif @user.update(user_params)                     # Case (4)
      log_in @user
      render json: { user: user_json(@user) }
    else
      render json: { errors: @user.errors }, status: :unprocessable_entity
    end
  end

  private

    def user_params
      params.require(:user).permit(:password, :password_confirmation)
    end

    # Before filters

    def get_user
      @user = User.find_by(email: params[:email])
    end

    # Confirms a valid user.
    def valid_user
      unless (@user && @user.activated? &&
              @user.authenticated?(:reset, params[:id]))
        render json: { error: "Invalid password reset link" }, status: :not_found
      end
    end

    # Checks expiration of reset token.
    def check_expiration
      if @user && @user.password_reset_expired?
        render json: { error: "Password reset has expired." }, status: :gone
      end
    end
end
