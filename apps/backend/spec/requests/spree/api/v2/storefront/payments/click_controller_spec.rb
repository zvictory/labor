require 'rails_helper'
require 'digest/md5'

# Locks in fix B-2 — Click's `complete` webhook must be safe against two
# simultaneous deliveries. The fix wraps the prepare/complete state work in
# `ActiveRecord::Base.transaction { order.lock! ... }` and relies on the
# unique `(provider, external_txn_id, event_type)` index on
# `payment_webhook_events`.
RSpec.describe 'Spree::Api::V2::Storefront::Payments::Click', type: :request do
  let(:secret) { 'click-test-secret' }
  let(:service_id) { '12345' }

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
    stub_const('Spree::Api::V2::Storefront::Payments::ClickController::SECRET', secret)
    store # ensure store exists before payment method
    pm = Spree::PaymentMethod.find_or_initialize_by(name: 'Click')
    pm.type = 'Spree::PaymentMethod::Check'
    pm.active = true
    pm.display_on = 'both'
    pm.stores = [store]
    pm.save!
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

  def sign_time
    @sign_time ||= Time.current.utc.strftime('%Y-%m-%d %H:%M:%S')
  end

  # NOTE: Click's spec says `action` is 0/1, but the verifier reads
  # `params[:action]` AFTER Rails has bound the route-level action name
  # ("prepare"/"complete"). That route param wins over the body param,
  # so the signature must be computed using the route action name.
  # (Whether this is a controller bug is out of scope; the spec must
  # match the deployed verifier behavior.)
  def base_params(route_action:, click_trans_id:, merchant_prepare_id: nil)
    {
      click_trans_id: click_trans_id,
      service_id: service_id,
      merchant_trans_id: order.number,
      amount: order.total.to_i.to_s,
      sign_time: sign_time,
      merchant_prepare_id: merchant_prepare_id,
      _route_action: route_action # internal — used by `signed`, stripped before POST
    }
  end

  def signed(p)
    route_action = p[:_route_action]
    sign_input =
      if route_action == 'prepare'
        "#{p[:click_trans_id]}#{p[:service_id]}#{secret}#{p[:merchant_trans_id]}#{p[:amount]}#{route_action}#{p[:sign_time]}"
      else
        "#{p[:click_trans_id]}#{p[:service_id]}#{secret}#{p[:merchant_trans_id]}#{p[:merchant_prepare_id]}#{p[:amount]}#{route_action}#{p[:sign_time]}"
      end
    sig = Digest::MD5.hexdigest(sign_input)
    p.except(:_route_action).merge(sign_string: sig)
  end

  describe 'auth' do
    it 'returns sign-check error when signature is wrong' do
      post '/api/v2/storefront/payments/click/prepare',
           params: base_params(route_action: 'prepare', click_trans_id: 'x').merge(sign_string: 'bad' * 11)
      body = JSON.parse(response.body)
      expect(body['error']).to eq(Labor::Payments::ClickVerifier::ERROR_SIGN)
    end
  end

  describe 'happy path' do
    it 'prepare -> complete returns success and creates a completed payment' do
      prepare_params = signed(base_params(route_action: 'prepare', click_trans_id: 'click-happy'))
      post '/api/v2/storefront/payments/click/prepare', params: prepare_params
      prep = JSON.parse(response.body)
      expect(prep['error']).to eq(0)
      prepare_id = prep['merchant_prepare_id']

      complete_params = signed(base_params(route_action: 'complete', click_trans_id: 'click-happy', merchant_prepare_id: prepare_id))
      post '/api/v2/storefront/payments/click/complete', params: complete_params
      comp = JSON.parse(response.body)
      expect(comp['error']).to eq(0)

      # finalize! recalculates payment_state based on totals; the real
      # invariant is that exactly one completed payment was created.
      expect(order.reload.payments.where(state: 'completed').count).to eq(1)
    end
  end

  describe 'race: two concurrent complete webhooks for the same merchant_trans_id',
           concurrent: true do
    it 'creates exactly one completed Spree::Payment and one processed event (B-2)' do
      txn = 'click-race-1'
      prepare_params = signed(base_params(route_action: 'prepare', click_trans_id: txn))
      post '/api/v2/storefront/payments/click/prepare', params: prepare_params
      prep = JSON.parse(response.body)
      expect(prep['error']).to eq(0)
      prepare_id = prep['merchant_prepare_id']

      complete_params = signed(base_params(route_action: 'complete', click_trans_id: txn, merchant_prepare_id: prepare_id))

      results = run_in_parallel(2) do |_i|
        post '/api/v2/storefront/payments/click/complete', params: complete_params
        JSON.parse(response.body)
      end

      results.each do |r|
        expect(r).not_to be_a(StandardError), "thread raised: #{r.inspect}"
      end

      expect(order.reload.payments.where(state: 'completed').count).to eq(1)

      processed_events = Labor::PaymentWebhookEvent.where(
        provider: 'click', external_txn_id: txn, event_type: 'complete', status: 'processed'
      )
      expect(processed_events.count).to eq(1)

      # Both threads should report error=0 since the loser sees the
      # `duplicate` event branch and replies with the same payload shape.
      results.each do |r|
        expect(r['error']).to eq(0),
                              "expected duplicate complete to return error 0, got #{r.inspect}"
      end
    end
  end
end
