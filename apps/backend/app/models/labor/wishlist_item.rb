module Labor
  class WishlistItem < ApplicationRecord
    self.inheritance_column = nil

    belongs_to :user,    class_name: 'Spree::User',    foreign_key: :spree_user_id
    belongs_to :product, class_name: 'Spree::Product', foreign_key: :spree_product_id

    validates :spree_user_id, uniqueness: { scope: :spree_product_id }
  end
end
