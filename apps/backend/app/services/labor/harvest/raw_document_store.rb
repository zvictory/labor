require 'digest'
require 'fileutils'
require 'json'
require 'uri'

module Labor
  module Harvest
    class RawDocumentStore
      Result = Data.define(:html_path, :metadata_path, :content_hash)

      def initialize(root:)
        @root = Pathname(root)
      end

      def write(fetch_result)
        uri = URI.parse(fetch_result.url)
        content_hash = Digest::SHA256.hexdigest(fetch_result.body)
        date = fetch_result.fetched_at.to_date.iso8601
        dir = @root.join('raw', uri.host, date)
        FileUtils.mkdir_p(dir)

        html_path = dir.join("#{content_hash}.html")
        metadata_path = dir.join("#{content_hash}.json")

        File.write(html_path, fetch_result.body)
        File.write(
          metadata_path,
          JSON.pretty_generate(
            source_url: fetch_result.url,
            source_domain: uri.host,
            fetched_at: fetch_result.fetched_at.iso8601,
            status: fetch_result.status,
            headers: fetch_result.headers,
            content_hash: content_hash
          )
        )

        Result.new(html_path: html_path.to_s, metadata_path: metadata_path.to_s, content_hash: content_hash)
      end
    end
  end
end
