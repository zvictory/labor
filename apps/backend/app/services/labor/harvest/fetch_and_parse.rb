module Labor
  module Harvest
    class FetchAndParse
      Result = Data.define(:raw_html_path, :raw_metadata_path, :staging_json_path, :payload)

      def initialize(source_url:, root: Rails.root.join('storage/harvest'), fetcher: PoliteFetcher.new)
        @source_url = source_url
        @root = root
        @fetcher = fetcher
      end

      def call
        fetch_result = @fetcher.fetch(@source_url)
        raw = RawDocumentStore.new(root: @root).write(fetch_result)

        payload = FragranticaParser.new(
          html: fetch_result.body,
          source_url: fetch_result.url,
          content_hash: raw.content_hash,
          fetched_at: fetch_result.fetched_at
        ).call
        staging_json_path = StageWriter.new(root: @root).write(payload)

        Result.new(
          raw_html_path: raw.html_path,
          raw_metadata_path: raw.metadata_path,
          staging_json_path: staging_json_path,
          payload: payload
        )
      end
    end
  end
end
