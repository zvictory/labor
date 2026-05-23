module Labor
  module Admin
    class BrandsController < Spree::Admin::BaseController
      helper Labor::AdminHelpers
      before_action :load_brand, only: %i[show edit update destroy]

      def index
        @brands = Labor::Brand.order(:name)
      end

      def show
        redirect_to spree.edit_admin_labor_brand_path(@brand)
      end

      def new
        @brand = Labor::Brand.new(active: true)
      end

      def create
        @brand = Labor::Brand.new(brand_params)
        if @brand.save
          redirect_to spree.edit_admin_labor_brand_path(@brand), notice: 'Brand created.'
        else
          flash.now[:error] = @brand.errors.full_messages.to_sentence
          render :new, status: :unprocessable_content
        end
      end

      def edit
      end

      def update
        if @brand.update(brand_params)
          redirect_to spree.edit_admin_labor_brand_path(@brand), notice: 'Brand updated.'
        else
          flash.now[:error] = @brand.errors.full_messages.to_sentence
          render :edit, status: :unprocessable_content
        end
      end

      def destroy
        if @brand.destroy
          redirect_to spree.admin_labor_brands_path, notice: 'Brand deleted.'
        else
          redirect_to spree.admin_labor_brands_path, alert: @brand.errors.full_messages.to_sentence
        end
      end

      private

      def load_brand
        @brand = Labor::Brand.find(params[:id])
      end

      def brand_params
        params.require(:labor_brand).permit(
          :slug, :name, :country, :founded_year, :website, :niche, :active
        )
      end
    end
  end
end
