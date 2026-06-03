require 'rails_helper'

# The storefront checkout (apps/web checkout/page.tsx) runs a *custom* flow:
# it adds line items, then advances the order to payment. Stock is tracked
# (spree_stock_items.count_on_hand, backorderable: false — seeded by
# labor_catalog.rake), but the custom flow never consults it. Without an
# explicit guard, an IG drop where two buyers race for the last bottle would
# let both orders through and oversell — the trust disaster the plan flags.
RSpec.describe 'Storefront checkout stock guard', type: :request do
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
  # Stock location must exist before the variant so Spree auto-creates its
  # stock_item; otherwise on-hand can't be set and the guard has nothing to read.
  let!(:stock_location) do
    Spree::StockLocation.first ||
      Spree::StockLocation.create!(name: 'Test WH', country: country, default: true, active: true)
  end
  let(:shipping_category) do
    Spree::ShippingCategory.first || Spree::ShippingCategory.create!(name: 'Default')
  end
  # Must be published: Spree 5.4 OrderContents#add rejects draft/archived
  # products ("cannot be added to cart") *before* it ever checks stock, and a
  # draft product reports can_supply? == false regardless of on-hand. An
  # unpublished fixture would make the oversell test pass for the wrong reason.
  let(:product) do
    Spree::Product.create!(name: 'Scarce Fragrance', price: 100,
                           shipping_category: shipping_category,
                           status: 'active', available_on: 1.day.ago)
  end
  let(:variant) { product.master }

  let(:path) { '/api/v2/storefront/checkout' }

  # Exactly one bottle on hand, not backorderable. The seeded stock location
  # has propagate_all_variants: false, so the stock_item isn't auto-created —
  # create it explicitly for this variant.
  before do
    stock_item = variant.stock_items.first ||
      variant.stock_items.create!(stock_location: stock_location, backorderable: false)
    stock_item.update!(backorderable: false)
    stock_item.set_count_on_hand(1)
  end

  it 'rejects a quantity that exceeds on-hand stock and persists no order' do
    expect {
      post path, params: { line_items: [{ variant_id: variant.id, quantity: 2 }] }, as: :json
    }.not_to change(Spree::Order, :count)

    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body['error']).to match(/stock/i)
  end

  # The guard must not over-block: an in-stock quantity passes the stock gate
  # and proceeds to the next checkout step (address), which here is absent →
  # 400 param-missing. The point is it is NOT rejected as a stock error.
  it 'lets an in-stock quantity past the stock gate' do
    post path, params: { line_items: [{ variant_id: variant.id, quantity: 1 }] }, as: :json

    expect(response).to have_http_status(:bad_request)
    expect(response.parsed_body['error']).not_to match(/stock/i)
  end
end
