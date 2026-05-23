module Labor
  class FiscalReceipt < ApplicationRecord
    PROVIDERS = %w[manual ofd_v1].freeze
    STATUSES  = %w[pending issued failed voided].freeze

    belongs_to :order, class_name: 'Spree::Order', foreign_key: :spree_order_id

    validates :provider, inclusion: { in: PROVIDERS }
    validates :status,   inclusion: { in: STATUSES }
  end
end
