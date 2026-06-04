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

            # Spree 5's V3 storefront API authenticates via JWT Bearer only
            # (see Spree::Api::V3::JwtAuthentication). `generate_jwt` is the
            # protected helper that concern exposes; the storefront/bot send it
            # back as `Authorization: Bearer <token>`.
            render json: {
              data: {
                token: generate_jwt(user),
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
