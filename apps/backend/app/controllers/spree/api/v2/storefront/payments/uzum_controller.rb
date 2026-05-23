module Spree
  module Api
    module V2
      module Storefront
        module Payments
          # Uzum Pay callback handler.
          # Headers contain HMAC-SHA256 signature of body using merchant_secret.
          class UzumController < ::Spree::Api::V2::BaseController
            skip_before_action :verify_authenticity_token, raise: false

            SECRET = ENV.fetch('UZUM_SECRET', '')

            TIMESTAMP_MAX_SKEW_SECONDS = 5 * 60

            def callback
              raw = request.body.read
              signature = (request.headers['X-Signature'] || params[:signature].to_s).to_s.downcase
              expected  = OpenSSL::HMAC.hexdigest('SHA256', SECRET, raw)
              unless expected.bytesize == signature.bytesize && ActiveSupport::SecurityUtils.secure_compare(expected, signature)
                return render json: { ok: false, error: 'bad_signature' }, status: :unauthorized
              end

              unless within_timestamp_window?(request.headers['X-Timestamp'])
                return render json: { ok: false, error: 'stale_request' }, status: :unauthorized
              end

              body = JSON.parse(raw)
              order = Spree::Order.find_by(number: body['order_id'])
              return render json: { ok: false, error: 'order_not_found' }, status: :not_found unless order

              event = Labor::PaymentWebhookEvent.record!(
                provider: 'uzum',
                external_txn_id: body['transaction_id'],
                event_type: body['event'] || 'callback',
                payload: body
              )

              if event.status == 'received' && body['status'] == 'success'
                payment = order.payments.create!(
                  payment_method: Spree::PaymentMethod.find_by(name: 'Uzum'),
                  amount: body['amount'].to_d,
                  state: 'completed',
                  response_code: body['transaction_id']
                )
                order.payment_state = 'paid'
                order.save!
                event.update!(spree_order_id: order.id, spree_payment_id: payment.id, status: 'processed', processed_at: Time.current)
              end

              render json: { ok: true }
            rescue JSON::ParserError
              render json: { ok: false, error: 'bad_json' }, status: :bad_request
            end

            private

            # Uzum sends an `X-Timestamp` header (Unix seconds) on callbacks.
            # We require it to be present and within 5 minutes of server time to
            # block replay attacks. Reject when missing or stale.
            def within_timestamp_window?(header)
              return false if header.to_s.empty?
              ts = header.to_i
              return false if ts.zero?
              (Time.current.to_i - ts).abs <= TIMESTAMP_MAX_SKEW_SECONDS
            end
          end
        end
      end
    end
  end
end
