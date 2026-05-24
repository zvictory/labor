require 'rails_helper'

# Locks in fix B-3 — `Labor::Vote` must NOT recompute aggregates inline
# inside the after_commit callback. Instead it enqueues
# `Labor::RefreshProductAggregatesJob` so the recompute happens outside
# the request and can be serialised by a row lock on
# `Labor::ProductFragranceDetail`.
RSpec.describe Labor::Vote, type: :model do
  include ActiveJob::TestHelper

  # The app is wired to Sidekiq in test env; flip to the in-memory test
  # adapter just for this file so `assert_enqueued_with` is usable.
  around do |example|
    original = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    example.run
  ensure
    ActiveJob::Base.queue_adapter = original
  end

  # When run after concurrent: true specs (which use DatabaseCleaner :deletion),
  # the spree_stores table may be empty. Ensure a usable store exists.
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
      password: 'password123',
      password_confirmation: 'password123'
    )
  end

  it 'enqueues RefreshProductAggregatesJob with the right product_id on create' do
    assert_enqueued_with(
      job: Labor::RefreshProductAggregatesJob,
      args: [product.id]
    ) do
      Labor::Vote.create!(
        product: product,
        user: user,
        rating: 4,
        longevity: 3,
        sillage: 5,
        love_level: 'like',
        seasons: %w[winter],
        time_of_day: %w[evening]
      )
    end
  end

  it 'does not recompute aggregates inline (job is enqueued, not performed)' do
    Labor::ProductFragranceDetail.create!(spree_product_id: product.id, gender: 'unisex')

    perform_enqueued_jobs(only: []) do
      Labor::Vote.create!(product: product, user: user, rating: 5)
    end

    # Inline recompute would have moved votes_count to 1. The job
    # didn't run, so it should still be 0.
    expect(Labor::ProductFragranceDetail.find_by(spree_product_id: product.id).votes_count).to eq(0)
  end
end
