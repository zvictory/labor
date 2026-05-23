# frozen_string_literal: true

# Fail-fast required environment variable check.
#
# The 00_ prefix ensures this initializer runs before any other config touches
# ENV. In production, any missing key raises KeyError and halts boot — the
# desired loud failure mode. In development, we warn to STDERR but allow boot
# so contributors can run partial stacks (e.g. without payment provider keys).
#
# Add a key here ONLY if a missing value would cause a runtime security issue
# (HMAC verification bypass, default credentials, etc) or a hard crash deep
# inside request handling that is harder to diagnose than a boot-time error.

REQUIRED_ENV_KEYS = %w[
  POSTGRES_PASSWORD
  SECRET_KEY_BASE
  INTERNAL_NOTIFY_TOKEN
  PAYME_MERCHANT_KEY
  CLICK_SECRET_KEY
].freeze

# Values that indicate the key is still at its placeholder default. Any of
# these must be treated as missing in production.
PLACEHOLDER_PREFIXES = %w[REPLACE_ME changeme].freeze

def labor_env_placeholder?(value)
  return true if value.nil? || value.strip.empty?

  PLACEHOLDER_PREFIXES.any? { |p| value.start_with?(p) }
end

if Rails.env.production?
  REQUIRED_ENV_KEYS.each do |key|
    value = ENV.fetch(key) # raises KeyError if missing
    if labor_env_placeholder?(value)
      raise KeyError, "Env #{key} is still set to a placeholder value. Set a real secret before boot."
    end
  end
else
  REQUIRED_ENV_KEYS.each do |key|
    value = ENV[key]
    if labor_env_placeholder?(value)
      warn "[required_env] WARNING: #{key} is missing or set to a placeholder. " \
           "This will fail-fast in production."
    end
  end
end
