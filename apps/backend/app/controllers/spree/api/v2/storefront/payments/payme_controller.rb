module Spree
  module Api
    module V2
      module Storefront
        module Payments
          # Payme JSON-RPC subscribe API.
          # Auth: Basic "Paycom:<merchant_key>"
          # Methods: CheckPerformTransaction, CreateTransaction, PerformTransaction, CancelTransaction, CheckTransaction, GetStatement
          class PaymeController < ::Spree::Api::V2::BaseController
            # Spree 5 port: V3::BaseController inherits ActionController::API which
            # does not bundle HTTP basic auth helpers — include them explicitly.
            include ActionController::HttpAuthentication::Basic::ControllerMethods
            skip_before_action :verify_authenticity_token, raise: false

            MERCHANT_KEY = ENV.fetch('PAYME_MERCHANT_KEY', '')

            JSON_RPC_PARSE_ERROR = -32700
            JSON_RPC_INVALID     = -32600
            ERROR_AUTH           = -32504
            ERROR_ORDER_NOT_FOUND = -31050
            ERROR_AMOUNT          = -31001
            ERROR_TXN_NOT_FOUND   = -31003
            ERROR_TXN_STATE       = -31008

            TIMESTAMP_MAX_SKEW_MS = 5 * 60 * 1000

            def rpc
              return render_error(JSON_RPC_PARSE_ERROR, 'Parse error') if request.body.size.zero?
              unless authenticated?
                return render_error(ERROR_AUTH, 'Insufficient privilege to perform this method')
              end

              body = JSON.parse(request.body.read)
              method = body['method']
              p = body['params'] || {}

              case method
              when 'CheckPerformTransaction' then render_result(check_perform(p))
              when 'CreateTransaction'       then render_result(create_txn(p))
              when 'PerformTransaction'      then render_result(perform_txn(p))
              when 'CancelTransaction'       then render_result(cancel_txn(p))
              when 'CheckTransaction'        then render_result(check_txn(p))
              when 'GetStatement'            then render_result(get_statement(p))
              else
                render_error(JSON_RPC_INVALID, "Method not found: #{method}")
              end
            rescue JSON::ParserError
              render_error(JSON_RPC_PARSE_ERROR, 'Parse error')
            rescue PaymeError => e
              render_error(e.code, e.message)
            end

            private

            def authenticated?
              authenticate_with_http_basic do |u, p|
                u == 'Paycom' && ActiveSupport::SecurityUtils.secure_compare(p.to_s, MERCHANT_KEY)
              end
            end

            def order_for(p)
              number = p.dig('account', 'order_id') || p.dig('account', 'order')
              Spree::Order.find_by(number: number)
            end

            def check_perform(p)
              order = order_for(p)
                raise PaymeError.new(ERROR_ORDER_NOT_FOUND, 'Order not found') unless order
              # Payme works in tiyin — but UZS has no minor units, so we treat amount directly.
              raise PaymeError.new(ERROR_AMOUNT, 'Invalid amount') if p['amount'].to_i != order.total.to_i
              { allow: true }
            end

            def create_txn(p)
              enforce_timestamp_window!(p)
              order = order_for(p)
              raise PaymeError.new(ERROR_ORDER_NOT_FOUND, 'Order not found') unless order
              raise PaymeError.new(ERROR_AMOUNT, 'Invalid amount') if p['amount'].to_i != order.total.to_i

              event = Labor::PaymentWebhookEvent.record!(
                provider: 'payme',
                external_txn_id: p['id'],
                event_type: 'create',
                payload: p
              )
              event.update!(spree_order_id: order.id, status: 'processed', processed_at: Time.current) if event.status == 'received'

              {
                transaction: event.id.to_s,
                state: 1,
                create_time: (event.created_at.to_f * 1000).to_i
              }
            end

            def perform_txn(p)
              enforce_timestamp_window!(p)
              event = Labor::PaymentWebhookEvent.find_by(provider: 'payme', external_txn_id: p['id'], event_type: 'create')
              raise PaymeError.new(ERROR_TXN_NOT_FOUND, 'Transaction not found') unless event

              perform_event = ActiveRecord::Base.transaction do
                order = Spree::Order.lock.find_by(id: event.spree_order_id)
                raise PaymeError.new(ERROR_TXN_STATE, 'Invalid order state') unless order

                pe = Labor::PaymentWebhookEvent.record!(
                  provider: 'payme',
                  external_txn_id: p['id'],
                  event_type: 'perform',
                  payload: p
                )

                if pe.status == 'received'
                  payment = create_payment!(order: order, txn_id: p['id'])
                  pe.update!(spree_order_id: order.id, spree_payment_id: payment.id, status: 'processed', processed_at: Time.current)
                end

                pe
              end

              {
                transaction: event.id.to_s,
                state: 2,
                perform_time: (perform_event.processed_at.to_f * 1000).to_i
              }
            end

            def cancel_txn(p)
              event = Labor::PaymentWebhookEvent.find_by(provider: 'payme', external_txn_id: p['id'], event_type: 'create')
              raise PaymeError.new(ERROR_TXN_NOT_FOUND, 'Transaction not found') unless event

              cancel_event = Labor::PaymentWebhookEvent.record!(
                provider: 'payme',
                external_txn_id: p['id'],
                event_type: 'cancel',
                payload: p
              )
              cancel_event.update!(spree_order_id: event.spree_order_id, status: 'processed', processed_at: Time.current) if cancel_event.status == 'received'

              order = event.order
              if order && order.payment_state == 'paid'
                order.payments.where(state: 'completed').find_each(&:void!)
                order.payment_state = 'void'
                order.save!
              end

              {
                transaction: event.id.to_s,
                cancel_time: (cancel_event.processed_at.to_f * 1000).to_i,
                state: -1
              }
            end

            def check_txn(p)
              event = Labor::PaymentWebhookEvent.find_by(provider: 'payme', external_txn_id: p['id'], event_type: 'create')
              raise PaymeError.new(ERROR_TXN_NOT_FOUND, 'Transaction not found') unless event

              perform = Labor::PaymentWebhookEvent.find_by(provider: 'payme', external_txn_id: p['id'], event_type: 'perform')
              cancel  = Labor::PaymentWebhookEvent.find_by(provider: 'payme', external_txn_id: p['id'], event_type: 'cancel')

              state =
                if cancel then -1
                elsif perform then 2
                else 1
                end

              {
                create_time: (event.created_at.to_f * 1000).to_i,
                perform_time: perform ? (perform.processed_at.to_f * 1000).to_i : 0,
                cancel_time:  cancel  ? (cancel.processed_at.to_f * 1000).to_i  : 0,
                transaction: event.id.to_s,
                state: state,
                reason: nil
              }
            end

            def get_statement(p)
              from = Time.at(p['from'].to_i / 1000.0)
              to   = Time.at(p['to'].to_i / 1000.0)
              events = Labor::PaymentWebhookEvent.where(provider: 'payme', event_type: 'create', created_at: from..to)
              {
                transactions: events.map do |e|
                  {
                    id: e.external_txn_id,
                    time: (e.created_at.to_f * 1000).to_i,
                    amount: e.payload['amount'],
                    account: e.payload['account'],
                    transaction: e.id.to_s,
                    state: 1,
                    create_time: (e.created_at.to_f * 1000).to_i,
                    perform_time: 0,
                    cancel_time: 0,
                    reason: nil
                  }
                end
              }
            end

            def create_payment!(order:, txn_id:)
              method = Spree::PaymentMethod.find_by(type: 'Labor::PaymentMethod::Payme') ||
                       Spree::PaymentMethod.find_by(name: 'Payme')
              payment = order.payments.create!(
                payment_method: method,
                amount: order.total,
                state: 'completed',
                response_code: txn_id,
                source_type: nil
              )
              order.update_totals
              order.payment_state = 'paid'
              order.save!
              payment
            end

            def enforce_timestamp_window!(p)
              ts = p['time']
              return if ts.nil?
              skew = (Time.current.to_f * 1000) - ts.to_i
              return if skew.abs <= TIMESTAMP_MAX_SKEW_MS
              raise PaymeError.new(ERROR_AUTH, 'Request timestamp outside allowed window')
            end

            def render_result(result)
              render json: { result: result }
            end

            def render_error(code, message)
              render json: { error: { code: code, message: { ru: message, en: message, uz: message } } }
            end

            class PaymeError < StandardError
              attr_reader :code
              def initialize(code, message)
                super(message)
                @code = code
              end
            end
          end
        end
      end
    end
  end
end
