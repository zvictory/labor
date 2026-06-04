module Spree
  module Admin
    class DebugController < Spree::Admin::BaseController
      skip_before_action :authorize_admin, raise: false
      skip_before_action :load_stores, raise: false

      def show
        render plain: <<~OUT
          warden.user(:spree_user)  = #{warden.user(:spree_user)&.id.inspect}
          warden.user               = #{warden.user&.id.inspect}
          current_spree_user        = #{respond_to?(:current_spree_user) ? current_spree_user&.id.inspect : 'NO HELPER'}
          spree_current_user        = #{respond_to?(:spree_current_user) ? spree_current_user&.id.inspect : 'NO HELPER'}
          try_spree_current_user    = #{try_spree_current_user&.id.inspect}
          session.keys              = #{session.keys.inspect}
          devise_mappings           = #{Devise.mappings.keys.inspect}
          warden present?           = #{!!request.env['warden']}
        OUT
      end
    end
  end
end
