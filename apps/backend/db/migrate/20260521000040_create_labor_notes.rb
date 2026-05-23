class CreateLaborNotes < ActiveRecord::Migration[7.1]
  def change
    create_table :labor_notes do |t|
      t.string :slug, null: false
      t.string :name, null: false
      t.string :family # citrus, floral, woody, oriental, fougere, chypre, gourmand
      t.string :icon_url
      t.timestamps
    end
    add_index :labor_notes, :slug, unique: true
    add_index :labor_notes, :family

    create_table :labor_note_translations do |t|
      t.references :labor_note, null: false, foreign_key: true, index: { name: 'idx_note_trans_note' }
      t.string :locale, null: false
      t.string :name
      t.text   :description
      t.timestamps
    end
    add_index :labor_note_translations, [:labor_note_id, :locale], unique: true, name: 'idx_note_trans_locale'
  end
end
