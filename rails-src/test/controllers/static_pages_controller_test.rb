require 'test_helper'

class StaticPagesControllerTest < ActionDispatch::IntegrationTest

  test "home should succeed when logged out" do
    get feed_path
    assert_response :success
    body = JSON.parse(response.body)
    assert_equal [], body['feedItems']
  end

  test "home should return feed items when logged in" do
    log_in_as(users(:michael))
    get feed_path
    assert_response :success
    body = JSON.parse(response.body)
    assert_not_empty body['feedItems']
  end
end
