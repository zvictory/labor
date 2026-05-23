require_relative 'boot'

require 'rails/all'

Bundler.require(*Rails.groups)

module Labor
  class Application < Rails::Application
    config.load_defaults 7.1

    config.time_zone = 'Asia/Tashkent'
    config.active_record.default_timezone = :utc

    # i18n
    config.i18n.available_locales = %i[ru en uz uzc]
    config.i18n.default_locale = :ru
    config.i18n.fallbacks = { uz: [:ru, :en], uzc: [:uz, :ru, :en], en: [:ru], ru: [:en] }

    # API + admin only; storefront lives in Next.js
    config.api_only = false

    # Autoload nested app/ subfolders
    config.autoload_lib(ignore: %w[assets tasks])

    # ActiveJob via Sidekiq
    config.active_job.queue_adapter = :sidekiq

    # Sessions only used by /admin
    config.session_store :cookie_store, key: '_labor_session', same_site: :lax

    config.generators do |g|
      g.test_framework :rspec
      g.helper false
      g.assets false
      g.view_specs false
    end
  end
end
