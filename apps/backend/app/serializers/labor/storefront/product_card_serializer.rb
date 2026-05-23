module Labor
  module Storefront
    # Slim card payload for /storefront/products listing (apps/web ProductCard).
    module ProductCardSerializer
      module_function

      def call(product)
        detail = product.labor_fragrance_detail
        top = top_accord(product)
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          brand: detail&.brand&.name.to_s,
          price: product.master.default_price&.amount.to_i,
          image: first_image_url(product),
          avg_rating: detail&.avg_rating.to_f,
          top_accord: top
        }
      end

      def first_image_url(product)
        img = product.images.first
        return '' unless img&.attachment&.attached?

        Rails.application.routes.url_helpers.rails_blob_url(
          img.attachment,
          host: ENV.fetch('PUBLIC_HOST', 'http://localhost:4000')
        )
      rescue StandardError
        ''
      end

      def top_accord(product)
        pa = Labor::ProductAccord
               .where(spree_product_id: product.id)
               .includes(:accord)
               .order(weight: :desc)
               .first
        return nil unless pa

        { name: pa.accord.name.to_s, color_hex: pa.accord.color_hex.to_s }
      end
    end
  end
end
