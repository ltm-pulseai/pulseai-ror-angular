require 'test_helper'

class RelationshipsControllerTest < ActionDispatch::IntegrationTest

  test "create should require logged-in user" do
    assert_no_difference 'Relationship.count' do
      post relationships_path
    end
    assert_response :unauthorized
  end

  test "destroy should require logged-in user" do
    assert_no_difference 'Relationship.count' do
      delete relationship_path(relationships(:one))
    end
    assert_response :unauthorized
  end

  test "create should follow a user" do
    log_in_as(users(:michael))
    other = users(:archer)
    assert_difference 'users(:michael).following.count', 1 do
      post relationships_path, params: { followed_id: other.id }
    end
    assert_response :success
  end

  test "destroy should unfollow a user" do
    log_in_as(users(:michael))
    assert_difference 'users(:michael).following.count', -1 do
      delete relationship_path(relationships(:one))
    end
    assert_response :success
  end

  test "destroy should not affect another user's relationship" do
    log_in_as(users(:archer))
    assert_no_difference 'Relationship.count' do
      delete relationship_path(relationships(:one))
    end
    assert_response :not_found
  end
end
