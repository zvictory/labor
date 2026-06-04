module Labor
  module Catalog
    module CanonicalProducts
      module_function

      def call(products)
        products.each_with_object({}) do |product, canonical|
          canonical[canonical_key(product)] ||= product
        end.values
      end

      def count(products)
        products.map { |product| canonical_key(product) }.uniq.count
      end

      def base_slug(slug)
        slug.to_s.sub(/-\d+\z/, '')
      end

      def canonical_key(product)
        name = product.name.to_s.strip.downcase

        name.presence || base_slug(product.slug)
      end
    end
  end
end
