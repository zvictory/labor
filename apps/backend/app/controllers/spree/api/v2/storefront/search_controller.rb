module Spree
  module Api
    module V2
      module Storefront
        class SearchController < ::Spree::Api::V2::BaseController
          MAX_PER_PAGE = 48
          DEFAULT_PER_PAGE = 24
          SHORT_QUERY_LEN = 2

          def index
            q = params[:q].to_s.strip

            if q.empty?
              return render(json: { data: [], meta: { total_count: 0, total_pages: 0, query: '', suggestions: [] } })
            end

            page = (params[:page] || 1).to_i
            per_page = [(params[:per_page] || DEFAULT_PER_PAGE).to_i, MAX_PER_PAGE].min
            per_page = DEFAULT_PER_PAGE if per_page <= 0

            with_locale do |locale|
              tokens = q.split(/\s+/).reject(&:blank?)
              short_mode = tokens.size == 1 && tokens.first.length <= SHORT_QUERY_LEN

              match_scope = base_relation(locale)
              match_scope = apply_token_filters(match_scope, tokens, short_mode: short_mode)

              first_token = tokens.first.to_s
              brand_exact = ::ActiveRecord::Base.sanitize_sql_array(['LOWER(labor_brands.name) = LOWER(?)', first_token])
              name_exact  = ::ActiveRecord::Base.sanitize_sql_array(['LOWER(spree_products.name) = LOWER(?)', first_token])

              ranked_ids = match_scope
                             .unscope(:order, :select)
                             .distinct(false)
                             .select(<<~SQL.squish)
                               spree_products.id AS id,
                               MIN(CASE WHEN #{brand_exact} THEN 0 ELSE 1 END) AS brand_rank,
                               MIN(CASE WHEN #{name_exact} THEN 0 ELSE 1 END) AS name_rank,
                               MAX(spree_products.created_at) AS created_at_rank
                             SQL
                             .group('spree_products.id')
                             .order(Arel.sql('brand_rank ASC, name_rank ASC, created_at_rank DESC'))

              total = match_scope.unscope(:order).distinct.count('spree_products.id')

              offset = (page - 1) * per_page
              page_ids = ranked_ids.limit(per_page).offset(offset).map(&:id)

              products_by_id = ::Spree::Product
                                 .where(id: page_ids)
                                 .includes(:master, :variant_images, :labor_fragrance_detail)
                                 .index_by(&:id)
              ordered = page_ids.map { |id| products_by_id[id] }.compact

              total_pages = per_page.positive? ? (total.to_f / per_page).ceil : 0

              suggestions = []
              if total.zero? && first_token.present?
                like = "%#{sanitize_like(first_token)}%"
                suggestions = ::Labor::Brand.where('labor_brands.name ILIKE ?', like)
                                            .where(active: true)
                                            .limit(5)
                                            .pluck(:slug, :name)
                                            .map { |slug, name| { slug: slug, name: name } }
              end

              render json: {
                data: ordered.map { |p| Labor::Storefront::ProductCardSerializer.call(p) },
                meta: {
                  total_count: total,
                  total_pages: total_pages,
                  query: q,
                  suggestions: suggestions
                }
              }
            end
          end

          private

          def base_relation(locale)
            ::Spree::Product.available
              .joins(safe_join_sql(<<~SQL, locale))
                LEFT JOIN spree_product_translations
                  ON spree_product_translations.spree_product_id = spree_products.id
                 AND spree_product_translations.locale = ?
              SQL
              .joins('LEFT JOIN labor_product_fragrance_details ON labor_product_fragrance_details.spree_product_id = spree_products.id')
              .joins('LEFT JOIN labor_brands ON labor_brands.id = labor_product_fragrance_details.labor_brand_id')
              .joins('LEFT JOIN labor_product_notes ON labor_product_notes.spree_product_id = spree_products.id')
              .joins('LEFT JOIN labor_notes ON labor_notes.id = labor_product_notes.labor_note_id')
              .joins('LEFT JOIN labor_product_perfumers ON labor_product_perfumers.spree_product_id = spree_products.id')
              .joins('LEFT JOIN labor_perfumers ON labor_perfumers.id = labor_product_perfumers.labor_perfumer_id')
          end

          def apply_token_filters(relation, tokens, short_mode:)
            tokens.each do |token|
              like = short_mode ? "#{sanitize_like(token)}%" : "%#{sanitize_like(token)}%"

              clause = <<~SQL
                spree_products.name ILIKE :like
                OR spree_product_translations.name ILIKE :like
                OR labor_brands.name ILIKE :like
                OR labor_notes.name ILIKE :like
                OR labor_notes.family ILIKE :like
                OR labor_perfumers.name ILIKE :like
                OR labor_product_fragrance_details.concentration ILIKE :like
              SQL

              relation = relation.where(clause, like: like)
            end
            relation
          end

          def sanitize_like(value)
            ::ActiveRecord::Base.sanitize_sql_like(value.to_s)
          end

          # Quote and inline bind values for ad-hoc JOIN fragments. Uses
          # ActiveRecord's own sanitize_sql_array (the same code path
          # `where("col = ?", x)` uses) so quoting honors the connection
          # adapter rather than relying on Kernel#format placeholders.
          def safe_join_sql(sql, *args)
            ::ActiveRecord::Base.sanitize_sql_array([sql, *args])
          end

          def with_locale(&blk)
            lang = (request.headers['Accept-Language'] || I18n.default_locale).to_s.split(/[,;]/).first.to_s.split('-').first
            locale = (lang.presence || I18n.default_locale).to_s
            Mobility.with_locale(locale) { blk.call(locale) }
          end
        end
      end
    end
  end
end
