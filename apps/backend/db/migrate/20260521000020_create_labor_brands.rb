class CreateLaborBrands < ActiveRecord::Migration[7.1]
  def change
    create_table :labor_brands do |t|
      t.string  :slug, null: false
      t.string  :name, null: false
      t.string  :country
      t.integer :founded_year
      t.text    :website
      t.boolean :niche, default: false, null: false
      t.boolean :active, default: true, null: false
      t.integer :products_count, default: 0, null: false
      t.timestamps
    end
    add_index :labor_brands, :slug, unique: true
    add_index :labor_brands, :active

    create_table :labor_brand_translations do |t|
      t.references :labor_brand, null: false, foreign_key: true, index: { name: 'idx_brand_trans_brand' }
      t.string :locale, null: false
      t.text   :description
      t.text   :story
      t.timestamps
    end
    add_index :labor_brand_translations, [:labor_brand_id, :locale], unique: true, name: 'idx_brand_trans_locale'
  end
end
