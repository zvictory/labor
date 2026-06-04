require 'json'

module Labor
  module Harvest
    class ParseRawDocument
      Result = Data.define(:staging_json_path, :payload)

      def initialize(raw_html_path:, raw_metadata_path:, root: Rails.root.join('storage/harvest'))
        @raw_html_path = Pathname(raw_html_path)
        @raw_metadata_path = Pathname(raw_metadata_path)
        @root = root
      end

      def call
        metadata = JSON.parse(File.read(@raw_metadata_path)).symbolize_keys
        payload = FragranticaParser.new(
          html: File.read(@raw_html_path),
          source_url: metadata.fetch(:source_url),
          content_hash: metadata.fetch(:content_hash),
          fetched_at: Time.zone.parse(metadata.fetch(:fetched_at))
        ).call

        staging_json_path = StageWriter.new(root: @root).write(payload)
        Result.new(staging_json_path: staging_json_path, payload: payload)
      end
    end
  end
end
