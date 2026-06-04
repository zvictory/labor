module Spree
  module Api
    module V2
      module Storefront
        # PATCH /api/v2/storefront/account/locale
        # body: { locale: 'ru' | 'en' | 'uz' }
        # Auth: devise_token_auth headers (access-token / client / uid).
        # Persists the signed-in user's UI language preference.
        class AccountLocaleController < ::Spree::Api::V2::BaseController
          before_action :require_authenticated_user!

          def update
            locale = params[:locale].to_s
            unless Spree::UserDecorator::SUPPORTED_LOCALES.include?(locale)
              return render json: { error: 'unsupported_locale' }, status: :unprocessable_content
            end

            try_spree_current_user.update!(preferred_locale: locale)
            head :no_content
          end

          private

          def require_authenticated_user!
            return if try_spree_current_user
            render json: { error: 'unauthenticated' }, status: :unauthorized
          end
        end
      end
    end
  end
end
