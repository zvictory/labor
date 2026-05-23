class AddDeliveryToSpreeShipments < ActiveRecord::Migration[7.1]
  def change
    add_column :spree_shipments, :delivery_provider,      :string  # yandex, express24, bts, pickup
    add_column :spree_shipments, :delivery_external_id,   :string
    add_column :spree_shipments, :delivery_payload,       :jsonb, default: {}, null: false
    add_column :spree_shipments, :delivery_quoted_price,  :integer
    add_index  :spree_shipments, :delivery_provider
    add_index  :spree_shipments, :delivery_external_id
  end
end
