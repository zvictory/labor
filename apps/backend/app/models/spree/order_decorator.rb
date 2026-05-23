module Spree
  module OrderDecorator
    def self.prepended(base)
      base.has_one :labor_fiscal_receipt,
                   class_name: 'Labor::FiscalReceipt',
                   foreign_key: :spree_order_id,
                   dependent: :destroy
      base.after_update :issue_labor_fiscal_receipt, if: :saved_change_to_state?
      base.after_update :notify_telegram_status, if: :saved_change_to_state?
    end

    private

    def issue_labor_fiscal_receipt
      return unless complete?
      return if labor_fiscal_receipt.present?

      Labor::Fiscal::ManualProvider.issue_for_order(self)
    rescue StandardError => e
      Rails.logger.error("[fiscal] issue failed order=#{number}: #{e.message}")
    end

    def notify_telegram_status
      user = self.user
      return unless user&.telegram_id
      return if ENV['BOT_INTERNAL_URL'].blank?

      event =
        case state
        when 'complete' then 'paid'
        else return
        end

      Labor::Telegram::InternalNotifyClient.post(
        event: event,
        payload: { telegram_id: user.telegram_id, order_number: number, total_uzs: total.to_i }
      )
    rescue Faraday::Error, Labor::Telegram::InternalNotifyClient::ConfigError => e
      Rails.logger.warn("[tg-notify] failed order=#{number}: #{e.message}")
    end
  end
end

Spree::Order.prepend(Spree::OrderDecorator)
