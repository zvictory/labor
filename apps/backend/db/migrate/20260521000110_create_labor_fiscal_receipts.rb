class CreateLaborFiscalReceipts < ActiveRecord::Migration[7.1]
  def change
    create_table :labor_fiscal_receipts do |t|
      t.references :spree_order, null: false, foreign_key: { to_table: :spree_orders }, index: { name: 'idx_fr_order' }
      t.string  :provider, null: false, default: 'manual' # manual, ofd_v1
      t.string  :status, null: false, default: 'pending'  # pending, issued, failed, voided
      t.string  :receipt_number
      t.string  :fiscal_sign
      t.datetime :issued_at
      t.text    :pdf_url
      t.jsonb   :payload, default: {}, null: false
      t.timestamps
    end
    add_index :labor_fiscal_receipts, :receipt_number, unique: true, where: 'receipt_number IS NOT NULL'
  end
end
