module Labor
  module Payments
    # Click MD5 signature verifier.
    #   prepare:  MD5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)
    #   complete: MD5(click_trans_id + service_id + secret_key + merchant_trans_id + merchant_prepare_id + amount + action + sign_time)
    class ClickVerifier
      ERROR_SIGN  = -1
      ERROR_USER  = -5
      ERROR_TXN   = -6
      OK          = 0

      MAX_SIGN_TIME_SKEW = 5.minutes

      def self.prepare_sign(p, secret)
        Digest::MD5.hexdigest("#{p[:click_trans_id]}#{p[:service_id]}#{secret}#{p[:merchant_trans_id]}#{p[:amount]}#{p[:action]}#{p[:sign_time]}")
      end

      def self.complete_sign(p, secret)
        Digest::MD5.hexdigest("#{p[:click_trans_id]}#{p[:service_id]}#{secret}#{p[:merchant_trans_id]}#{p[:merchant_prepare_id]}#{p[:amount]}#{p[:action]}#{p[:sign_time]}")
      end

      def self.verify(params, action:, secret:)
        params = params.transform_keys(&:to_sym)
        return false unless within_sign_time_window?(params[:sign_time])

        expected = action == 0 ? prepare_sign(params, secret) : complete_sign(params, secret)
        provided = params[:sign_string].to_s.downcase
        # MD5 hex is always 32 chars; secure_compare requires equal lengths.
        return false unless expected.bytesize == provided.bytesize
        ActiveSupport::SecurityUtils.secure_compare(expected.downcase, provided)
      end

      def self.within_sign_time_window?(sign_time)
        return false if sign_time.to_s.empty?
        parsed = Time.find_zone('UTC').parse(sign_time.to_s)
        return false if parsed.nil?
        (Time.current - parsed).abs <= MAX_SIGN_TIME_SKEW
      rescue ArgumentError
        false
      end
    end
  end
end
