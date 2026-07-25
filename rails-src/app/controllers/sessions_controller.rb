class SessionsController < ApplicationController

  # Phase 7 (Cutover): JSON-only. `new` action removed (dead — no route, no
  # HTML view; Angular's LoginComponent renders its own form).
  def create
    user = User.find_by(email: params[:session][:email].downcase)
    if user && user.authenticate(params[:session][:password])
      if user.activated?
        log_in user
        # Angular sends remember_me (snake_case) to match Rails' own param
        # naming rather than adding a camelCase translation layer.
        params[:session][:remember_me] == '1' ? remember(user) : forget(user)
        render json: { user: user_json(user) }
      else
        message = "Account not activated. Check your email for the activation link."
        render json: { error: message }, status: :forbidden
      end
    else
      # Deliberately the same generic message regardless of which check
      # failed — see specs/02-sessions.md section 5 (anti-enumeration).
      render json: { error: 'Invalid email/password combination' }, status: :unauthorized
    end
  end

  def destroy
    log_out if logged_in?
    head :no_content
  end

  # Lets AuthService resolve current_user on app init without a full page
  # load recomputing it server-side per view render.
  def me
    render json: { user: logged_in? ? user_json(current_user) : nil }
  end
end
