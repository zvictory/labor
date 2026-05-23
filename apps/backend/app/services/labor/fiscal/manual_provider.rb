module Labor
  module Fiscal
    class ManualProvider
      VAT_RATE = BigDecimal('0.12').freeze
      FISCAL_MARK_PREFIX = 'LBR-MAN'.freeze

      def self.issue_for_order(order)
        new(order).issue
      end

      def initialize(order)
        @order = order
      end

      def issue
        ActiveRecord::Base.transaction do
          receipt = Labor::FiscalReceipt.create!(
            order: @order,
            provider: 'manual',
            fiscal_mark: build_mark,
            status: 'pending',
            total_uzs: @order.total.to_d,
            vat_uzs: vat_amount,
            payload: payload,
            issued_at: Time.current
          )
          Labor::Fiscal::ManualReceiptJob.perform_later(receipt.id)
          receipt
        end
      end

      def vat_amount
        ((@order.item_total.to_d * VAT_RATE) / (BigDecimal(1) + VAT_RATE)).round(0)
      end

      private

      def build_mark
        "#{FISCAL_MARK_PREFIX}-#{Time.current.strftime('%Y%m%d')}-#{SecureRandom.hex(4).upcase}"
      end

      def payload
        {
          order_number: @order.number,
          customer_phone: @order.bill_address&.phone,
          line_items: @order.line_items.map do |li|
            {
              name: li.variant.product.name,
              quantity: li.quantity,
              unit_price_uzs: li.price.to_d.to_i,
              total_uzs: (li.price.to_d * li.quantity).to_i,
              vat_uzs: ((li.price.to_d * li.quantity * VAT_RATE) / (BigDecimal(1) + VAT_RATE)).round(0)
            }
          end,
          delivery_uzs: @order.shipment_total.to_i,
          adjustments_uzs: @order.adjustment_total.to_i,
          total_uzs: @order.total.to_i,
          vat_uzs: vat_amount.to_i,
          paid_at: @order.completed_at
        }
      end
    end
  end
end
