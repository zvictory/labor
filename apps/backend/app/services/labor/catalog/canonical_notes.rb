module Labor
  module Catalog
    module CanonicalNotes
      module_function

      def call(notes)
        notes.each_with_object({}) do |note, canonical|
          canonical[normalized_name(note)] ||= note
        end.values
      end

      def siblings(note)
        Labor::Note.where('lower(trim(name)) = ?', normalized_name(note))
      end

      def product_count(note)
        Labor::ProductNote
          .where(labor_note_id: siblings(note).select(:id))
          .joins(:product)
          .merge(Spree::Product.available)
          .pluck('spree_products.slug')
          .map { |slug| Labor::Catalog::CanonicalProducts.base_slug(slug) }
          .uniq
          .count
      end

      def normalized_name(note)
        note.name.to_s.strip.downcase
      end
    end
  end
end
