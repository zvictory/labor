require 'rails_helper'
require 'base64'

# Locks in fix B-1 — Payme's `PerformTransaction` MUST be safe against two
# concurrent webhook deliveries. The fix wraps perform in
# `ActiveRecord::Base.transaction { Spree::Order.lock.find_by(...) }` and
# relies on `Labor::PaymentWebhookEvent`'s unique
# `(provider, external_txn_id, event_type)` index. Without either, two
# threads can create two Spree::Payment rows for the same txn.
RSpec.describe 'Spree::Api::V2::Storefront::Payments::Payme', type: :request do
  let(:merchant_key) { 'test-merchant-key' }
  let(:auth_header) do
    { 'HTTP_AUTHORIZATION' => 'Basic ' + Base64.strict_encode64("Paycom:#{merchant_key}") }
  end

  let(:store) do
    Spree::Store.find_by(default: true) ||
      Spree::Store.find_by(code: 'labor') ||
      Spree::Store.create!(
        name: 'Labor Test',
        url: 'localhost',
        mail_from_address: 'noreply@labor.local',
        default_currency: 'UZS',
        code: 'labor-test',
        default: true,
        default_locale: 'ru',
        supported_locales: 'ru'
      )
  end

  before do
    stub_const('Spree::Api::V2::Storefront::Payments::PaymeController::MERCHANT_KEY', merchant_key)
    store
    pm = Spree::PaymentMethod.find_or_initialize_by(name: 'Payme') do |m|
      m.type = 'Spree::PaymentMethod::Check'
      m.active = true
      m.display_on = 'both'
    end
    pm.stores = [store]
    pm.save!
  end
  let(:order) do
    Spree::Order.create!(
      store: store,
      currency: 'UZS',
      total: 50_000,
      item_total: 50_000,
      email: 'buyer@example.com',
      state: 'complete'
    )
  end

  def rpc(method, params = {})
    post '/api/v2/storefront/payments/payme/rpc',
         params: { jsonrpc: '2.0', id: 1, method: method, params: params }.to_json,
         headers: auth_header.merge('CONTENT_TYPE' => 'application/json')
    JSON.parse(response.body)
  end

  describe 'auth' do
    it 'returns -32504 when Basic auth missing' do
      post '/api/v2/storefront/payments/payme/rpc',
           params: { method: 'CheckPerformTransaction', params: {} }.to_json,
           headers: { 'CONTENT_TYPE' => 'application/json' }
      body = JSON.parse(response.body)
      expect(body.dig('error', 'code')).to eq(-32504)
    end

    it 'returns -32504 when Basic auth password is wrong' do
      bad = { 'HTTP_AUTHORIZATION' => 'Basic ' + Base64.strict_encode64('Paycom:not-the-key') }
      post '/api/v2/storefront/payments/payme/rpc',
           params: { method: 'CheckPerformTransaction', params: {} }.to_json,
           headers: bad.merge('CONTENT_TYPE' => 'application/json')
      body = JSON.parse(response.body)
      expect(body.dig('error', 'code')).to eq(-32504)
    end
  end

  describe 'happy path' do
    it 'goes CheckPerform -> Create -> Perform and returns state 2' do
      check = rpc('CheckPerformTransaction',
                  amount: order.total.to_i,
                  account: { order_id: order.number })
      expect(check.dig('result', 'allow')).to eq(true)

      create = rpc('CreateTransaction',
                   id: 'payme-txn-happy',
                   time: (Time.current.to_f * 1000).to_i,
                   amount: order.total.to_i,
                   account: { order_id: order.number })
      expect(create.dig('result', 'state')).to eq(1)

      perform = rpc('PerformTransaction',
                    id: 'payme-txn-happy',
                    time: (Time.current.to_f * 1000).to_i)
      expect(perform.dig('result', 'state')).to eq(2)
      expect(order.reload.payment_state).to eq('paid')
      expect(order.payments.where(state: 'completed').count).to eq(1)
    end
  end

  describe 'race: two concurrent PerformTransaction for the same txn id',
           concurrent: true do
    it 'creates exactly one completed Spree::Payment (B-1)' do
      txn_id = 'payme-race-1'
      # Seed CreateTransaction synchronously so both PerformTransaction
      # threads see the same `create` event.
      rpc('CreateTransaction',
          id: txn_id,
          time: (Time.current.to_f * 1000).to_i,
          amount: order.total.to_i,
          account: { order_id: order.number })

      results = run_in_parallel(2) do |_i|
        # Each thread issues its own request via Rack::Test's `post`.
        # `post` writes to @response, which is per-thread.
        post '/api/v2/storefront/payments/payme/rpc',
             params: {
               jsonrpc: '2.0', id: 1,
               method: 'PerformTransaction',
               params: { id: txn_id, time: (Time.current.to_f * 1000).to_i }
             }.to_json,
             headers: auth_header.merge('CONTENT_TYPE' => 'application/json'),
             env: { 'HTTP_HOST' => 'localhost', 'SERVER_NAME' => 'localhost' }
        JSON.parse(response.body)
      end

      # No thread should have crashed with a 500-style raised exception.
      results.each do |r|
        expect(r).not_to be_a(StandardError),
                         "thread raised: #{r.inspect}"
      end

      # Exactly one Spree::Payment row exists for the order, and it's the
      # winning thread's row.
      expect(order.reload.payments.count).to eq(1)
      expect(order.payments.first.state).to eq('completed')
      expect(order.payment_state).to eq('paid')

      # Exactly one `perform` event row, by virtue of the unique index.
      events = Labor::PaymentWebhookEvent.where(
        provider: 'payme', external_txn_id: txn_id, event_type: 'perform'
      )
      expect(events.count).to eq(1)

      # The losing thread must NOT return a JSON-RPC error of a kind that
      # indicates corruption. We accept either:
      #   * both threads returning a success result with the same
      #     perform_time (the lock serialised them and the second saw the
      #     event as `duplicate`); OR
      #   * one success + one error with an explicit code in our known
      #     vocabulary (currently ERROR_TXN_STATE = -31008).
      coded = results.map do |r|
        if r['result'] then [:ok, r.dig('result', 'perform_time')]
        else [:err, r.dig('error', 'code')]
        end
      end

      ok_count = coded.count { |kind, _| kind == :ok }
      expect(ok_count).to be >= 1

      coded.each do |kind, val|
        next if kind == :ok
        expect([-31008]).to include(val),
                            "unexpected losing-thread error code: #{val}"
      end
    end
  end
end
