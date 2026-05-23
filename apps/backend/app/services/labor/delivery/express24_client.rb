require 'faraday'

module Labor
  module Delivery
    # Express24 (express24.uz) same-day courier API.
    # Auth: Bearer token issued by Express24 partner cabinet.
    class Express24Client
      Error = Class.new(StandardError)
      BASE_URL = 'https://api.express24.uz/api/v1'.freeze

      def initialize(token: ENV.fetch('EXPRESS24_TOKEN', ''), branch_id: ENV.fetch('EXPRESS24_BRANCH_ID', ''))
        @token = token
        @branch_id = branch_id
      end

      def estimate(payload)
        request(:post, '/customer/order/cost-calculate', payload)
      end

      def create_order(payload, idempotency_key:)
        request(:post, '/customer/order/create', payload.merge(branch_id: @branch_id), idempotency_key: idempotency_key)
      end

      def order_info(order_id)
        request(:get, "/customer/order/#{order_id}", nil)
      end

      def cancel_order(order_id, reason:)
        request(:post, "/customer/order/#{order_id}/cancel", { reason: reason })
      end

      private

      def conn
        @conn ||= Faraday.new(url: BASE_URL) do |f|
          f.request :json
          f.response :json, content_type: /\bjson$/
          f.adapter Faraday.default_adapter
          f.options.timeout = 12
        end
      end

      def request(method, path, body, idempotency_key: nil)
        resp = conn.run_request(method, path, body && body.to_json, headers(idempotency_key))
        raise Error, "express24 #{resp.status}: #{resp.body.inspect}" if resp.status >= 400
        resp.body
      end

      def headers(idempotency_key)
        h = { 'Authorization' => "Bearer #{@token}", 'Content-Type' => 'application/json' }
        h['X-Idempotency-Key'] = idempotency_key if idempotency_key
        h
      end
    end
  end
end
