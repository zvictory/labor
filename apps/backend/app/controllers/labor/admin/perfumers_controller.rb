module Labor
  module Admin
    class PerfumersController < Spree::Admin::BaseController
      helper Labor::AdminHelpers
      before_action :load_perfumer, only: %i[show edit update destroy]

      def index
        @perfumers = Labor::Perfumer.order(:name)
      end

      def show
        redirect_to spree.edit_admin_labor_perfumer_path(@perfumer)
      end

      def new
        @perfumer = Labor::Perfumer.new
      end

      def create
        @perfumer = Labor::Perfumer.new(perfumer_params)
        if @perfumer.save
          redirect_to spree.edit_admin_labor_perfumer_path(@perfumer), notice: 'Perfumer created.'
        else
          flash.now[:error] = @perfumer.errors.full_messages.to_sentence
          render :new, status: :unprocessable_content
        end
      end

      def edit
      end

      def update
        if @perfumer.update(perfumer_params)
          redirect_to spree.edit_admin_labor_perfumer_path(@perfumer), notice: 'Perfumer updated.'
        else
          flash.now[:error] = @perfumer.errors.full_messages.to_sentence
          render :edit, status: :unprocessable_content
        end
      end

      def destroy
        if @perfumer.destroy
          redirect_to spree.admin_labor_perfumers_path, notice: 'Perfumer deleted.'
        else
          redirect_to spree.admin_labor_perfumers_path, alert: @perfumer.errors.full_messages.to_sentence
        end
      end

      private

      def load_perfumer
        @perfumer = Labor::Perfumer.find(params[:id])
      end

      def perfumer_params
        params.require(:labor_perfumer).permit(:slug, :name, :country)
      end
    end
  end
end
