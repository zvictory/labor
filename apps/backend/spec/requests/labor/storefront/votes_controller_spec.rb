require 'rails_helper'

# Covers the missing backend half of the storefront vote widget
# (apps/web .../pdp/vote-widget.tsx), which already POSTs to
# /api/v2/storefront/votes. Each example pins an invariant that, if it
# regressed, would silently break a vote that *looks* successful in the UI.
RSpec.describe 'Storefront votes', type: :request do
  include ActiveJob::TestHelper

  # Aggregates are refreshed out-of-band (fix B-3). Use the in-memory adapter
  # so we can assert the job is *enqueued* without running it inline.
  around do |example|
    original = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    example.run
  ensure
    ActiveJob::Base.queue_adapter = original
  end

  # concurrent: true specs use DatabaseCleaner :deletion and can empty
  # spree_stores; guarantee a default store exists (mirrors vote_spec.rb).
  before do
    unless Spree::Store.exists?
      Spree::Store.create!(
        name: 'Labor Test', url: 'localhost',
        mail_from_address: 'noreply@labor.local',
        default_currency: 'UZS', code: "labor-#{SecureRandom.hex(4)}",
        default: true, default_locale: 'ru', supported_locales: 'ru'
      )
    end
  end

  let(:shipping_category) do
    Spree::ShippingCategory.first || Spree::ShippingCategory.create!(name: 'Default')
  end
  let(:product) do
    Spree::Product.create!(name: 'Test Fragrance', price: 100, shipping_category: shipping_category)
  end
  let(:user) do
    Spree::User.create!(
      email: "voter-#{SecureRandom.hex(4)}@labor.local",
      password: 'password123', password_confirmation: 'password123'
    )
  end

  # Spree 5 V3 storefront auth is JWT Bearer (Spree::Api::V3::JwtAuthentication).
  # Mint the same token telegram_auth#issue_token now issues, the same way the
  # storefront replays it: `Authorization: Bearer <jwt>`.
  let(:auth_headers) do
    secret = Spree::Api::Config[:jwt_secret_key].presence ||
             Rails.application.credentials.jwt_secret_key ||
             ENV['JWT_SECRET_KEY'] ||
             Rails.application.secret_key_base
    jwt = JWT.encode(
      { user_id: user.id, user_type: 'customer', jti: SecureRandom.uuid,
        iss: 'spree', aud: 'store_api', exp: Time.current.to_i + 3600 },
      secret, 'HS256'
    )
    { 'Authorization' => "Bearer #{jwt}" }
  end

  let(:path) { '/api/v2/storefront/votes' }

  # The exact body the widget sends once a user picks the headline rating but
  # leaves longevity/sillage untouched (they stay at their 0 seed value).
  let(:widget_body) do
    {
      product_id: product.id,
      rating: 4, longevity: 0, sillage: 0,
      love_level: 'like',
      seasons: %w[winter], time_of_day: %w[night]
    }
  end

  it 'rejects an unauthenticated vote with 401 (widget shows signInRequired)' do
    post path, params: widget_body, as: :json
    expect(response).to have_http_status(:unauthorized)
    expect(Labor::Vote.count).to eq(0)
  end

  it 'persists a vote and enqueues the aggregate refresh, not an inline recompute' do
    assert_enqueued_with(job: Labor::RefreshProductAggregatesJob, args: [product.id]) do
      post path, params: widget_body, headers: auth_headers, as: :json
    end
    expect(response).to have_http_status(:ok)

    vote = Labor::Vote.sole
    expect(vote.spree_user_id).to eq(user.id)
    expect(vote.rating).to eq(4)
    expect(vote.love_level).to eq('like')
    expect(vote.seasons).to eq(%w[winter])
  end

  # The widget seeds longevity/sillage to 0 and posts them as-is. The model
  # validates 1..5 (allow_nil), so 0 must be read as "not rated" (nil), or a
  # perfectly valid partial vote would 422.
  it 'coerces untouched 0 facets to nil instead of failing validation' do
    post path, params: widget_body, headers: auth_headers, as: :json
    expect(response).to have_http_status(:ok)

    vote = Labor::Vote.sole
    expect(vote.longevity).to be_nil
    expect(vote.sillage).to be_nil
  end

  # The unique index makes a repeat vote an UPDATE. A second submission must
  # mutate the same row, never create a duplicate.
  it 'upserts the same row on a repeat vote by the same user' do
    post path, params: widget_body, headers: auth_headers, as: :json
    expect(response).to have_http_status(:ok)

    post path, params: widget_body.merge(rating: 2, love_level: 'hate'), headers: auth_headers, as: :json
    expect(response).to have_http_status(:ok)

    expect(Labor::Vote.where(spree_user_id: user.id, spree_product_id: product.id).count).to eq(1)
    expect(Labor::Vote.sole.rating).to eq(2)
    expect(Labor::Vote.sole.love_level).to eq('hate')
  end

  it 'returns 422 for an out-of-vocabulary season' do
    post path, params: widget_body.merge(seasons: %w[monsoon]), headers: auth_headers, as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    expect(Labor::Vote.count).to eq(0)
  end
end
