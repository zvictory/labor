require 'rails_helper'

# Wk1 measurement layer: the storefront sends the visitor's captured UTM
# attribution (apps/web src/lib/analytics/utm.ts readUtm() -> { first, last })
# in the checkout POST. The backend must stamp it onto the order so server-side
# reporting and the Wk2 Meta CAPI Purchase event can read which campaign drove
# the sale. Stored in private_metadata (internal attribution, not storefront-
# exposed) — jsonb already on spree_orders, so no migration.
RSpec.describe 'Storefront checkout UTM attribution', type: :request do
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

  let(:country) do
    Spree::Country.find_by(iso: 'UZ') ||
      Spree::Country.create!(name: 'Uzbekistan', iso: 'UZ', iso3: 'UZB',
                             iso_name: 'UZBEKISTAN', numcode: 860)
  end
  let!(:stock_location) do
    Spree::StockLocation.first ||
      Spree::StockLocation.create!(name: 'Test WH', country: country, default: true, active: true)
  end
  let(:shipping_category) do
    Spree::ShippingCategory.first || Spree::ShippingCategory.create!(name: 'Default')
  end
  let(:product) do
    Spree::Product.create!(name: 'Tracked Fragrance', price: 100,
                           shipping_category: shipping_category,
                           status: 'active', available_on: 1.day.ago)
  end
  let(:variant) { product.master }

  before do
    country # ensure UZ exists for the address
    stock_item = variant.stock_items.first ||
      variant.stock_items.create!(stock_location: stock_location, backorderable: false)
    stock_item.update!(backorderable: false)
    stock_item.set_count_on_hand(5)
  end

  let(:path) { '/api/v2/storefront/checkout' }

  # Mirrors readUtm(): first-touch (discovery) is sticky, last-touch (the click
  # that closed) differs — proves both are stored verbatim, not collapsed.
  let(:utm) do
    {
      first: { utm_source: 'instagram', utm_campaign: 'wk1' },
      last:  { utm_source: 'telegram',  utm_campaign: 'wk4' }
    }
  end

  let(:checkout_params) do
    {
      line_items: [{ variant_id: variant.id, quantity: 1 }],
      ship_address: {
        name: 'Aziz Karimov', phone: '+998901234567',
        city: 'Tashkent', address: 'Amir Temur 1'
      },
      delivery_provider: 'yandex',
      payment_method: 'cod',
      utm: utm
    }
  end

  it 'stamps the first/last-touch UTM onto the created order private_metadata' do
    expect {
      post path, params: checkout_params, as: :json
    }.to change(Spree::Order, :count).by(1)

    expect(response).to have_http_status(:ok)

    order = Spree::Order.last
    expect(order.private_metadata['utm']).to eq(
      'first' => { 'utm_source' => 'instagram', 'utm_campaign' => 'wk1' },
      'last'  => { 'utm_source' => 'telegram',  'utm_campaign' => 'wk4' }
    )
  end

  # An untracked buyer (no IG/campaign tags ever captured) checks out fine; the
  # order simply carries no utm key — attribution is optional, never a blocker.
  it 'completes checkout with no utm key when none is sent' do
    expect {
      post path, params: checkout_params.except(:utm), as: :json
    }.to change(Spree::Order, :count).by(1)

    expect(response).to have_http_status(:ok)
    expect(Spree::Order.last.private_metadata).not_to have_key('utm')
  end
end
