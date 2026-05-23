module Spree
  module Api
    module V2
      module Storefront
        # Returns the real, data-driven facet lists for the catalog filter UI:
        # top brands, top notes, all fragrance families, and gender — each with
        # product counts so the storefront can render chips like "Tom Ford (24)".
        class FilterFacetsController < ::Spree::Api::V2::BaseController
          # Sized for the current catalog (~100 brands, ~300 notes) with headroom.
          # Native <select> scrolls fine at this size; a hard cap stays just to
          # keep a runaway dataset from inflating the cached facets payload.
          BRAND_LIMIT = 200
          NOTE_LIMIT  = 200

          # Synthetic fallback brand used by the CSV importer when a row arrives
          # without a brand. Those products are effectively brandless — surfacing
          # "Labor (110)" in the filter dropdown is misleading, so exclude it.
          FALLBACK_BRAND_SLUG = 'labor'.freeze

          def index
            with_locale do
              render json: {
                data: {
                  brands:   brand_facets,
                  notes:    note_facets,
                  families: family_facets,
                  genders:  gender_facets
                }
              }
            end
          end

          private

          # All brands (up to BRAND_LIMIT) that have at least one product,
          # ordered by product count desc. Excludes the synthetic fallback brand
          # used for brandless CSV rows.
          def brand_facets
            rows = Labor::Brand
              .joins(:product_fragrance_details)
              .where.not(slug: FALLBACK_BRAND_SLUG)
              .group('labor_brands.id', 'labor_brands.slug', 'labor_brands.name')
              .order(Arel.sql('COUNT(labor_product_fragrance_details.id) DESC'), 'labor_brands.name ASC')
              .limit(BRAND_LIMIT)
              .pluck('labor_brands.slug', 'labor_brands.name', Arel.sql('COUNT(labor_product_fragrance_details.id)'))
            rows.map { |slug, name, count| { slug: slug, name: name, count: count } }
          end

          # Notes facet: every note that has at least one product, sorted by usage.
          # `labor_notes.name` is always NULL — Mobility stores names in
          # `labor_note_translations`. Join the translations table once for the
          # request locale, fall back to the default locale, then to NULL (the
          # frontend humanizes the slug as a last resort).
          def note_facets
            conn = ActiveRecord::Base.connection
            # Read Mobility.locale (set by `with_locale`), not I18n.locale —
            # the controller only switches Mobility, leaving I18n at default.
            req_loc = conn.quote(Mobility.locale.to_s)
            def_loc = conn.quote(I18n.default_locale.to_s)
            limit   = NOTE_LIMIT.to_i

            rows = conn.select_all(<<~SQL).to_a
              SELECT n.slug,
                     n.icon_url AS icon_url,
                     COALESCE(t_req.name, t_def.name) AS name,
                     COUNT(pn.id) AS cnt
              FROM   labor_notes n
              JOIN   labor_product_notes pn ON pn.labor_note_id = n.id
              LEFT JOIN labor_note_translations t_req
                     ON t_req.labor_note_id = n.id AND t_req.locale = #{req_loc}
              LEFT JOIN labor_note_translations t_def
                     ON t_def.labor_note_id = n.id AND t_def.locale = #{def_loc}
              GROUP  BY n.id, n.slug, n.icon_url, t_req.name, t_def.name
              ORDER  BY cnt DESC, n.slug ASC
              LIMIT  #{limit}
            SQL
            rows.map { |r| { slug: r['slug'], name: r['name'], icon_url: r['icon_url'], count: r['cnt'].to_i } }
          end

          # Distinct fragrance families with product counts. Distinct on product
          # so a product with multiple notes in the same family counts once.
          def family_facets
            rows = ActiveRecord::Base.connection.select_all(<<~SQL)
              SELECT n.family AS family, COUNT(DISTINCT pn.spree_product_id) AS cnt
              FROM   labor_notes n
              JOIN   labor_product_notes pn ON pn.labor_note_id = n.id
              WHERE  n.family IS NOT NULL
              GROUP  BY n.family
              ORDER  BY cnt DESC
            SQL
            rows.map { |r| { slug: r['family'], count: r['cnt'].to_i } }
          end

          # Gender values come straight from the DB enum (men/women/unisex).
          def gender_facets
            rows = Labor::ProductFragranceDetail
              .group(:gender)
              .order(Arel.sql('COUNT(*) DESC'))
              .pluck(:gender, Arel.sql('COUNT(*)'))
            rows.map { |gender, count| { slug: gender, count: count } }
          end

          def with_locale(&blk)
            lang = (request.headers['Accept-Language'] || I18n.default_locale).to_s.split(/[,;]/).first.to_s.split('-').first
            locale = lang.presence || I18n.default_locale
            Mobility.with_locale(locale, &blk)
          end
        end
      end
    end
  end
end
