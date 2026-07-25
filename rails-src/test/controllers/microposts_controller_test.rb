require 'test_helper'

class MicropostsControllerTest < ActionDispatch::IntegrationTest

  def setup
    @micropost = microposts(:orange)
  end

  test "create should require logged-in user" do
    assert_no_difference 'Micropost.count' do
      post microposts_path, params: { micropost: { content: "Lorem ipsum" } }
    end
    assert_response :unauthorized
  end

  test "destroy should require logged-in user" do
    assert_no_difference 'Micropost.count' do
      delete micropost_path(@micropost)
    end
    assert_response :unauthorized
  end

  test "destroy should require correct user" do
    log_in_as(users(:michael))
    micropost = microposts(:ants)
    assert_no_difference 'Micropost.count' do
      delete micropost_path(micropost)
    end
    assert_response :not_found
  end

  test "create should succeed for logged-in user" do
    log_in_as(users(:michael))
    assert_difference 'Micropost.count', 1 do
      post microposts_path, params: { micropost: { content: "Lorem ipsum" } }
    end
    assert_response :created
  end

  test "destroy should succeed for correct user" do
    log_in_as(users(:michael))
    assert_difference 'Micropost.count', -1 do
      delete micropost_path(@micropost)
    end
    assert_response :no_content
  end
end
