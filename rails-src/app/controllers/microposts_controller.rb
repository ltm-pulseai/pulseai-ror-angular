class MicropostsController < ApplicationController
  before_action :logged_in_user, only: [:create, :destroy]
  before_action :correct_user,   only: :destroy

  # Phase 7 (Cutover): JSON-only.
  def create
    @micropost = current_user.microposts.build(micropost_params)
    @micropost.image.attach(params[:micropost][:image])
    if @micropost.save
      render json: { micropost: micropost_json(@micropost) }, status: :created
    else
      render json: { errors: @micropost.errors }, status: :unprocessable_entity
    end
  end

  def destroy
    @micropost.destroy
    head :no_content
  end

  private

    def micropost_params
      params.require(:micropost).permit(:content, :image)
    end

    def correct_user
      @micropost = current_user.microposts.find_by(id: params[:id])
      render json: { error: "Not found" }, status: :not_found if @micropost.nil?
    end
end
