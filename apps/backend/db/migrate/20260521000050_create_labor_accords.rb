class CreateLaborAccords < ActiveRecord::Migration[7.1]
  def change
    create_table :labor_accords do |t|
      t.string :slug, null: false
      t.string :name, null: false
      t.string :color_hex
      t.timestamps
    end
    add_index :labor_accords, :slug, unique: true

    create_table :labor_accord_translations do |t|
      t.references :labor_accord, null: false, foreign_key: true, index: { name: 'idx_accord_trans_accord' }
      t.string :locale, null: false
      t.string :name
      t.timestamps
    end
    add_index :labor_accord_translations, [:labor_accord_id, :locale], unique: true, name: 'idx_accord_trans_locale'
  end
end
