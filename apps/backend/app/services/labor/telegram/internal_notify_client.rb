module Labor
  module Telegram
    # HTTP client for posting to the bot's `/internal/notify/*` endpoints.
    # Auth is HMAC-SHA256 over `${timestamp}.${raw_body}` keyed with
    # INTERNAL_NOTIFY_TOKEN. Headers: X-Notify-Timestamp, X-Notify-Signature.
    # The bot rejects timestamps with skew > 5 minutes.
    class InternalNotifyClient
      MIN_TOKEN_LENGTH = 32

      class ConfigError < StandardError; end

      def self.post!(event:, payload:)
        new.post!(event: event, payload: payload)
      end

      def self.post(event:, payload:)
        new.post(event: event, payload: payload)
      end

      def post!(event:, payload:)
        response = post(event: event, payload: payload)
        raise "bot notify failed status=#{response.status} body=#{response.body}" unless response.success?
        response
      end

      def post(event:, payload:)
        base = ENV['BOT_INTERNAL_URL'].to_s
        raise ConfigError, 'BOT_INTERNAL_URL is not set' if base.empty?

        body = payload.to_json
        ts = Time.current.to_i.to_s
        signature = OpenSSL::HMAC.hexdigest('SHA256', token, "#{ts}.#{body}")

        Faraday.post(
          "#{base}/internal/notify/#{event}",
          body,
          {
            'Content-Type'       => 'application/json',
            'X-Notify-Timestamp' => ts,
            'X-Notify-Signature' => signature
          }
        )
      end

      private

      def token
        @token ||= begin
          value = ENV['INTERNAL_NOTIFY_TOKEN'].to_s
          if value.length < MIN_TOKEN_LENGTH
            raise ConfigError, "INTERNAL_NOTIFY_TOKEN must be at least #{MIN_TOKEN_LENGTH} chars"
          end
          value
        end
      end
    end
  end
end
