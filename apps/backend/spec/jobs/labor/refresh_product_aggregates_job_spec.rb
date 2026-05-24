require 'rails_helper'

# Locks in fix B-3 (job side) — even if two job workers pick up refreshes
# for the same product_id at the same time, the row-level lock inside
# `RefreshProductAggregatesJob` MUST serialise them, leaving a
# deterministic final state on `Labor::ProductFragranceDetail`.
RSpec.describe Labor::RefreshProductAggregatesJob, type: :job do
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
  let(:pfd) do
    Labor::ProductFragranceDetail.create!(spree_product_id: product.id, gender: 'unisex')
  end

  def make_user
    Spree::User.create!(
      email: "voter-#{SecureRandom.hex(6)}@labor.local",
      password: 'password123',
      password_confirmation: 'password123'
    )
  end

  describe 'parallel perform_now on the same product_id', concurrent: true do
    it 'serialises via the row lock and produces a deterministic aggregate' do
      pfd # touch to insert
      # Insert three votes whose computed average rating is exactly 4.0.
      ratings = [3, 4, 5]
      ratings.each do |r|
        Labor::Vote.create!(
          spree_product_id: product.id,
          spree_user_id: make_user.id,
          rating: r
        )
      end

      results = run_in_parallel(2) do |_i|
        described_class.perform_now(product.id)
        :done
      end

      results.each do |r|
        expect(r).not_to be_a(StandardError), "thread raised: #{r.inspect}"
      end

      reloaded = Labor::ProductFragranceDetail.find_by(spree_product_id: product.id)
      expect(reloaded.votes_count).to eq(3)
      expect(reloaded.avg_rating.to_f).to eq(4.0)
    end
  end
end
