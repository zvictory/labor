require 'digest'
require 'fileutils'
require 'json'
require 'uri'

module Labor
  module Harvest
    class StageWriter
      def initialize(root:)
        @root = Pathname(root)
      end

      def write(payload)
        SchemaValidator.call(payload)

        uri = URI.parse(payload.fetch(:source_url))
        fingerprint = Digest::SHA256.hexdigest(
          [
            payload[:source_domain],
            payload[:brand_name],
            payload[:product_name],
            payload[:concentration],
            payload[:release_year],
            payload[:source_content_hash]
          ].join('|')
        )
        dir = @root.join('staging', uri.host)
        FileUtils.mkdir_p(dir)
        path = dir.join("#{fingerprint}.json")
        File.write(path, JSON.pretty_generate(payload))
        path.to_s
      end
    end
  end
end
