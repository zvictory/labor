module Spree
  module ShipmentDecorator
    # `unless defined?` guards against "already initialized constant" warnings
    # in dev — Spree's to_prepare reloads decorators on each request.
    PROVIDERS = %w[yandex express24 bts manual cod].freeze unless defined?(PROVIDERS)

    def self.prepended(base)
      base.validates :delivery_provider, inclusion: { in: PROVIDERS }, allow_nil: true
    end

    def delivery_provider_display
      I18n.t("labor.delivery.providers.#{delivery_provider}", default: delivery_provider&.titleize || '—')
    end

    def trackable?
      delivery_external_id.present? && %w[yandex express24].include?(delivery_provider)
    end

    Spree::Shipment.prepend(self) unless Spree::Shipment.included_modules.include?(self)
  end
end
