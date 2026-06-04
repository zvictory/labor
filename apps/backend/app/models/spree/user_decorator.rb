module Spree
  module UserDecorator
    def self.prepended(base)
      base.has_many :labor_votes,    class_name: 'Labor::Vote', foreign_key: :spree_user_id
      base.has_many :labor_wishlist, class_name: 'Labor::WishlistItem', foreign_key: :spree_user_id
      base.has_many :wishlisted_products, through: :labor_wishlist, source: :product

      base.validates :telegram_id, uniqueness: true, allow_nil: true
      base.validates :preferred_locale, inclusion: { in: %w[ru en uz] }
      base.scope :via_telegram, -> { where.not(telegram_id: nil) }
    end

    # `unless defined?` guards against "already initialized constant" warnings
    # in dev — Spree's to_prepare reloads decorators on each request.
    SUPPORTED_LOCALES = %w[ru en uz].freeze unless defined?(SUPPORTED_LOCALES)

    def telegram?
      telegram_id.present?
    end

    def display_name
      telegram_username.presence || telegram_first_name.presence || email.split('@').first
    end
  end
end

Spree::User.prepend(Spree::UserDecorator)
