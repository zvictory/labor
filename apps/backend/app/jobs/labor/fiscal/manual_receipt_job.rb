module Labor
  module Fiscal
    class ManualReceiptJob < ApplicationJob
      # Routed to the HIGH sidekiq process via the :default queue
      # (sidekiq_high.yml lists default last after webhooks, mailers).
      # Fiscal receipts must not wait behind a 10k-row broadcast.
      queue_as :default
      retry_on StandardError, wait: :polynomially_longer, attempts: 5

      def perform(receipt_id)
        receipt = Labor::FiscalReceipt.find(receipt_id)
        return if receipt.status == 'issued'

        send_to_admin(receipt)
        receipt.update!(status: 'issued', acknowledged_at: Time.current)
      end

      private

      def send_to_admin(receipt)
        admin_chat = ENV['TELEGRAM_ADMIN_CHAT_ID']
        return if admin_chat.blank?

        text = format_receipt(receipt)
        Labor::Telegram::InternalNotifyClient.post(
          event: 'fiscal',
          payload: { chat_id: admin_chat, text: text, receipt_id: receipt.id }
        )
      end

      def format_receipt(receipt)
        order = receipt.order
        lines = receipt.payload['line_items'].map do |li|
          "• #{li['name']} ×#{li['quantity']} — #{format_uzs(li['total_uzs'])}"
        end.join("\n")

        <<~TEXT
          🧾 Чек ##{receipt.fiscal_mark}
          Заказ: #{order.number}
          #{lines}
          Доставка: #{format_uzs(receipt.payload['delivery_uzs'])}
          Скидка: #{format_uzs(receipt.payload['adjustments_uzs'])}
          Итого: #{format_uzs(receipt.total_uzs)}
          НДС (12%): #{format_uzs(receipt.vat_uzs)}
        TEXT
      end

      def format_uzs(amount)
        "#{amount.to_i.to_s.reverse.scan(/\d{1,3}/).join(' ').reverse} UZS"
      end
    end
  end
end
