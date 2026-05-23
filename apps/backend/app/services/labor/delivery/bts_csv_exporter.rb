require 'csv'

module Labor
  module Delivery
    # BTS Express export. BTS accepts a CSV upload with a fixed column order.
    # Columns derived from BTS partner spec v2.3 (Cyrillic headers preferred).
    class BtsCsvExporter
      HEADERS = [
        'Tracking', 'Recipient', 'Phone', 'Region', 'District', 'Address',
        'WeightKg', 'DeclaredValueUZS', 'Items', 'CodAmountUZS', 'Comment'
      ].freeze

      def self.call(scope: default_scope)
        new(scope).call
      end

      def self.default_scope
        Spree::Shipment
          .joins(:order)
          .where(delivery_provider: %w[bts manual], state: %w[pending ready])
          .where(spree_orders: { payment_state: %w[paid balance_due] })
      end

      def initialize(scope)
        @scope = scope
      end

      def call
        CSV.generate(col_sep: ';', force_quotes: true) do |csv|
          csv << HEADERS
          @scope.find_each { |s| csv << row_for(s) }
        end
      end

      private

      def row_for(shipment)
        order = shipment.order
        addr  = order.ship_address
        bill  = order.bill_address
        items_summary = order.line_items.map { |li| "#{li.variant.product.name} x#{li.quantity}" }.join(' | ')

        [
          shipment.number,
          [bill&.firstname, bill&.lastname].compact.join(' '),
          bill&.phone,
          addr&.state&.name,
          addr&.city,
          [addr&.address1, addr&.address2].compact.reject(&:empty?).join(', '),
          shipment_weight_kg(shipment),
          order.total.to_i,
          items_summary,
          order.payment_state == 'paid' ? 0 : order.total.to_i,
          order.special_instructions.to_s
        ]
      end

      def shipment_weight_kg(shipment)
        # 0.4kg per bottle is good enough for BTS pricing tiers.
        (shipment.line_items.sum { |li| li.quantity * 0.4 }).round(2)
      end
    end
  end
end
