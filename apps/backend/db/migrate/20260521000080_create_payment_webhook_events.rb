class CreatePaymentWebhookEvents < ActiveRecord::Migration[7.1]
  def change
    create_table :labor_payment_webhook_events do |t|
      t.string  :provider, null: false        # click, payme, uzum
      t.string  :external_txn_id, null: false
      t.string  :event_type, null: false      # prepare, complete, cancel, callback
      t.string  :status, null: false, default: 'received' # received, processed, failed, duplicate
      t.references :spree_order, foreign_key: { to_table: :spree_orders }, index: { name: 'idx_pwe_order' }
      t.references :spree_payment, foreign_key: { to_table: :spree_payments }, index: { name: 'idx_pwe_payment' }
      t.jsonb   :payload, default: {}, null: false
      t.jsonb   :response, default: {}, null: false
      t.text    :error_message
      t.datetime :processed_at
      t.timestamps
    end
    add_index :labor_payment_webhook_events, [:provider, :external_txn_id, :event_type], unique: true, name: 'idx_pwe_idempotency'
  end
end
