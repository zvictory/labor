class CreateProductFragranceDetails < ActiveRecord::Migration[7.1]
  def change
    create_table :labor_product_fragrance_details do |t|
      t.references :spree_product, null: false, foreign_key: { to_table: :spree_products }, index: { name: 'idx_pfd_product', unique: true }
      t.references :labor_brand, foreign_key: true, index: { name: 'idx_pfd_brand' }

      t.integer :release_year
      t.string  :gender, default: 'unisex', null: false   # men, women, unisex
      t.string  :concentration                              # edp, edt, parfum, edc, extrait
      t.integer :volume_ml
      t.boolean :discontinued, default: false, null: false

      t.decimal :avg_longevity,  precision: 3, scale: 2, default: 0, null: false
      t.decimal :avg_sillage,    precision: 3, scale: 2, default: 0, null: false
      t.decimal :avg_rating,     precision: 3, scale: 2, default: 0, null: false
      t.integer :votes_count,    default: 0, null: false
      t.integer :reviews_count,  default: 0, null: false

      t.jsonb :seasons_breakdown, default: {}, null: false  # { winter: 0..1, spring: 0..1, ... }
      t.jsonb :time_breakdown,    default: {}, null: false  # { day, evening, night }
      t.jsonb :love_breakdown,    default: {}, null: false  # { love, like, neutral, dislike, hate }

      t.timestamps
    end

    # M:N — product ↔ note (with position in pyramid)
    create_table :labor_product_notes do |t|
      t.references :spree_product, null: false, foreign_key: { to_table: :spree_products }, index: { name: 'idx_pn_product' }
      t.references :labor_note,    null: false, foreign_key: true, index: { name: 'idx_pn_note' }
      t.string  :pyramid_layer, null: false # top, heart, base
      t.integer :position,      default: 0, null: false
      t.timestamps
    end
    add_index :labor_product_notes, [:spree_product_id, :labor_note_id, :pyramid_layer], unique: true, name: 'idx_pn_unique'

    # M:N — product ↔ accord (weighted)
    create_table :labor_product_accords do |t|
      t.references :spree_product, null: false, foreign_key: { to_table: :spree_products }, index: { name: 'idx_pa_product' }
      t.references :labor_accord,  null: false, foreign_key: true, index: { name: 'idx_pa_accord' }
      t.integer :weight, default: 50, null: false # 0..100
      t.timestamps
    end
    add_index :labor_product_accords, [:spree_product_id, :labor_accord_id], unique: true, name: 'idx_pa_unique'

    # M:N — product ↔ perfumer
    create_table :labor_product_perfumers do |t|
      t.references :spree_product,  null: false, foreign_key: { to_table: :spree_products }, index: { name: 'idx_pp_product' }
      t.references :labor_perfumer, null: false, foreign_key: true, index: { name: 'idx_pp_perfumer' }
      t.timestamps
    end
    add_index :labor_product_perfumers, [:spree_product_id, :labor_perfumer_id], unique: true, name: 'idx_pp_unique'

    # Similar products (curated + computed)
    create_table :labor_product_similars do |t|
      t.references :spree_product,         null: false, foreign_key: { to_table: :spree_products }, index: { name: 'idx_psim_product' }
      t.references :similar_spree_product, null: false, foreign_key: { to_table: :spree_products }, index: { name: 'idx_psim_similar' }
      t.decimal :score, precision: 5, scale: 4, default: 0
      t.string  :source, default: 'computed' # computed | manual
      t.timestamps
    end
    add_index :labor_product_similars, [:spree_product_id, :similar_spree_product_id], unique: true, name: 'idx_psim_unique'
  end
end
