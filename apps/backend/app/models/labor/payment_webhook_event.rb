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

    # idempotency upsert helper
    def self.record!(provider:, external_txn_id:, event_type:, payload:)
      event = find_or_initialize_by(
        provider: provider,
        external_txn_id: external_txn_id,
        event_type: event_type
      )
      if event.persisted?
        event.status = 'duplicate'
        return event
      end
      event.assign_attributes(payload: payload, status: 'received')
      event.save!
      event
    end
  end
end
