module Spree
  module Api
    module V2
      module Storefront
        module Delivery
          # Express24 Tashkent same-day quote/create endpoints.
          class Express24Controller < ::Spree::Api::V2::BaseController
            skip_before_action :verify_authenticity_token, raise: false

            def quote
              # Spree 5 port: V3::BaseController no longer provides `current_order`.
              order = Spree::Order.find_by(number: params[:order_number])
              return render json: { error: 'order_not_found' }, status: :not_found unless order

              addr = order.ship_address
              return render json: { error: 'tashkent_only' }, status: :unprocessable_content unless tashkent?(addr)

              client = Labor::Delivery::Express24Client.new
              resp = client.estimate(payload_for(order))
              render json: { provider: 'express24', price: resp['cost'].to_d, currency: 'UZS' }
            rescue Labor::Delivery::Express24Client::Error => e
              render json: { error: 'express24_unavailable', detail: e.message }, status: :bad_gateway
            end

            def webhook
              raw = request.body.read
              body = JSON.parse(raw)
              status_signature = request.headers['X-Express24-Signature'].to_s
              expected = OpenSSL::HMAC.hexdigest('SHA256', ENV.fetch('EXPRESS24_WEBHOOK_SECRET', ''), raw)
              unless ActiveSupport::SecurityUtils.secure_compare(expected, status_signature.downcase)
                return render json: { ok: false, error: 'bad_signature' }, status: :unauthorized
              end

              event = Labor::PaymentWebhookEvent.record!(
                provider: 'express24',
                external_txn_id: body['order_id'].to_s,
                event_type: body['status'].to_s,
                payload: body
              )

              shipment = Spree::Shipment.find_by(delivery_external_id: body['order_id'].to_s)
              shipment&.update!(delivery_payload: (shipment.delivery_payload || {}).merge('last_status' => body['status']))
              event.update!(spree_order_id: shipment&.order_id, status: 'processed', processed_at: Time.current)

              render json: { ok: true }
            rescue JSON::ParserError
              render json: { ok: false, error: 'bad_json' }, status: :bad_request
            end

            private

            def tashkent?(addr)
              return false unless addr
              addr.city.to_s.match?(/tashkent|ташкент|toshkent/i) ||
                addr.state&.name.to_s.match?(/tashkent|ташкент|toshkent/i)
            end

            def payload_for(order)
              addr = order.ship_address
              {
                receiver_address: {
                  name: [addr.city, addr.address1].compact.join(', '),
                  lat: addr.latitude.to_f,
                  lon: addr.longitude.to_f
                },
                items: order.line_items.map { |li| { name: li.variant.product.name, quantity: li.quantity, weight: 0.4 } },
                payment_type: order.payment_state == 'paid' ? 'paid' : 'cash_on_delivery',
                payment_amount: order.total.to_i
              }
            end
          end
        end
      end
    end
  end
end
