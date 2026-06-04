module Labor
  # Maps a verified Telegram payload to a Spree::User, creating it if needed.
  class TelegramUserProvisioner
    def self.call(payload)
      tg_id = payload['id'].to_i
      raise ArgumentError, 'telegram_id missing' if tg_id.zero?

      user = Spree::User.find_or_initialize_by(telegram_id: tg_id)
      user.email = "tg_#{tg_id}@labor.local" if user.email.blank?
      user.password = SecureRandom.hex(24) if user.encrypted_password.blank?
      user.telegram_username  = payload['username']
      user.telegram_first_name = payload['first_name']
      user.telegram_last_name  = payload['last_name']
      user.telegram_photo_url  = payload['photo_url']
      user.telegram_auth_date  = Time.at(payload['auth_date'].to_i) if payload['auth_date']
      user.preferred_locale    = normalize_locale(payload['language_code']) || user.preferred_locale || 'ru'
      user.confirmed_at ||= Time.current if user.respond_to?(:confirmed_at)

      user.save!
      user
    end

    def self.normalize_locale(code)
      case code.to_s
      when 'ru' then 'ru'
      when 'en' then 'en'
      when 'uz', 'uz-Latn' then 'uz'
      when 'uz-Cyrl' then 'uz'
      end
    end
  end
end
