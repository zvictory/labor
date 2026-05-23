module Labor
  class ProductAccord < ApplicationRecord
    belongs_to :product, class_name: 'Spree::Product', foreign_key: :spree_product_id
    belongs_to :accord,  class_name: 'Labor::Accord',  foreign_key: :labor_accord_id

    validates :weight, numericality: { in: 0..100 }
  end
end
