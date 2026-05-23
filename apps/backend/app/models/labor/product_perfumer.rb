module Labor
  class ProductPerfumer < ApplicationRecord
    belongs_to :product,  class_name: 'Spree::Product',  foreign_key: :spree_product_id
    belongs_to :perfumer, class_name: 'Labor::Perfumer', foreign_key: :labor_perfumer_id
  end
end
