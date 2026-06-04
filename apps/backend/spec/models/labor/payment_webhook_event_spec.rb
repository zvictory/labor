require 'rails_helper'

# Locks in Fix 3 — `record!` must be atomic under concurrent inserts.
# Two threads calling record! with the same (provider, external_txn_id,
# event_type) key must produce exactly one DB row; the second call must
# return status: 'duplicate' without raising, regardless of which thread
# wins the INSERT race.
RSpec.describe Labor::PaymentWebhookEvent, type: :model do
  describe '.record!' do
    let(:key) { { provider: 'uzum', external_txn_id: 'txn-model-1', event_type: 'callback' } }

    it 'creates a new event with status received on first call' do
      event = described_class.record!(**key, payload: { 'x' => 1 })
      expect(event).to be_persisted
      expect(event.status).to eq('received')
      expect(event.payload).to eq('x' => 1)
    end

    it 'returns status duplicate on second call with same key' do
      described_class.record!(**key, payload: { 'x' => 1 })
      dup = described_class.record!(**key, payload: { 'x' => 2 })
      expect(dup.status).to eq('duplicate')
      expect(described_class.where(**key).count).to eq(1)
    end

    it 'does NOT raise on duplicate (no exception leaks to caller)', concurrent: true do
      results = run_in_parallel(2) do |_i|
        described_class.record!(**key, payload: { 'concurrent' => true })
      rescue => e
        e
      end

      expect(results).not_to include(be_a(StandardError))
      expect(described_class.where(**key).count).to eq(1)
    end

    it 'creates exactly one row under concurrent inserts (Fix 3)', concurrent: true do
      results = run_in_parallel(5) do |_i|
        described_class.record!(**key, payload: {})
      rescue => e
        e
      end

      results.each { |r| expect(r).not_to be_a(StandardError), "raised: #{r.inspect}" }

      statuses = results.map(&:status)
      expect(statuses.count('received')).to eq(1)
      expect(statuses.count('duplicate')).to eq(4)
      expect(described_class.where(**key).count).to eq(1)
    end
  end
end
