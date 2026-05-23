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
          product_count: note.product_notes.count
        }

        if with_products
          products = Spree::Product
                       .joins(:labor_product_notes)
                       .where(labor_product_notes: { labor_note_id: note.id })
                       .available
                       .includes(:labor_fragrance_detail, master: [:images, :default_price])
                       .distinct
          payload[:products] = products.map { |p| Labor::Storefront::ProductCardSerializer.call(p) }
        end

        payload
      end
    end
  end
end
