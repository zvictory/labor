require 'faraday'
require 'fileutils'
require 'json'
require 'uri'

module Labor
  module Harvest
    class PoliteFetcher
      Error = Class.new(StandardError)
      BlockedSourceError = Class.new(Error)
      RobotsDeniedError = Class.new(Error)

      USER_AGENT = 'LaborHarvestBot/1.0 (+https://labor.local/harvest-policy)'.freeze
      BLOCK_MARKERS = ['captcha', 'cf-chl', 'cloudflare', 'access denied'].freeze

      def initialize(
        robots_policy: RobotsPolicy.new(user_agent: USER_AGENT),
        crawl_delay_seconds: nil,
        limiter_root: Rails.root.join('tmp/harvest-rate-limits'),
        http: nil,
        sleeper: Kernel,
        clock: Time
      )
        @robots_policy = robots_policy
        @crawl_delay_seconds = crawl_delay_seconds
        @limiter_root = Pathname(limiter_root)
        @http = http || Faraday.new do |conn|
          conn.adapter Faraday.default_adapter
          conn.options.timeout = 20
          conn.options.open_timeout = 10
        end
        @sleeper = sleeper
        @clock = clock
      end

      def fetch(url)
        raise RobotsDeniedError, "robots.txt disallows #{url}" unless @robots_policy.allowed?(url)

        with_domain_lock(url) do
          wait_for_domain(url)
          response = @http.get(url) do |request|
            request.headers['User-Agent'] = USER_AGENT
            request.headers['Accept'] = 'text/html,application/xhtml+xml'
          end

          fetched_at = current_time
          remember_fetch(url, fetched_at)
          raise BlockedSourceError, "source blocked polite access: #{url}" if blocked_response?(response)
          raise Error, "fetch failed #{response.status} for #{url}" if response.status.to_i >= 400

          FetchResult.new(
            url: url,
            body: response.body.to_s,
            status: response.status.to_i,
            headers: response.headers.to_h,
            fetched_at: fetched_at
          )
        end
      end

      private

      def with_domain_lock(url)
        FileUtils.mkdir_p(@limiter_root)
        File.open(lock_path(url), File::RDWR | File::CREAT, 0o644) do |file|
          file.flock(File::LOCK_EX)
          yield
        ensure
          file.flock(File::LOCK_UN)
        end
      end

      def wait_for_domain(url)
        delay = @crawl_delay_seconds || @robots_policy.crawl_delay(url)
        return unless delay.positive?

        last = last_fetch_at(url)
        return unless last

        wait = delay - (current_time - last)
        @sleeper.sleep(wait) if wait.positive?
      end

      def last_fetch_at(url)
        path = limiter_path(url)
        return nil unless File.exist?(path)

        Time.zone.parse(JSON.parse(File.read(path)).fetch('last_fetch_at'))
      rescue JSON::ParserError, KeyError
        nil
      end

      def remember_fetch(url, at)
        FileUtils.mkdir_p(@limiter_root)
        File.write(limiter_path(url), JSON.generate(last_fetch_at: at.iso8601))
      end

      def limiter_path(url)
        domain = URI.parse(url).host.to_s.gsub(/[^a-zA-Z0-9.-]/, '_')
        @limiter_root.join("#{domain}.json")
      end

      def lock_path(url)
        domain = URI.parse(url).host.to_s.gsub(/[^a-zA-Z0-9.-]/, '_')
        @limiter_root.join("#{domain}.lock")
      end

      def current_time
        @clock.respond_to?(:current) ? @clock.current : @clock.now
      end

      def blocked_response?(response)
        return true if [403, 429].include?(response.status.to_i)

        body = response.body.to_s.downcase
        BLOCK_MARKERS.any? { |marker| body.include?(marker) }
      end
    end
  end
end
