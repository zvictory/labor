module Labor
  module Storefront
    # Standalone Labor account endpoints (Spree 5 port).
    # Replaces the V2 AccountControllerDecorator: Spree 5 dropped V2 entirely,
    # and the V3 storefront account controller does not expose `#orders`/`#order`.
    # Auth via JWT (V3::BaseController) — old `doorkeeper_authorize!` is gone in 5.
    class AccountController < ::Spree::Api::V2::BaseController
      before_action :require_authentication!

      def orders
        user = current_user
        page = (params[:page] || 1).to_i
        per_page = 20

        scope = user.orders.complete.order(completed_at: :desc)
        offset = (page - 1) * per_page
        total_count = scope.count
        records = scope.limit(per_page).offset(offset).to_a
        total_pages = per_page.positive? ? (total_count.to_f / per_page).ceil : 0

        render json: {
          data: records.map { |o| ::Labor::Storefront::OrderSummarySerializer.call(o) },
          meta: {
            total_count: total_count,
            total_pages: total_pages
          }
        }
      end

      def order
        user = current_user
        order = ::Spree::Order.find_by!(number: params[:number], user_id: user.id)
        render json: { data: ::Labor::Storefront::OrderDetailSerializer.call(order) }
      rescue ActiveRecord::RecordNotFound
        render json: { error: 'not_found' }, status: :not_found
      end
    end
  end
end
