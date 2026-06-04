require 'rails_helper'

RSpec.describe Labor::Harvest::FragranticaParser do
  let(:html) { Rails.root.join('spec/fixtures/harvest/fragrantica/imagination.html').read }
  let(:source_url) { 'https://www.fragrantica.com/perfume/Louis-Vuitton/Imagination-67370.html' }

  it 'extracts nullable factual fields and labels expressive prose as rewrite-only' do
    result = described_class.new(html: html, source_url: source_url, content_hash: 'abc123', fetched_at: Time.zone.parse('2026-05-24 12:00:00')).call

    expect(result.fetch(:brand_name)).to eq('Louis Vuitton')
    expect(result.fetch(:product_name)).to eq('Imagination')
    expect(result.fetch(:gender)).to eq('men')
    expect(result.fetch(:release_year)).to eq(2021)
    expect(result.fetch(:perfumer_names)).to eq(['Jacques Cavallier Belletrud'])
    expect(result.fetch(:notes_top)).to include('Citron', 'Calabrian bergamot')
    expect(result.fetch(:notes_heart)).to include('Neroli', 'Ginger')
    expect(result.fetch(:notes_base)).to include('Black Tea', 'Ambroxan')
    # imagination.html has no bar-width style attrs on accords → graceful fallback to nil weight
    expect(result.fetch(:main_accords)).to include({ name: 'citrus', weight: nil })
    expect(result.fetch(:source_description_raw)).to include('Imagination by Louis Vuitton')
    expect(result.fetch(:source_description_rewrite_required)).to be(true)
    expect(result.dig(:parse_quality, :missing_fields)).to include('concentration')
    # imagination.html has no vote-bars → these gracefully return nil / empty hash
    expect(result.fetch(:avg_longevity)).to be_nil
    expect(result.fetch(:avg_sillage)).to be_nil
    expect(result.fetch(:seasons_breakdown)).to eq({})
    expect(result.fetch(:time_breakdown)).to eq({})
    expect(result.fetch(:votes_count)).to be_nil
  end

  it 'does not crash when optional page sections are absent' do
    result = described_class.new(html: '<html><body><h1>Unknown</h1></body></html>', source_url: source_url, content_hash: 'empty', fetched_at: Time.current).call

    expect(result.fetch(:brand_name)).to be_nil
    expect(result.fetch(:main_accords)).to eq([])
    expect(result.fetch(:notes_top)).to eq([])
    expect(result.fetch(:parse_quality).fetch(:missing_fields)).to include('brand_name', 'release_year')
    expect(result.fetch(:avg_longevity)).to be_nil
    expect(result.fetch(:seasons_breakdown)).to eq({})
  end

  describe 'vote-bar and accord-weight parsing (v2 schema)' do
    let(:html) { Rails.root.join('spec/fixtures/harvest/fragrantica/vote_bars.html').read }
    let(:source_url) { 'https://www.fragrantica.com/perfume/Le-Labo/Santal-33-12376.html' }

    subject(:result) do
      described_class.new(html: html, source_url: source_url, content_hash: 'votehash', fetched_at: Time.zone.parse('2026-06-03 10:00:00')).call
    end

    # ── Accord bar weights ──────────────────────────────────────────────────────

    it 'reads accord bar widths as numeric weights (not nil)' do
      # Why this matters: the ingest stores weight in ProductAccord.weight (0-100);
      # nil weights make the accord-influence display useless.
      woody = result.fetch(:main_accords).find { |a| a[:name] == 'woody' }
      expect(woody).not_to be_nil
      expect(woody[:weight]).to eq(73.2)
    end

    it 'preserves the relative ordering of accords by bar width' do
      weights = result.fetch(:main_accords).map { |a| a[:weight] }
      expect(weights).to eq(weights.sort.reverse)
    end

    it 'emits schema_version 2' do
      expect(result.fetch(:schema_version)).to eq(2)
    end

    it 'passes SchemaValidator with v2 payload' do
      expect { Labor::Harvest::SchemaValidator.call(result) }.not_to raise_error
    end

    # ── Longevity ────────────────────────────────────────────────────────────────

    it 'computes avg_longevity as a weighted average on the 1-5 Fragrantica scale' do
      # Fixture: poor=3%, weak=7%, moderate=12%, long_lasting=38%, eternal=40%
      # Weighted avg = (1*3 + 2*7 + 3*12 + 4*38 + 5*40) / 100 = 405/100 = 4.05
      expect(result.fetch(:avg_longevity)).to eq(4.05)
    end

    # ── Sillage ──────────────────────────────────────────────────────────────────

    it 'computes avg_sillage as a weighted average on the 1-4 Fragrantica scale' do
      # Fixture: intimate=5%, moderate=15%, strong=48%, enormous=32%
      # Weighted avg = (1*5 + 2*15 + 3*48 + 4*32) / 100 = 307/100 = 3.07
      expect(result.fetch(:avg_sillage)).to eq(3.07)
    end

    # ── Seasons breakdown ────────────────────────────────────────────────────────

    it 'extracts seasons_breakdown as a label→percent hash' do
      # Why: the ingest maps this to ProductFragranceDetail.seasons_breakdown (jsonb).
      # Incorrect bar-width parsing here silently poisons the seasons display.
      seasons = result.fetch(:seasons_breakdown)
      expect(seasons).to include('spring' => 35.0, 'winter' => 70.0, 'autumn' => 55.0)
    end

    # ── Time of day ──────────────────────────────────────────────────────────────

    it 'extracts time_breakdown as a label→percent hash' do
      expect(result.fetch(:time_breakdown)).to include('day' => 45.0, 'night' => 75.0)
    end

    # ── Love / rating breakdown ───────────────────────────────────────────────────

    it 'extracts love_breakdown as a label→percent hash' do
      expect(result.fetch(:love_breakdown)).to include('love it' => 82.0)
    end

    # ── Votes count ──────────────────────────────────────────────────────────────

    it 'parses votes_count as an integer' do
      expect(result.fetch(:votes_count)).to eq(1423)
    end

    # ── Factual fields still extracted ───────────────────────────────────────────

    it 'still extracts notes, perfumer, and year from vote_bars fixture' do
      expect(result.fetch(:notes_top)).to include('Cardamom', 'Iris')
      expect(result.fetch(:notes_base)).to include('Sandalwood', 'Cedar')
      expect(result.fetch(:perfumer_names)).to include('Frank Voelkl')
      expect(result.fetch(:release_year)).to eq(2011)
    end
  end
end
