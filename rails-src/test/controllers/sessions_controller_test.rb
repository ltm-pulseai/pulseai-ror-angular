require 'test_helper'

class SessionsControllerTest < ActionDispatch::IntegrationTest

  def setup
    @user = users(:michael)
  end

  test "should log in with valid credentials" do
    post login_path, params: { session: { email: @user.email, password: 'password' } }
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal @user.name, body['user']['name']
  end

  test "should reject invalid password" do
    post login_path, params: { session: { email: @user.email, password: 'invalid' } }
    assert_response :unauthorized
  end

  test "should reject login for unactivated user" do
    @user.update_columns(activated: false)
    post login_path, params: { session: { email: @user.email, password: 'password' } }
    assert_response :forbidden
  end

  test "should log out" do
    log_in_as(@user)
    delete logout_path
    assert_response :no_content
  end

  test "me should return current user when logged in" do
    log_in_as(@user)
    get me_path
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal @user.name, body['user']['name']
  end

  test "me should return null when logged out" do
    get me_path
    assert_response :success
    body = JSON.parse(response.body)
    assert_nil body['user']
  end
end
