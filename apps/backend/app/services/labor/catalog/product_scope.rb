module Labor
  module Catalog
    class ProductScope
      def initialize(params:)
        @params = params
      end

      def relation
        rel = ::Spree::Product.where(id: filtered_collection.select(:id))

        case param_value(:sort)
        when 'popular'
          rel.left_outer_joins(:labor_fragrance_detail)
             .order(Arel.sql('labor_product_fragrance_details.avg_rating DESC NULLS LAST, spree_products.id DESC'))
        when 'price_asc'
          rel.left_outer_joins(master: :prices)
             .where(spree_prices: { currency: 'UZS', is_default: true })
             .order(Arel.sql('spree_prices.amount ASC NULLS LAST, spree_products.id DESC'))
        when 'price_desc'
          rel.left_outer_joins(master: :prices)
             .where(spree_prices: { currency: 'UZS', is_default: true })
             .order(Arel.sql('spree_prices.amount DESC NULLS LAST, spree_products.id DESC'))
        else
          rel.order(id: :desc)
        end
      end

      private

      attr_reader :params

      def filtered_collection
        rel = ::Spree::Product.available
        rel = rel.joins(labor_fragrance_detail: :brand).where(labor_brands: { slug: filter_value(:brand) }) if filter_value(:brand).present?
        rel = rel.joins(:labor_product_notes).where(labor_product_notes: { labor_note_id: note_filter_ids }) if filter_value(:note).present?
        rel = rel.joins(labor_product_notes: :note).where(labor_notes: { family: filter_value(:family) }) if filter_value(:family).present?
        rel = rel.joins(:labor_fragrance_detail).where(labor_product_fragrance_details: { gender: filter_value(:gender) }) if filter_value(:gender).present?
        rel = rel.joins(labor_product_perfumers: :perfumer).where(labor_perfumers: { slug: filter_value(:perfumer) }) if filter_value(:perfumer).present?
        rel = rel.where('spree_products.name ILIKE ?', "%#{filter_value(:name)}%") if filter_value(:name).present?
        rel.where(id: canonical_product_ids).distinct
      end

      def canonical_product_ids
        parent_expr = 'lower(trim(spree_products.name))'
        ::Spree::Product
          .select(Arel.sql("DISTINCT ON (#{parent_expr}) spree_products.id"))
          .order(Arel.sql("#{parent_expr} ASC, spree_products.id ASC"))
      end

      def note_filter_ids
        note = Labor::Note.find_by(slug: filter_value(:note))
        return Labor::Note.none.select(:id) unless note

        Labor::Catalog::CanonicalNotes.siblings(note).select(:id)
      end

      def filter_value(key)
        filters = param_value(:filter)
        return if filters.blank?

        if filters.respond_to?(:[])
          filters[key].presence || filters[key.to_s].presence
        end
      end

      def param_value(key)
        params[key].presence || params[key.to_s].presence
      end
    end
  end
end
