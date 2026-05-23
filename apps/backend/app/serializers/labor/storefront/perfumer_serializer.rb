module Labor
  module Storefront
    module PerfumerSerializer
      module_function

      def call(perfumer, with_products: false)
        payload = {
          slug: perfumer.slug,
          name: perfumer.name.to_s,
          bio: perfumer.bio.to_s,
          country: perfumer.try(:country),
          product_count: perfumer.product_perfumers.count
        }

        if with_products
          products = Spree::Product
                       .joins(:labor_product_perfumers)
                       .where(labor_product_perfumers: { labor_perfumer_id: perfumer.id })
                       .available
                       .includes(:labor_fragrance_detail, master: [:images, :default_price])
                       .distinct
          payload[:products] = products.map { |p| Labor::Storefront::ProductCardSerializer.call(p) }
        end

        payload
      end
    end
  end
end
