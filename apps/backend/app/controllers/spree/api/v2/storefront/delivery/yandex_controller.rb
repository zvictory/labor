module Spree
  module Api
    module V2
      module Storefront
        module Delivery
          # Yandex Delivery storefront endpoints.
          #   POST quote   -> price estimate for current order address
          #   POST webhook -> async claim status updates (estimating | ready_for_approval |
          #                   accepted | performer_found | pickuped | delivered | cancelled | failed)
          class YandexController < ::Spree::Api::V2::BaseController
            skip_before_action :verify_authenticity_token, raise: false

            def quote
              # Spree 5 port: V3::BaseController no longer provides `current_order` —
              # storefront cart session is gone, callers must pass `order_number`.
              order = Spree::Order.find_by(number: params[:order_number])
              return render json: { error: 'order_not_found' }, status: :not_found unless order

              client = Labor::Delivery::YandexClient.new
              body = Labor::Delivery::YandexQuoteBuilder.call(order: order)
              resp = client.check_price(body)

              # UZS — no minor units, Yandex returns price as string.
              price = resp['price'].to_d
              render json: { provider: 'yandex', price: price, currency: 'UZS', eta_minutes: resp['eta'] }
            rescue Labor::Delivery::YandexClient::Error => e
              render json: { error: 'yandex_unavailable', detail: e.message }, status: :bad_gateway
            end

            def webhook
              raw = request.body.read
              body = JSON.parse(raw)
              claim_id = body['claim_id'] || body.dig('claim', 'id')
              status   = body['status']   || body.dig('claim', 'status')

              event = Labor::PaymentWebhookEvent.record!(
                provider: 'yandex_delivery',
                external_txn_id: claim_id,
                event_type: status.to_s,
                payload: body
              )

              shipment = Spree::Shipment.find_by(delivery_external_id: claim_id)
              if shipment
                shipment.update!(delivery_payload: (shipment.delivery_payload || {}).merge('last_status' => status, 'updated_at' => Time.current))
                Spree::Shipments::Yandex::StatusMapper.apply!(shipment, status) if defined?(Spree::Shipments::Yandex::StatusMapper)
                event.update!(spree_order_id: shipment.order_id, status: 'processed', processed_at: Time.current)
              end

              render json: { ok: true }
            rescue JSON::ParserError
              render json: { ok: false, error: 'bad_json' }, status: :bad_request
            end
          end
        end
      end
    end
  end
end
