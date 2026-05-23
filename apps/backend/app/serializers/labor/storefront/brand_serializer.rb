module Labor
  module Storefront
    module BrandSerializer
      module_function

      def call(brand, with_products: false)
        payload = {
          slug: brand.slug,
          name: brand.name.to_s,
          origin: brand.try(:origin),
          country: brand.country.to_s,
          founded_year: brand.founded_year,
          website: brand.website.to_s,
          logo_url: brand.try(:logo_url),
          niche: !!brand.niche,
          description: brand.description.to_s,
          story: brand.story.to_s,
          product_count: brand.product_fragrance_details.count
        }

        if with_products
          products = Spree::Product
                       .joins(:labor_fragrance_detail)
                       .where(labor_product_fragrance_details: { labor_brand_id: brand.id })
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
