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
          # volume_ml and price are the 30 ml defaults (or master price when no size
          # variants exist yet). They remain here for backwards-compat with clients
          # that haven't adopted the `sizes` array yet.
          volume_ml: detail&.volume_ml.to_i.positive? ? detail.volume_ml : 30,
          price: default_price_uzs(product),
          currency: 'UZS',
          images: images_payload(product),
          description: product.description.presence,
          sizes: sizes_payload(product),
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

      # Returns the 30ml size variant's UZS price, falling back to master's UZS price.
      # Uses the deterministic SKU suffix set by labor:sizes:generate.
      # Direct UZS lookup because Spree::Config.currency = "USD" makes default_price nil.
      def default_price_uzs(product)
        master_sku = product.master.sku.presence || "product-#{product.id}"
        v30 = Spree::Variant.find_by(sku: "#{master_sku}-30ml", product: product)
        if v30
          price = Spree::Price.find_by(variant: v30, currency: 'UZS')&.amount.to_i
          return price if price&.positive?
        end
        Spree::Price.find_by(variant: product.master, currency: 'UZS')&.amount.to_i || 0
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
        product.master.images.map do |img|
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

      # Returns [{variant_id, ml, price}] sorted by ml asc, or nil when the size
      # OptionType doesn't exist yet (so the field is absent from the JSON until
      # labor:sizes:generate has been run).
      def sizes_payload(product)
        size_ot = Spree::OptionType.find_by(name: 'size')
        return nil unless size_ot

        ov_by_id = size_ot.option_values.index_by(&:id)
        return nil if ov_by_id.empty?

        Spree::Variant
          .where(product: product, is_master: false)
          .joins(:option_values)
          .where(spree_option_values: { option_type_id: size_ot.id })
          .includes(:option_values, :prices)
          .map do |variant|
            ml_ov  = variant.option_values.find { |ov| ov.option_type_id == size_ot.id }
            next unless ml_ov

            ml    = ml_ov.name.to_i   # "10ml" → 10
            price = variant.prices.find_by(currency: 'UZS')&.amount.to_i || 0

            { variant_id: variant.id, ml: ml, price: price }
          end
          .compact
          .filter { |s| s[:price].positive? }   # skip zero-price sizes (e.g. 10ml of 1,000 UZS item)
          .sort_by { |s| s[:ml] }
          .presence
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
