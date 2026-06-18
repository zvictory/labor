require 'active_support/core_ext/integer/time'

Rails.application.configure do
  config.public_file_server.enabled = true
  config.enable_reloading = false
  config.eager_load = true
  config.consider_all_requests_local = false

  config.cache_store = :redis_cache_store, { url: ENV.fetch('REDIS_URL', 'redis://redis:6379/0') }
  config.action_controller.perform_caching = true

  config.active_storage.service = ENV.fetch('STORAGE_SERVICE', 'amazon').to_sym

  config.log_tags = [:request_id]
  config.logger = ActiveSupport::TaggedLogging.new(Logger.new($stdout))
  config.log_level = ENV.fetch('RAILS_LOG_LEVEL', 'info')

  config.action_mailer.perform_caching = false
  config.i18n.fallbacks = { uz: [:ru, :en], en: [:ru], ru: [:en] }
  config.active_support.report_deprecations = false

  config.assume_ssl = true
  config.force_ssl = ENV.fetch('FORCE_SSL', 'true') == 'true'

  config.action_mailer.default_url_options = {
    host: ENV.fetch('MAILER_HOST', 'labor.uz'),
    protocol: 'https'
  }
end
