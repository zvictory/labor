Devise.setup do |config|
  config.mailer_sender = ENV.fetch('DEVISE_MAILER_SENDER', 'noreply@labor.uz')

  require 'devise/orm/active_record'

  config.case_insensitive_keys = [:email]
  config.strip_whitespace_keys = [:email]

  config.skip_session_storage = [:http_auth, :token_auth]

  config.stretches = Rails.env.test? ? 1 : 11

  config.reconfirmable = false
  config.expire_all_remember_me_on_sign_out = true

  config.password_length = 8..128
  config.email_regexp = /\A[^@\s]+@[^@\s]+\z/

  config.reset_password_within = 6.hours
  config.sign_out_via = :delete

  # Rails 7.2 promoted :unprocessable_content as the canonical 422 symbol;
  # :unprocessable_entity still works but emits a deprecation warning on every
  # devise validation failure (signup/sign-in/password reset).
  config.responder.error_status = :unprocessable_content
  config.responder.redirect_status = :see_other
end
