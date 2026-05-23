module Labor
  module Storefront
    # Serializes a Spree::Product into the flat DTO consumed by apps/web
    # (apps/web/src/lib/api/products.ts → interface Product). Wrap callers in
    # `Mobility.with_locale(...)` to translate brand/note/accord names.
    module ProductSerializer
      module_function

      GENDER_MAP = { 'men' => 'masculine', 'women' => 'feminine', 'unisex' => 'unisex' }.freeze
      EMPTY_SEASONS = { 'spring' => 0, 'summer' => 0, 'autumn' => 0, 'winter' => 0 }.freeze
      EMPTY_TIME    = { 'day' => 0, 'night' => 0 }.freeze
      EMPTY_LOVE    = { 'love' => 0, 'like' => 0, 'dislike' => 0, 'hate' => 0 }.freeze

      def call(product)
        detail = product.labor_fragrance_detail
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          brand: brand_payload(detail&.brand),
          perfumers: perfumers_payload(product),
          gender: GENDER_MAP[detail&.gender] || 'unisex',
          concentration: detail&.concentration || 'edp',
          volume_ml: detail&.volume_ml || 0,
          price: product.master.default_price&.amount.to_i,
          currency: 'UZS',
          images: images_payload(product),
          description: product.description.presence,
          fragrance: {
            notes: notes_payload(product),
            accords: accords_payload(product),
            avg_rating: detail&.avg_rating.to_f,
            avg_longevity: detail&.avg_longevity.to_f,
            avg_sillage: detail&.avg_sillage.to_f,
            votes_count: detail&.votes_count.to_i,
            reviews_count: detail&.reviews_count.to_i,
            seasons: EMPTY_SEASONS.merge(detail&.seasons_breakdown || {}),
            time: EMPTY_TIME.merge(detail&.time_breakdown || {}),
            love: EMPTY_LOVE.merge(detail&.love_breakdown || {})
          },
          similar: similar_payload(product)
        }
      end

      def brand_payload(brand)
        return { id: 0, name: '', slug: '' } unless brand

        { id: brand.id, name: brand.name, slug: brand.slug }
      end

      def perfumers_payload(product)
        Labor::ProductPerfumer
          .where(spree_product_id: product.id)
          .includes(:perfumer)
          .map { |pp| { id: pp.perfumer.id, name: pp.perfumer.name } }
      end

      def images_payload(product)
        product.images.map do |img|
          { url: rails_blob_url(img.attachment), alt: img.alt.to_s }
        end
      rescue StandardError
        []
      end

      def notes_payload(product)
        Labor::ProductNote
          .where(spree_product_id: product.id)
          .includes(:note)
          .order(:pyramid_layer, :position)
          .map do |pn|
            { id: pn.note.id, name: pn.note.name.to_s, slug: pn.note.slug.to_s, family: pn.note.family.to_s, layer: pn.pyramid_layer, icon_url: pn.note.icon_url.to_s }
          end
      end

      def accords_payload(product)
        Labor::ProductAccord
          .where(spree_product_id: product.id)
          .includes(:accord)
          .order(weight: :desc)
          .map do |pa|
            { id: pa.accord.id, name: pa.accord.name.to_s, weight: pa.weight.to_i, color_hex: pa.accord.color_hex.to_s }
          end
      end

      def similar_payload(product)
        Labor::ProductSimilar
          .where(spree_product_id: product.id)
          .by_score
          .limit(6)
          .includes(similar_product: [:images, { labor_fragrance_detail: :brand }])
          .map do |ps|
            sp = ps.similar_product
            {
              id: sp.id,
              slug: sp.slug,
              name: sp.name,
              image: sp.images.first ? rails_blob_url(sp.images.first.attachment) : '',
              brand: sp.labor_fragrance_detail&.brand&.name.to_s
            }
          end
      rescue StandardError
        []
      end

      def rails_blob_url(attachment)
        return '' unless attachment&.attached?

        Rails.application.routes.url_helpers.rails_blob_url(
          attachment,
          host: ENV.fetch('PUBLIC_HOST', 'http://localhost:4000')
        )
      end
    end
  end
end
