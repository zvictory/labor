module Spree
  module Api
    module V2
      module Storefront
        class TelegramAuthController < ::Spree::Api::V2::BaseController
          # POST /api/v2/storefront/auth/telegram/widget
          # body: { id, first_name, last_name, username, photo_url, auth_date, hash }
          def widget
            result = Labor::TelegramAuth.new.verify_widget(params.permit!.except(:controller, :action, :format).to_h)
            return render_unauthorized(result.error) unless result.ok?

            issue_token(result.user_payload)
          end

          # POST /api/v2/storefront/auth/telegram/webapp
          # body: { init_data: "<window.Telegram.WebApp.initData>" }
          def webapp
            result = Labor::TelegramAuth.new.verify_init_data(params.require(:init_data))
            return render_unauthorized(result.error) unless result.ok?

            issue_token(result.user_payload)
          end

          private

          def issue_token(payload)
            user = Labor::TelegramUserProvisioner.call(payload)
            client_id   = SecureRandom.urlsafe_base64
            token, _    = user.create_new_auth_token(client_id)

            render json: {
              data: {
                token: token['access-token'],
                client: token['client'],
                uid: token['uid'],
                expiry: token['expiry'],
                user: {
                  id: user.id,
                  email: user.email,
                  telegram_id: user.telegram_id,
                  display_name: user.display_name,
                  preferred_locale: user.preferred_locale
                }
              }
            }
          end

          def render_unauthorized(reason)
            render json: { error: 'telegram_auth_failed', reason: reason }, status: :unauthorized
          end
        end
      end
    end
  end
end
