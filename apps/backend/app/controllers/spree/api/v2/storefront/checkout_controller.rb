module Spree
  module Api
    module V2
      module Storefront
        class CheckoutController < ::Spree::Api::V2::BaseController
          def create
            ActiveRecord::Base.transaction do
              user = resolve_user
              order = build_order(user)
              attach_address(order)
              apply_promo(order)
              attach_shipping(order)
              advance_order(order)
              redirect = enqueue_payment(order)

              render json: {
                data: {
                  number: order.number,
                  total: order.total.to_i,
                  payment_redirect_url: redirect
                }
              }
            end
          rescue ActiveRecord::RecordInvalid => e
            render_error(:unprocessable_content, e.record.errors.full_messages.join(', '))
          # Spree 5 port: V2 BaseController used to render ParameterMissing as 400 — V3 doesn't.
          rescue ActionController::ParameterMissing => e
            render_error(:bad_request, "param missing: #{e.param}")
          end

          private

          def resolve_user
            return try_spree_current_user if try_spree_current_user

            init_data = params[:init_data]
            return nil if init_data.blank?

            Labor::TelegramAuth.from_webapp(init_data: init_data).user
          end

          def build_order(user)
            order = Spree::Order.create!(
              user: user,
              email: user&.email,
              currency: 'UZS',
              store: current_store
            )
            params.require(:line_items).each do |li|
              variant = Spree::Variant.find(li[:variant_id])
              order.contents.add(variant, li[:quantity].to_i)
            end
            order
          end

          def attach_address(order)
            addr = params.require(:ship_address)
            ship = Spree::Address.create!(
              firstname: addr[:name].to_s.split(/\s+/, 2).first,
              lastname: addr[:name].to_s.split(/\s+/, 2).last,
              phone: addr[:phone],
              city: addr[:city],
              address1: addr[:address],
              country: default_country,
              state: state_for(addr[:city]),
              zipcode: '100000'
            )
            order.update!(ship_address: ship, bill_address: ship)
          end

          def apply_promo(order)
            code = params[:promo_code]
            return if code.blank?

            result = Labor::Promo::Apply.call(order: order, code: code)
            Rails.logger.warn("[promo] #{result.error_code} code=#{code}") unless result.success?
          end

          def attach_shipping(order)
            provider = params.require(:delivery_provider)
            order.shipments.each do |shipment|
              shipment.update!(delivery_provider: provider)
            end
          end

          def advance_order(order)
            order.next while order.can_proceed?
          end

          def enqueue_payment(order)
            method = params.require(:payment_method)
            case method
            when 'click'
              Labor::Payments::Click::PrepareUrl.call(order: order)
            when 'payme'
              Labor::Payments::Payme::PrepareUrl.call(order: order)
            when 'uzum'
              Labor::Payments::Uzum::PrepareUrl.call(order: order)
            when 'cod'
              order.update!(payment_state: 'balance_due')
              nil
            else
              raise ArgumentError, "unknown payment method: #{method}"
            end
          end

          def default_country
            Spree::Country.find_by!(iso: 'UZ')
          end

          def state_for(city)
            return nil if city.blank?
            Spree::State.find_by('LOWER(name) = ?', city.downcase) ||
              Spree::State.first
          end

          def render_error(status, message)
            render json: { error: message }, status: status
          end
        end
      end
    end
  end
end
