module Labor
  module Storefront
    # Compact payload for /storefront/account/orders listing
    # (apps/web account → order history). Flat JSON, NOT JSON:API.
    module OrderSummarySerializer
      module_function

      def call(order)
        {
          id: order.id,
          number: order.number,
          state: order.state,
          completed_at: order.completed_at&.iso8601,
          item_count: order.line_items.sum(:quantity),
          total: order.total.to_i
        }
      end
    end
  end
end
