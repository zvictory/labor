# frozen_string_literal: true

# Error monitoring (Rails + Sidekiq).
#
# DELIBERATELY NOT fail-fast — contrast 00_required_env.rb, which raises on a
# missing security secret. Observability is not a security secret: a blank DSN
# must mean "monitoring off," never "app won't boot." So we return early before
# touching the Sentry constant. (This also makes the file safe to evaluate even
# in the window before `bundle install` has loaded the gem, since the guard
# fires first whenever the DSN is unset — the normal dev/test default.)
#
# SENTRY_DSN is therefore documented in .env.example as OPTIONAL and is NOT in
# REQUIRED_ENV_KEYS.
return if ENV['SENTRY_DSN'].blank?

Sentry.init do |config|
  config.dsn = ENV['SENTRY_DSN']

  # active_support_logger + http_logger give request/SQL/outbound-HTTP context
  # on each event — the breadcrumbs that turn a bare 500 into a diagnosable one.
  config.breadcrumbs_logger = %i[active_support_logger http_logger]

  # Low trace sampling pre-launch: capture errors, not a performance-tracing
  # bill. Raise once there is real traffic to profile.
  config.traces_sample_rate = 0.1

  # Checkout carries customer names/phones. Keep that PII out of the error
  # pipeline unless a specific debug session opts in.
  config.send_default_pii = false
end
