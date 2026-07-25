class AccountActivationsController < ApplicationController

  # Phase 7 (Cutover): JSON-only.
  def edit
    user = User.find_by(email: params[:email])
    if user && !user.activated? && user.authenticated?(:activation, params[:id])
      user.activate
      log_in user
      render json: { activated: true, user: user_json(user) }
    else
      render json: { activated: false, error: "Invalid activation link" }, status: :not_found
    end
  end
end
