require 'rails_helper'
require 'openssl'

# Locks in Uzum payment security fixes:
#   Fix 1 — amount must equal order.total (CRITICAL money-losing bug)
#   Fix 4 — state transition wrapped in transaction + SELECT FOR UPDATE
#
# Any test that creates a Spree::Payment is asserting that EXACTLY ONE
# payment was created. The concurrent test proves the lock serialises
# two simultaneous callbacks.
RSpec.describe 'Spree::Api::V2::Storefront::Payments::Uzum', type: :request do
  let(:secret) { 'test-uzum-secret-key' }

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
    stub_const('Spree::Api::V2::Storefront::Payments::UzumController::SECRET', secret)
    store
    unless Spree::PaymentMethod.find_by(name: 'Uzum')
      pm = Spree::PaymentMethod.new(
        name: 'Uzum',
        type: 'Spree::PaymentMethod::Check',
        active: true,
        display_on: 'both'
      )
      pm.stores << store
      pm.save!
    end
  end

  let(:order) do
    Spree::Order.create!(
      store: store,
      currency: 'UZS',
      total: 75_000,
      item_total: 75_000,
      email: 'buyer@example.com',
      state: 'complete'
    )
  end

  def callback(body_hash, ts: Time.current.to_i)
    raw = body_hash.to_json
    sig = OpenSSL::HMAC.hexdigest('SHA256', secret, raw)
    post '/api/v2/storefront/payments/uzum/callback',
         params: raw,
         headers: {
           'CONTENT_TYPE' => 'application/json',
           'X-Signature' => sig,
           'X-Timestamp' => ts.to_s
         }
    JSON.parse(response.body)
  end

  def valid_body(order_num: order.number, amount: order.total.to_i, status: 'success', txn_id: 'uzum-txn-1')
    {
      order_id: order_num,
      transaction_id: txn_id,
      amount: amount,
      status: status,
      event: 'callback'
    }
  end

  describe 'signature auth' do
    it 'returns 401 when X-Signature is missing' do
      raw = valid_body.to_json
      post '/api/v2/storefront/payments/uzum/callback',
           params: raw,
           headers: { 'CONTENT_TYPE' => 'application/json', 'X-Timestamp' => Time.current.to_i.to_s }
      expect(response).to have_http_status(:unauthorized)
      expect(JSON.parse(response.body)['error']).to eq('bad_signature')
    end

    it 'returns 401 when signature is wrong' do
      raw = valid_body.to_json
      post '/api/v2/storefront/payments/uzum/callback',
           params: raw,
           headers: {
             'CONTENT_TYPE' => 'application/json',
             'X-Signature' => 'deadbeef',
             'X-Timestamp' => Time.current.to_i.to_s
           }
      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns 401 when timestamp is stale' do
      stale_ts = (Time.current - 10.minutes).to_i
      body_res = callback(valid_body, ts: stale_ts)
      expect(response).to have_http_status(:unauthorized)
      expect(body_res['error']).to eq('stale_request')
    end
  end

  describe 'amount validation (Fix 1)' do
    it 'returns 422 and creates NO payment when amount is less than order.total' do
      body_res = callback(valid_body(amount: order.total.to_i - 1))
      expect(response).to have_http_status(:unprocessable_entity)
      expect(body_res['error']).to eq('amount_mismatch')
      expect(order.reload.payments.count).to eq(0)
    end

    it 'returns 422 and creates NO payment when amount is greater than order.total' do
      body_res = callback(valid_body(amount: order.total.to_i + 500))
      expect(response).to have_http_status(:unprocessable_entity)
      expect(body_res['error']).to eq('amount_mismatch')
      expect(order.reload.payments.count).to eq(0)
    end

    it 'returns 422 when amount is nil' do
      body = valid_body.merge(amount: nil)
      body_res = callback(body)
      expect(response).to have_http_status(:unprocessable_entity)
      expect(body_res['error']).to eq('amount_mismatch')
    end
  end

  describe 'happy path' do
    it 'creates a payment and marks order paid on valid callback' do
      body_res = callback(valid_body)
      expect(response).to have_http_status(:ok)
      expect(body_res['ok']).to eq(true)
      expect(order.reload.payment_state).to eq('paid')
      expect(order.payments.where(state: 'completed').count).to eq(1)
    end

    it 'is idempotent — second identical callback does not create a second payment' do
      callback(valid_body)
      callback(valid_body)
      expect(order.reload.payments.count).to eq(1)
    end

    it 'does not create payment when status is not success' do
      callback(valid_body(status: 'pending'))
      expect(order.reload.payments.count).to eq(0)
    end
  end

  describe 'race: two concurrent callbacks for the same txn', concurrent: true do
    it 'creates exactly one completed Spree::Payment (Fix 4)' do
      txn_id = 'uzum-race-1'
      body = valid_body(txn_id: txn_id)
      raw  = body.to_json
      sig  = OpenSSL::HMAC.hexdigest('SHA256', secret, raw)
      ts   = Time.current.to_i.to_s

      results = run_in_parallel(2) do |_i|
        # Pass HTTP_HOST via env: not headers: so it sets SERVER_NAME / HTTP_HOST
        # directly in the Rack env, bypassing the shared @host on the integration
        # session (which resets to DEFAULT_HOST on reset! in concurrent context).
        post '/api/v2/storefront/payments/uzum/callback',
             params: raw,
             headers: { 'CONTENT_TYPE' => 'application/json', 'X-Signature' => sig, 'X-Timestamp' => ts },
             env: { 'HTTP_HOST' => 'localhost', 'SERVER_NAME' => 'localhost' }
        JSON.parse(response.body)
      end

      results.each do |r|
        expect(r).not_to be_a(StandardError), "thread raised: #{r.inspect}"
      end

      expect(order.reload.payments.count).to eq(1)
      expect(order.payments.first.state).to eq('completed')
      expect(order.payment_state).to eq('paid')

      events = Labor::PaymentWebhookEvent.where(
        provider: 'uzum', external_txn_id: txn_id, event_type: 'callback'
      )
      expect(events.count).to eq(1)
    end
  end
end
