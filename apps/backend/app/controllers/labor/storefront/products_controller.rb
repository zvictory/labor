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
          preload_card_associations(records)
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
        ::Labor::Catalog::ProductScope.new(params: params).relation
      end

      def preload_card_associations(records)
        ActiveRecord::Associations::Preloader.new(
          records: records,
          associations: [
            :translations,
            { labor_fragrance_detail: { brand: :translations } },
            { master: [:default_price, { images: { attachment_attachment: :blob } }] }
          ]
        ).call
        preload_top_product_accords(records)
      end

      def preload_top_product_accords(records)
        product_ids = records.map(&:id)
        top_accords = Labor::ProductAccord
                        .where(spree_product_id: product_ids)
                        .select(Arel.sql('DISTINCT ON (spree_product_id) labor_product_accords.*'))
                        .includes(accord: :translations)
                        .order(Arel.sql('spree_product_id ASC, weight DESC, id ASC'))
                        .index_by(&:spree_product_id)

        records.each do |product|
          association = product.association(:labor_top_product_accord)
          association.target = top_accords[product.id]
          association.loaded!
        end
      end

      def with_locale(&blk)
        lang = (request.headers['Accept-Language'] || I18n.default_locale).to_s.split(/[,;]/).first.to_s.split('-').first
        locale = lang.presence || I18n.default_locale
        Mobility.with_locale(locale, &blk)
      end
    end
  end
end
