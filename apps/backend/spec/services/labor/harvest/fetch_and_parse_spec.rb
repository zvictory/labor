require 'rails_helper'

RSpec.describe Labor::Harvest::FetchAndParse do
  let(:source_url) { 'https://www.fragrantica.com/perfume/Louis-Vuitton/Imagination-67370.html' }
  let(:html) { Rails.root.join('spec/fixtures/harvest/fragrantica/imagination.html').read }
  let(:root) { Rails.root.join('tmp/spec-harvest') }
  let(:now) { Time.zone.parse('2026-05-24 10:30:00') }

  before do
    FileUtils.rm_rf(root)
  end

  it 'stores raw html before parsing and writes schema-validated staging JSON' do
    fetcher = instance_double(
      Labor::Harvest::PoliteFetcher,
      fetch: Labor::Harvest::FetchResult.new(url: source_url, body: html, status: 200, headers: {}, fetched_at: now)
    )

    result = described_class.new(source_url: source_url, root: root, fetcher: fetcher).call

    expect(result.raw_html_path).to be_present
    expect(File.read(result.raw_html_path)).to eq(html)
    expect(File.exist?(result.raw_metadata_path)).to be(true)
    expect(File.exist?(result.staging_json_path)).to be(true)

    staging = JSON.parse(File.read(result.staging_json_path))
    expect(staging.fetch('schema_version')).to eq(1)
    expect(staging.fetch('source_url')).to eq(source_url)
    expect(staging.fetch('brand_name')).to eq('Louis Vuitton')
    expect(staging.fetch('source_description_raw')).to include('Imagination by Louis Vuitton')
    expect(staging.fetch('source_description_rewrite_required')).to eq(true)
    expect(staging.fetch('parse_quality').fetch('found_fields')).to include('brand_name', 'product_name')
  end
end
