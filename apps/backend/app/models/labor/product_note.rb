module Labor
  class ProductNote < ApplicationRecord
    LAYERS = %w[top heart base].freeze

    belongs_to :product, class_name: 'Spree::Product', foreign_key: :spree_product_id
    belongs_to :note,    class_name: 'Labor::Note',    foreign_key: :labor_note_id

    validates :pyramid_layer, inclusion: { in: LAYERS }
  end
end
