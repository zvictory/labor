class AddTopAccordLookupIndex < ActiveRecord::Migration[7.1]
  def change
    add_index :labor_product_accords,
              [:spree_product_id, :weight, :id],
              name: 'idx_pa_product_weight'
  end
end
