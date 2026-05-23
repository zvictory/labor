module Spree
  class User < ApplicationRecord
    self.table_name = 'spree_users'

    include UserMethods
    include UserAddress
    include UserPaymentSource

    devise :database_authenticatable, :recoverable, :rememberable, :validatable
    include DeviseTokenAuth::Concerns::User

    # Schema has no provider/uid columns (telegram_id is the SoR). DTA's
    # password_required? still calls `provider == 'email'`, so expose stubs.
    def provider; 'email'; end
    def uid; email; end

    # Schema doesn't have a selected_locale column. Spree's Locale helper
    # calls user.selected_locale; return nil so it falls back to default.
    def selected_locale; nil; end
  end
end
