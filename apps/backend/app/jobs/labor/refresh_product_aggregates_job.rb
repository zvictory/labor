module Labor
  class RefreshProductAggregatesJob < ApplicationJob
    queue_as :default

    def perform(spree_product_id)
      Labor::ProductFragranceDetail.transaction do
        pfd = Labor::ProductFragranceDetail.lock.find_by(spree_product_id: spree_product_id)
        pfd&.recompute_aggregates!
      end
    end
  end
end
