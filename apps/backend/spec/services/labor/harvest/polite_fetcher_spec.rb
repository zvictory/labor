require 'rails_helper'

RSpec.describe Labor::Harvest::PoliteFetcher do
  Response = Data.define(:status, :body, :headers)
  Clock = Data.define(:current)

  let(:url) { 'https://www.fragrantica.com/perfume/Louis-Vuitton/Imagination-67370.html' }
  let(:robots_policy) { instance_double(Labor::Harvest::RobotsPolicy, allowed?: true, crawl_delay: 10) }
  let(:http) { instance_double(Faraday::Connection) }
  let(:sleeper) { class_double(Kernel, sleep: nil) }
  let(:root) { Rails.root.join('tmp/spec-harvest-limits') }

  before do
    FileUtils.rm_rf(root)
  end

  it 'refuses to fetch when robots policy disallows the URL' do
    disallowing_policy = instance_double(Labor::Harvest::RobotsPolicy, allowed?: false)
    fetcher = described_class.new(robots_policy: disallowing_policy, limiter_root: root, http: http, sleeper: sleeper)
    allow(http).to receive(:get)

    expect { fetcher.fetch(url) }.to raise_error(Labor::Harvest::PoliteFetcher::RobotsDeniedError)
    expect(http).not_to have_received(:get)
  end

  it 'applies domain crawl delay before a repeated fetch' do
    allow(http).to receive(:get).and_return(Response.new(status: 200, body: '<html></html>', headers: {}))
    first_clock = Clock.new(Time.zone.parse('2026-05-24 10:00:00'))
    second_clock = Clock.new(Time.zone.parse('2026-05-24 10:00:03'))

    described_class.new(robots_policy: robots_policy, limiter_root: root, http: http, sleeper: sleeper, clock: first_clock).fetch(url)
    described_class.new(robots_policy: robots_policy, limiter_root: root, http: http, sleeper: sleeper, clock: second_clock).fetch(url)

    expect(sleeper).to have_received(:sleep).with(7.0)
  end
end
