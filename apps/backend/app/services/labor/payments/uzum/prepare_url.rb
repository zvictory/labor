module Labor
  module Payments
    module Uzum
      class PrepareUrl
        BASE_URL = 'https://www.oxapay.com/uz/pay'.freeze

        def self.call(order:)
          new(order).call
        end

        def initialize(order)
          @order = order
        end

        def call
          conn = Faraday.new(url: ENV.fetch('UZUM_API_URL', 'https://api.uzumbank.uz/api/v1')) do |f|
            f.request :json
            f.response :json
            f.adapter Faraday.default_adapter
          end

          response = conn.post('/payments/create') do |req|
            req.headers['X-Merchant-Id'] = ENV.fetch('UZUM_MERCHANT_ID')
            req.headers['X-API-Key'] = ENV.fetch('UZUM_API_KEY')
            req.body = {
              amount: @order.total.to_i,
              currency: 'UZS',
              order_id: @order.number,
              return_url: "#{ENV.fetch('WEBAPP_URL')}/orders/#{@order.number}",
              callback_url: "#{ENV.fetch('BACKEND_PUBLIC_URL')}/storefront/payments/uzum/callback"
            }
          end

          response.body.dig('data', 'redirect_url') ||
            raise("Uzum prepare failed: #{response.body.inspect}")
        end
      end
    end
  end
end
