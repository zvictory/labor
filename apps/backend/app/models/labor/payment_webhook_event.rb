module Labor
  class PaymentWebhookEvent < ApplicationRecord
    PROVIDERS = %w[click payme uzum cod].freeze
    STATUSES  = %w[received processed failed duplicate].freeze

    belongs_to :order,   class_name: 'Spree::Order',   foreign_key: :spree_order_id,   optional: true
    belongs_to :payment, class_name: 'Spree::Payment', foreign_key: :spree_payment_id, optional: true

    validates :provider,        inclusion: { in: PROVIDERS }
    validates :external_txn_id, presence: true
    validates :event_type,      presence: true
    validates :status,          inclusion: { in: STATUSES }

    # idempotency upsert helper — atomic via INSERT + unique-index CAS
    def self.record!(provider:, external_txn_id:, event_type:, payload:)
      event = create_or_find_by!(
        provider: provider,
        external_txn_id: external_txn_id,
        event_type: event_type
      ) do |e|
        e.payload = payload
        e.status  = 'received'
      end
      event.tap { |e| e.status = 'duplicate' unless e.previously_new_record? }
    end
  end
end
