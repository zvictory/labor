require 'rails_helper'

RSpec.describe Labor::Harvest::ParseRawDocument do
  let(:source_url) { 'https://www.fragrantica.com/perfume/Louis-Vuitton/Imagination-67370.html' }
  let(:html) { Rails.root.join('spec/fixtures/harvest/fragrantica/imagination.html').read }
  let(:root) { Rails.root.join('tmp/spec-harvest-parse-raw') }
  let(:html_path) { root.join('raw/www.fragrantica.com/2026-05-24/source.html') }
  let(:metadata_path) { root.join('raw/www.fragrantica.com/2026-05-24/source.json') }

  before do
    FileUtils.rm_rf(root)
    FileUtils.mkdir_p(html_path.dirname)
    File.write(html_path, html)
    File.write(
      metadata_path,
      JSON.generate(
        source_url: source_url,
        content_hash: 'rawhash',
        fetched_at: '2026-05-24T10:30:00+05:00'
      )
    )
  end

  it 'parses a saved raw document without fetching' do
    result = described_class.new(raw_html_path: html_path, raw_metadata_path: metadata_path, root: root).call

    expect(File.exist?(result.staging_json_path)).to be(true)
    expect(result.payload.fetch(:source_url)).to eq(source_url)
    expect(result.payload.fetch(:source_content_hash)).to eq('rawhash')
    expect(result.payload.fetch(:brand_name)).to eq('Louis Vuitton')
  end
end
