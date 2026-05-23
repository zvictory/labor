module Labor
  module Storefront
    # Standalone Labor products endpoint (Spree 5 port).
    # Replaces V2 ProductsControllerDecorator: Spree 5's V3 ProductsController
    # uses a search_provider abstraction that doesn't expose collection/resource
    # the way V2's ResourceController did, so re-prepending a decorator no longer
    # fits. We re-implement Labor's flat-DTO `#index`/`#show` here and keep
    # the public URLs (/api/v2/storefront/products(/:slug)) via routes.rb.
    class ProductsController < ::Spree::Api::V2::BaseController
      DEFAULT_PER_PAGE = 24
      MAX_PER_PAGE = 100

      def index
        with_locale do
          relation = sorted_collection
          page = [(params[:page] || 1).to_i, 1].max
          per_page = [[(params[:per_page] || DEFAULT_PER_PAGE).to_i, 1].max, MAX_PER_PAGE].min
          offset = (page - 1) * per_page
          # Spree 5 dropped kaminari from spree_api; paginate manually with limit/offset.
          total_count = relation.count
          records = relation.limit(per_page).offset(offset).to_a
          total_pages = per_page.positive? ? (total_count.to_f / per_page).ceil : 0

          render json: {
            data: records.map { |p| ::Labor::Storefront::ProductCardSerializer.call(p) },
            meta: {
              total_count: total_count,
              total_pages: total_pages
            }
          }
        end
      end

      def show
        with_locale do
          requested = params[:slug] || params[:id]
          product = begin
            ::Spree::Product.friendly.find(requested)
          rescue ActiveRecord::RecordNotFound
            nil
          end
          return render(json: { error: 'not_found' }, status: :not_found) unless product

          response.set_header('X-Canonical-Slug', product.slug) if product.slug.to_s != requested.to_s
          render json: { data: ::Labor::Storefront::ProductSerializer.call(product) }
        end
      end

      private

      def sorted_collection
        # Pluck deduped IDs from filtered_collection (which uses DISTINCT) then
        # re-scope without DISTINCT so we can ORDER BY joined columns freely.
        ids = filtered_collection.pluck(:id)
        rel = ::Spree::Product.where(id: ids)
        case params[:sort]
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

      def filtered_collection
        rel = ::Spree::Product.available
        rel = rel.joins(labor_fragrance_detail: :brand).where(labor_brands: { slug: params.dig(:filter, :brand) }) if params.dig(:filter, :brand).present?
        rel = rel.joins(labor_product_notes: :note).where(labor_notes: { slug: params.dig(:filter, :note) }) if params.dig(:filter, :note).present?
        rel = rel.joins(labor_product_notes: :note).where(labor_notes: { family: params.dig(:filter, :family) }) if params.dig(:filter, :family).present?
        rel = rel.joins(:labor_fragrance_detail).where(labor_product_fragrance_details: { gender: params.dig(:filter, :gender) }) if params.dig(:filter, :gender).present?
        rel = rel.where('spree_products.name ILIKE ?', "%#{params.dig(:filter, :name)}%") if params.dig(:filter, :name).present?
        rel.where(id: canonical_product_ids).distinct
      end

      def canonical_product_ids
        parent_expr = "regexp_replace(spree_products.slug, '-[0-9]+$', '')"
        ::Spree::Product
          .select(Arel.sql("DISTINCT ON (#{parent_expr}) spree_products.id"))
          .order(Arel.sql("#{parent_expr} ASC, length(spree_products.slug) ASC, spree_products.id ASC"))
      end

      def with_locale(&blk)
        lang = (request.headers['Accept-Language'] || I18n.default_locale).to_s.split(/[,;]/).first.to_s.split('-').first
        locale = lang.presence || I18n.default_locale
        Mobility.with_locale(locale, &blk)
      end
    end
  end
end
