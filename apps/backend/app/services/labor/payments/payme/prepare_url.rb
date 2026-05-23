module Labor
  module Payments
    module Payme
      class PrepareUrl
        BASE_URL = 'https://checkout.paycom.uz'.freeze

        def self.call(order:)
          new(order).call
        end

        def initialize(order)
          @order = order
        end

        def call
          payload = [
            "m=#{ENV.fetch('PAYME_MERCHANT_ID')}",
            "ac.order_number=#{@order.number}",
            "a=#{@order.total.to_i}",
            "c=#{ENV.fetch('WEBAPP_URL')}/orders/#{@order.number}",
            'l=ru'
          ].join(';')

          "#{BASE_URL}/#{Base64.strict_encode64(payload)}"
        end
      end
    end
  end
end
