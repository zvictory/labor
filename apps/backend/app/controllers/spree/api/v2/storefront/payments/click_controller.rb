module Spree
  module Api
    module V2
      module Storefront
        module Payments
          class ClickController < ::Spree::Api::V2::BaseController
            skip_before_action :verify_authenticity_token, raise: false

            SECRET = ENV.fetch('CLICK_SECRET_KEY', '')

            # action: 0 = prepare, 1 = complete
            def prepare
              handle(action: 0)
            end

            def complete
              handle(action: 1)
            end

            private

            def handle(action:)
              p = params.permit!.to_h.with_indifferent_access
              unless Labor::Payments::ClickVerifier.verify(p, action: action, secret: SECRET)
                return render json: error_response(p, code: Labor::Payments::ClickVerifier::ERROR_SIGN, msg: 'SIGN CHECK FAILED!')
              end

              order = Spree::Order.find_by(number: p['merchant_trans_id'])
              return render json: error_response(p, code: Labor::Payments::ClickVerifier::ERROR_USER, msg: 'User does not exist') unless order

              payload = ActiveRecord::Base.transaction do
                order.lock!

                event = Labor::PaymentWebhookEvent.record!(
                  provider: 'click',
                  external_txn_id: p['click_trans_id'],
                  event_type: action == 0 ? 'prepare' : 'complete',
                  payload: p
                )

                if event.status == 'duplicate'
                  success_response(p, prepare_id: event.id)
                elsif action == 0
                  event.update!(spree_order_id: order.id, status: 'processed', processed_at: Time.current)
                  success_response(p, prepare_id: event.id)
                else
                  payment = create_payment!(order: order, amount: p['amount'].to_d, txn_id: p['click_trans_id'])
                  event.update!(spree_order_id: order.id, spree_payment_id: payment.id, status: 'processed', processed_at: Time.current)
                  success_response(p, prepare_id: p['merchant_prepare_id'])
                end
              end

              render json: payload
            rescue ActiveRecord::RecordInvalid => e
              render json: error_response(params, code: -9, msg: e.message)
            end

            def create_payment!(order:, amount:, txn_id:)
              method = Spree::PaymentMethod.find_by(type: 'Labor::PaymentMethod::Click') ||
                       Spree::PaymentMethod.find_by(name: 'Click')
              payment = order.payments.create!(
                payment_method: method,
                amount: amount,
                state: 'completed',
                response_code: txn_id,
                source_type: nil
              )
              order.update_totals
              order.payment_state = 'paid'
              order.save!
              order.finalize! if order.respond_to?(:finalize!) && order.state == 'complete'
              payment
            end

            def success_response(p, prepare_id:)
              {
                click_trans_id: p['click_trans_id'],
                merchant_trans_id: p['merchant_trans_id'],
                merchant_prepare_id: prepare_id,
                error: 0,
                error_note: 'Success'
              }
            end

            def error_response(p, code:, msg:)
              {
                click_trans_id: p['click_trans_id'],
                merchant_trans_id: p['merchant_trans_id'],
                error: code,
                error_note: msg
              }
            end
          end
        end
      end
    end
  end
end
