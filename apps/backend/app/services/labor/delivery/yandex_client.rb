require 'faraday'
require 'faraday/retry'

module Labor
  module Delivery
    # Thin Yandex Delivery API wrapper.
    # Docs: https://yandex.ru/dev/delivery-3-0/doc/dg/api-ref/
    class YandexClient
      Error = Class.new(StandardError)
      BASE_URL = 'https://b2b.taxi.yandex.net'.freeze

      def initialize(token: ENV.fetch('YANDEX_DELIVERY_TOKEN', ''))
        @token = token
      end

      def check_price(body)
        request(:post, '/b2b/cargo/integration/v2/check-price', body)
      end

      def create_claim(body, idempotency_key:)
        request(:post, '/b2b/cargo/integration/v2/claims/create', body, idempotency_key: idempotency_key)
      end

      def accept_claim(claim_id:)
        request(:post, "/b2b/cargo/integration/v2/claims/accept?claim_id=#{claim_id}", {})
      end

      def claim_info(claim_id:)
        request(:get, "/b2b/cargo/integration/v2/claims/info?claim_id=#{claim_id}", nil)
      end

      def cancel_claim(claim_id:, version:, state: 'free')
        request(:post, "/b2b/cargo/integration/v2/claims/cancel?claim_id=#{claim_id}",
                { version: version, cancel_state: state })
      end

      private

      def conn
        @conn ||= Faraday.new(url: BASE_URL) do |f|
          f.request :retry, max: 2, interval: 0.3, backoff_factor: 2, retry_statuses: [502, 503, 504]
          f.request :json
          f.response :json, content_type: /\bjson$/
          f.adapter Faraday.default_adapter
          f.options.timeout = 15
        end
      end

      def request(method, path, body, idempotency_key: nil)
        resp = conn.run_request(method, path, body && body.to_json, build_headers(idempotency_key))
        raise Error, "yandex_delivery #{resp.status}: #{resp.body.inspect}" if resp.status >= 400
        resp.body
      end

      def build_headers(idempotency_key)
        {
          'Authorization' => "Bearer #{@token}",
          'Accept-Language' => 'ru',
          'Content-Type' => 'application/json'
        }.tap do |h|
          h['X-Idempotency-Token'] = idempotency_key if idempotency_key
        end
      end
    end
  end
end
