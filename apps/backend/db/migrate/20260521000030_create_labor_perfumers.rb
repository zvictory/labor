class CreateLaborPerfumers < ActiveRecord::Migration[7.1]
  def change
    create_table :labor_perfumers do |t|
      t.string :slug, null: false
      t.string :name, null: false
      t.string :country
      t.timestamps
    end
    add_index :labor_perfumers, :slug, unique: true

    create_table :labor_perfumer_translations do |t|
      t.references :labor_perfumer, null: false, foreign_key: true, index: { name: 'idx_perf_trans_perf' }
      t.string :locale, null: false
      t.text   :bio
      t.timestamps
    end
    add_index :labor_perfumer_translations, [:labor_perfumer_id, :locale], unique: true, name: 'idx_perf_trans_locale'
  end
end
