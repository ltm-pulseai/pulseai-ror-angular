class StaticPagesController < ApplicationController

  # Phase 7 (Cutover): JSON-only. Routed as GET /api/feed. help/about/contact
  # actions removed — Angular renders those with zero backend calls
  # (specs/01-static-pages.md section 3), so they had no reason to exist
  # once the HTML views were deleted.
  def home
    if logged_in?
      feed_items = current_user.feed.paginate(page: params[:page])
      render json: {
        feedItems: feed_items.map { |m| micropost_json(m) },
        pagination: pagination_json(feed_items)
      }
    else
      render json: { feedItems: [], pagination: nil }
    end
  end
end
