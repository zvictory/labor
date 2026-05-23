module Spree
  module Admin
    module BaseControllerDecorator
      include ::Labor::AdminAuth

      # Override Spree's `spree_current_user` to use the warden-session user
      # surfaced by `Labor::AdminAuth#current_admin_user` instead of DTA's
      # token-driven `current_spree_user`. See Labor::AdminAuth for the full
      # rationale.
      def spree_current_user
        @spree_current_user ||= current_admin_user
      end
      helper_method :spree_current_user if respond_to?(:helper_method)
    end
  end
end

Spree::Admin::BaseController.prepend(Spree::Admin::BaseControllerDecorator)
