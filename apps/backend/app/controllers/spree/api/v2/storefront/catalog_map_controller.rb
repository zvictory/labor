module Spree
  module Api
    module V2
      module Storefront
        class CatalogMapController < ::Spree::Api::V2::BaseController
          DEFAULT_PRODUCT_LIMIT = 42
          DEFAULT_NOTES_PER_PRODUCT = 4
          MAX_PRODUCT_LIMIT = 80
          MAX_NOTES_PER_PRODUCT = 8

          def show
            with_locale do
              render json: {
                data: {
                  stats: stats_payload,
                  graph: graph_payload
                }
              }
            end
          end

          private

          def stats_payload
            products = ::Spree::Product.available
            product_ids = products.select(:id)
            with_notes = Labor::ProductNote.where(spree_product_id: product_ids).distinct.count(:spree_product_id)

            {
              products: products.count,
              notes: Labor::Note.joins(:product_notes).distinct.count,
              product_note_links: Labor::ProductNote.where(spree_product_id: product_ids).count,
              products_with_notes: with_notes,
              products_missing_notes: products.count - with_notes,
              products_with_day_night: Labor::ProductFragranceDetail.where(spree_product_id: product_ids).where.not(time_breakdown: {}).count
            }
          end

          def graph_payload
            product_limit = bounded_param(:product_limit, DEFAULT_PRODUCT_LIMIT, MAX_PRODUCT_LIMIT)
            notes_per_product = bounded_param(:notes_per_product, DEFAULT_NOTES_PER_PRODUCT, MAX_NOTES_PER_PRODUCT)

            products = graph_products(product_limit)
            notes_by_product = notes_for_products(products, notes_per_product)

            {
              nodes: graph_nodes(products, notes_by_product),
              edges: graph_edges(products, notes_by_product)
            }
          end

          def graph_products(limit)
            ::Spree::Product
              .available
              .distinct(false)
              .joins(:labor_fragrance_detail)
              .preload(:labor_fragrance_detail)
              .where(id: Labor::ProductNote.select(:spree_product_id))
              .order(Arel.sql("(labor_product_fragrance_details.time_breakdown <> '{}'::jsonb OR labor_product_fragrance_details.seasons_breakdown <> '{}'::jsonb) DESC"))
              .order(Arel.sql('labor_product_fragrance_details.avg_rating DESC NULLS LAST, spree_products.id DESC'))
              .limit(limit)
              .to_a
          end

          def notes_for_products(products, per_product)
            product_ids = products.map(&:id)
            return {} if product_ids.empty?

            Labor::ProductNote
              .where(spree_product_id: product_ids)
              .includes(:note)
              .order(:pyramid_layer, :position, :id)
              .group_by(&:spree_product_id)
              .transform_values { |items| items.first(per_product) }
          end

          def graph_nodes(products, notes_by_product)
            product_nodes = products.map do |product|
              { id: "product:#{product.id}", title: product.name.to_s, color: '#1A1714', group: 'product', slug: product.slug }
            end

            note_nodes = notes_by_product
                         .values
                         .flatten
                         .map(&:note)
                         .uniq(&:id)
                         .map { |note| { id: "note:#{note.id}", title: note.name.to_s.presence || note.slug, color: note_family_color(note.family), group: 'note', family: note.family.to_s } }

            product_nodes + note_nodes + time_nodes(products)
          end

          def graph_edges(products, notes_by_product)
            note_edges = products.flat_map do |product|
              Array(notes_by_product[product.id]).map do |product_note|
                {
                  source: "product:#{product.id}",
                  target: "note:#{product_note.note.id}",
                  value: note_weight(product_note.pyramid_layer),
                  type: product_note.pyramid_layer
                }
              end
            end

            note_edges + time_edges(products)
          end

          def time_nodes(products)
            keys = products.flat_map { |product| breakdown_keys(product.labor_fragrance_detail&.time_breakdown) }.uniq
            keys.map { |key| { id: "time:#{key}", title: time_label(key), color: time_color(key), group: 'time' } }
          end

          def time_edges(products)
            products.flat_map do |product|
              breakdown_edges(product, product.labor_fragrance_detail&.time_breakdown, 'time')
            end
          end

          def breakdown_edges(product, breakdown, group)
            safe_breakdown(breakdown).map do |key, value|
              {
                source: "product:#{product.id}",
                target: "#{group}:#{key}",
                value: breakdown_weight(value),
                type: group
              }
            end
          end

          def breakdown_weight(value)
            numeric_value = value.to_f
            normalized_value = numeric_value > 1 ? numeric_value / 100 : numeric_value

            [(normalized_value * 6).round(2), 0.5].max
          end

          def breakdown_keys(breakdown)
            safe_breakdown(breakdown).keys
          end

          def safe_breakdown(breakdown)
            return {} unless breakdown.respond_to?(:to_h)

            breakdown.to_h.select { |_key, value| value.to_f.positive? }
          end

          def note_weight(layer)
            { 'top' => 3, 'heart' => 2, 'base' => 1 }.fetch(layer.to_s, 1)
          end

          def time_label(key)
            { 'day' => 'Day', 'night' => 'Night' }.fetch(key.to_s, key.to_s.humanize)
          end

          def time_color(key)
            { 'day' => '#f5c542', 'night' => '#1f2937' }.fetch(key.to_s, '#8B6F47')
          end

          def note_family_color(family)
            {
              'citrus' => '#f5c542',
              'floral' => '#ff5f8d',
              'woody' => '#774414',
              'aromatic' => '#37a089',
              'aquatic' => '#63cce2',
              'green' => '#70a64b',
              'leather' => '#78483a',
              'smoky' => '#4b5563',
              'gourmand' => '#b45309',
              'oriental' => '#9f5f80'
            }.fetch(family.to_s, '#8B6F47')
          end

          def bounded_param(key, fallback, max)
            value = params[key].to_i
            return fallback unless value.positive?

            [value, max].min
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
