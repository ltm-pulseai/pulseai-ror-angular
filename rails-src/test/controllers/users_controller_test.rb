require 'test_helper'

class UsersControllerTest < ActionDispatch::IntegrationTest

  def setup
    @user       = users(:michael)
    @other_user = users(:archer)
  end

  test "should get show" do
    get user_path(@user)
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal @user.name, body['user']['name']
  end

  test "index should require logged-in user" do
    get users_path
    assert_response :unauthorized
  end

  test "index should succeed when logged in" do
    log_in_as(@user)
    get users_path
    assert_response :success
  end

  test "should sign up a new user" do
    assert_difference 'User.count', 1 do
      post users_path, params: { user: { name:  "Example User",
                                         email: "user@example.com",
                                         password:              "password",
                                         password_confirmation: "password" } }
    end
    assert_response :created
  end

  test "should not sign up user with invalid params" do
    assert_no_difference 'User.count' do
      post users_path, params: { user: { name:  "",
                                         email: "user@invalid",
                                         password:              "foo",
                                         password_confirmation: "bar" } }
    end
    assert_response :unprocessable_entity
  end

  test "update should require logged-in user" do
    patch user_path(@user), params: { user: { name: @user.name,
                                              email: @user.email } }
    assert_response :unauthorized
  end

  test "update should require correct user" do
    log_in_as(@other_user)
    patch user_path(@user), params: { user: { name: @user.name,
                                              email: @user.email } }
    assert_response :forbidden
  end

  test "update should succeed as correct user" do
    log_in_as(@user)
    patch user_path(@user), params: { user: { name: "New Name",
                                              email: @user.email } }
    assert_response :success
    assert_equal "New Name", @user.reload.name
  end
end
