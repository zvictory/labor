require 'rails_helper'

RSpec.describe Labor::ProductFragranceDetail, type: :model do
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

  it 'stores empty array breakdowns as empty objects instead of NaN values' do
    detail = described_class.create!(spree_product_id: product.id, gender: 'unisex')

    Labor::Vote.create!(
      product: product,
      user: user,
      rating: 5,
      seasons: [],
      time_of_day: []
    )

    detail.recompute_aggregates!

    detail.reload
    expect(detail.votes_count).to eq(1)
    expect(detail.seasons_breakdown).to eq({})
    expect(detail.time_breakdown).to eq({})
    expect(detail.as_json.to_json).not_to include('NaN')
  end
end
