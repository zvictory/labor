module Labor
  class ProductSimilar < ApplicationRecord
    belongs_to :product,         class_name: 'Spree::Product', foreign_key: :spree_product_id
    belongs_to :similar_product, class_name: 'Spree::Product', foreign_key: :similar_spree_product_id

    scope :by_score, -> { order(score: :desc) }
  end
end
