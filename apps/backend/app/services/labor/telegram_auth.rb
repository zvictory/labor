require 'openssl'
require 'uri'
require 'json'

module Labor
  # Verifies Telegram Login Widget data and Telegram Mini App initData.
  #
  # Widget: https://core.telegram.org/widgets/login#checking-authorization
  #   key  = SHA256(bot_token)
  #   hash = HMAC-SHA256(key, data_check_string)
  #
  # initData (Mini App): https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
  #   secret_key = HMAC-SHA256("WebAppData", bot_token)
  #   hash       = HMAC-SHA256(secret_key, data_check_string)
  class TelegramAuth
    MAX_AGE_SECONDS = 60 * 60 * 24 # 24h

    Result = Struct.new(:ok, :user_payload, :error, keyword_init: true) do
      def ok?
        ok
      end
    end

    def initialize(bot_token: ENV.fetch('TELEGRAM_BOT_TOKEN'))
      @bot_token = bot_token
    end

    # params: { id:, first_name:, username:, photo_url:, auth_date:, hash: }
    def verify_widget(params)
      params = params.to_h.transform_keys(&:to_s)
      hash   = params.delete('hash')
      return fail!('missing_hash') if hash.blank?

      data_check_string = params.sort.map { |k, v| "#{k}=#{v}" }.join("\n")
      secret_key        = OpenSSL::Digest::SHA256.digest(@bot_token)
      computed          = OpenSSL::HMAC.hexdigest('SHA256', secret_key, data_check_string)

      return fail!('bad_hash') unless secure_compare(computed, hash)
      return fail!('expired')  if expired?(params['auth_date'])

      ok!(params)
    end

    # raw_init_data — string as received from window.Telegram.WebApp.initData
    def verify_init_data(raw_init_data)
      pairs = URI.decode_www_form(raw_init_data.to_s)
      hash_pair = pairs.find { |k, _| k == 'hash' }
      return fail!('missing_hash') if hash_pair.nil?

      hash = hash_pair[1]
      data_pairs = pairs.reject { |k, _| k == 'hash' }
      data_check_string = data_pairs.sort_by(&:first).map { |k, v| "#{k}=#{v}" }.join("\n")

      secret_key = OpenSSL::HMAC.digest('SHA256', 'WebAppData', @bot_token)
      computed   = OpenSSL::HMAC.hexdigest('SHA256', secret_key, data_check_string)

      return fail!('bad_hash') unless secure_compare(computed, hash)

      data = data_pairs.to_h
      return fail!('expired') if expired?(data['auth_date'])

      user_json = data['user']
      return fail!('missing_user') if user_json.blank?

      user_payload = JSON.parse(user_json)
      user_payload['auth_date'] = data['auth_date']
      ok!(user_payload)
    rescue JSON::ParserError
      fail!('bad_user_json')
    end

    private

    def expired?(auth_date)
      return true if auth_date.blank?
      Time.now.to_i - auth_date.to_i > MAX_AGE_SECONDS
    end

    def secure_compare(a, b)
      return false unless a.is_a?(String) && b.is_a?(String)
      return false if a.bytesize != b.bytesize
      OpenSSL.fixed_length_secure_compare(a, b)
    end

    def ok!(payload)  = Result.new(ok: true, user_payload: payload)
    def fail!(error)  = Result.new(ok: false, error: error)
  end
end
