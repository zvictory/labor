module Labor
  # Isolates the one place that reads warden's session directly.
  #
  # Spree admin runs alongside devise-token-auth (DTA). DTA's
  # `current_spree_user` helper goes through warden.authenticate which runs
  # DTA's token strategy — without a token header it returns nil even when
  # warden's session has a signed-in user. The admin browser flow uses
  # Devise's session strategy, so we read warden's session-resolved user
  # directly. Keep this helper as the single point that touches
  # `request.env['warden']` so a future Devise/Warden upgrade has exactly
  # one site to audit.
  module AdminAuth
    extend ActiveSupport::Concern

    # Returns the user authenticated against warden's :spree_user scope, or
    # nil when no session is present. Memoized per-request.
    def current_admin_user
      return @current_admin_user if defined?(@current_admin_user)

      warden = request.env['warden']
      @current_admin_user = warden&.user(:spree_user)
    end
  end
end
