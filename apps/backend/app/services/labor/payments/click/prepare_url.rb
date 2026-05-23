module Labor
  module Payments
    module Click
      class PrepareUrl
        BASE_URL = 'https://my.click.uz/services/pay'.freeze

        def self.call(order:)
          new(order).call
        end

        def initialize(order)
          @order = order
        end

        def call
          params = {
            service_id: ENV.fetch('CLICK_SERVICE_ID'),
            merchant_id: ENV.fetch('CLICK_MERCHANT_ID'),
            amount: @order.total.to_i,
            transaction_param: @order.number,
            return_url: "#{ENV.fetch('WEBAPP_URL')}/orders/#{@order.number}",
            card_type: 'uzcard'
          }
          "#{BASE_URL}?#{params.map { |k, v| "#{k}=#{CGI.escape(v.to_s)}" }.join('&')}"
        end
      end
    end
  end
end
