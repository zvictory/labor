require 'active_support/core_ext/integer/time'

Rails.application.configure do
  config.enable_reloading = false
  config.eager_load = ENV['CI'].present?
  config.cache_classes = true
  config.cache_store = :null_store

  config.consider_all_requests_local = true
  config.action_controller.perform_caching = false

  config.action_dispatch.show_exceptions = :rescuable
  config.action_controller.allow_forgery_protection = false

  config.active_storage.service = :test
  config.active_job.queue_adapter = :test

  config.action_mailer.delivery_method = :test
  config.action_mailer.default_url_options = { host: 'www.example.com' }

  config.active_support.deprecation = :stderr
end
