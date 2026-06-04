require 'faraday'
require 'uri'

module Labor
  module Harvest
    class RobotsPolicy
      DEFAULT_CRAWL_DELAY_SECONDS = 10

      def initialize(user_agent:, http: Faraday, default_crawl_delay: DEFAULT_CRAWL_DELAY_SECONDS)
        @user_agent = user_agent
        @http = http
        @default_crawl_delay = default_crawl_delay
        @cache = {}
      end

      def allowed?(url)
        rules_for(url).allowed?(URI.parse(url).path)
      end

      def crawl_delay(url)
        rules_for(url).crawl_delay || @default_crawl_delay
      end

      private

      def rules_for(url)
        uri = URI.parse(url)
        origin = "#{uri.scheme}://#{uri.host}"
        @cache[origin] ||= begin
          response = @http.get("#{origin}/robots.txt")
          response.status.to_i >= 400 ? Rules.allow_all : Rules.parse(response.body.to_s, @user_agent)
        rescue Faraday::Error
          Rules.disallow_all
        end
      end

      class Rules
        Rule = Data.define(:kind, :path)

        attr_reader :crawl_delay

        def self.allow_all
          new([], nil)
        end

        def self.disallow_all
          new([Rule.new(kind: :disallow, path: '/')], nil)
        end

        def self.parse(body, user_agent)
          groups = []
          current_agents = []
          current_rules = []
          current_delay = nil

          body.each_line do |line|
            key, value = line.split('#', 2).first.to_s.split(':', 2).map { |part| part&.strip }
            next if key.blank? || value.nil?

            case key.downcase
            when 'user-agent'
              if current_agents.any? && current_rules.any?
                groups << [current_agents, current_rules, current_delay]
                current_rules = []
                current_delay = nil
              end
              current_agents << value.downcase
            when 'allow'
              current_rules << Rule.new(kind: :allow, path: value)
            when 'disallow'
              current_rules << Rule.new(kind: :disallow, path: value)
            when 'crawl-delay'
              current_delay = value.to_f if value.to_f.positive?
            end
          end
          groups << [current_agents, current_rules, current_delay] if current_agents.any?

          selected = groups.find { |agents, _rules, _delay| agents.include?(user_agent.downcase) } ||
                     groups.find { |agents, _rules, _delay| agents.include?('*') }
          return allow_all unless selected

          _agents, rules, delay = selected
          new(rules, delay)
        end

        def initialize(rules, crawl_delay)
          @rules = rules.reject { |rule| rule.path.blank? }
          @crawl_delay = crawl_delay
        end

        def allowed?(path)
          match = @rules
            .select { |rule| path.start_with?(rule.path) }
            .max_by { |rule| rule.path.length }
          return true unless match

          match.kind == :allow
        end
      end
    end
  end
end
