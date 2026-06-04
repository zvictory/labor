module Labor
  module Storefront
    module NoteSerializer
      module_function

      def call(note, with_products: false)
        payload = {
          slug: note.slug,
          name: note.name.to_s,
          family: note.try(:family),
          color_hex: note.try(:color_hex),
          icon_url: note.try(:icon_url),
          product_count: Labor::Catalog::CanonicalNotes.product_count(note)
        }

        if with_products
          note_ids = Labor::Catalog::CanonicalNotes.siblings(note).select(:id)
          products = Spree::Product
                       .joins(:labor_product_notes)
                       .where(labor_product_notes: { labor_note_id: note_ids })
                       .available
                       .includes(:labor_fragrance_detail, master: [:images, :default_price])
                       .distinct
                       .order(:id)
          canonical_products = Labor::Catalog::CanonicalProducts.call(products)
          payload[:products] = canonical_products.map { |p| Labor::Storefront::ProductCardSerializer.call(p) }
        end

        payload
      end
    end
  end
end
