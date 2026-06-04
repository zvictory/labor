module Labor
  module Harvest
    class SchemaValidator
      Error = Class.new(StandardError)

      FIELD_TYPES = {
        schema_version: Integer,
        source_url: String,
        source_domain: String,
        source_content_hash: String,
        source_fetched_at: String,
        brand_name: [String, NilClass],
        product_name: [String, NilClass],
        concentration: [String, NilClass],
        gender: [String, NilClass],
        release_year: [Integer, NilClass],
        perfumer_names: Array,
        notes_top: Array,
        notes_heart: Array,
        notes_base: Array,
        main_accords: Array,
        avg_longevity: [Float, NilClass],
        avg_sillage: [Float, NilClass],
        seasons_breakdown: Hash,
        time_breakdown: Hash,
        love_breakdown: Hash,
        votes_count: [Integer, NilClass],
        source_description_raw: [String, NilClass],
        source_description_rewrite_required: TrueClass,
        parse_quality: Hash
      }.freeze

      def self.call(payload)
        new(payload).call
      end

      def initialize(payload)
        @payload = payload
      end

      def call
        FIELD_TYPES.each do |field, expected|
          raise Error, "missing field #{field}" unless @payload.key?(field)
          next if Array(expected).any? { |type| @payload[field].is_a?(type) }

          raise Error, "invalid type for #{field}: #{@payload[field].class}"
        end
        true
      end
    end
  end
end
