class CreateLaborWishlistItems < ActiveRecord::Migration[7.1]
  def change
    create_table :labor_wishlist_items do |t|
      t.references :spree_user, null: false, foreign_key: { to_table: :spree_users }, index: { name: 'idx_wl_user' }
      t.references :spree_product, null: false, foreign_key: { to_table: :spree_products }, index: { name: 'idx_wl_product' }
      t.datetime :created_at, null: false
    end
    add_index :labor_wishlist_items, [:spree_user_id, :spree_product_id], unique: true, name: 'idx_wl_unique'
  end
end
