require 'rails_helper'

RSpec.describe Labor::Catalog::ProductScope do
  before do
    unless Spree::Store.exists?
      Spree::Store.create!(
        name: 'Labor Test',
        url: 'localhost',
        mail_from_address: 'noreply@labor.local',
        default_currency: 'UZS',
        code: "labor-#{SecureRandom.hex(4)}",
        default: true,
        default_locale: 'ru',
        supported_locales: 'ru'
      )
    end
  end

  describe '#relation' do
    it 'returns an unloaded relation for brand filtering instead of materialized ids' do
      relation = described_class.new(params: { filter: { brand: 'sample-brand' } }).relation

      expect(relation).to be_a(ActiveRecord::Relation)
      expect(relation.loaded?).to be_falsey
      expect(relation.to_sql).to include('labor_brands')
      expect(relation.to_sql).to include('SELECT DISTINCT ON')
    end

    it 'keeps popular sorting on the fragrance detail rating aggregate' do
      relation = described_class.new(params: { sort: 'popular' }).relation

      expect(relation.to_sql).to include('labor_product_fragrance_details.avg_rating DESC NULLS LAST')
    end

    it 'accepts ActionController parameters from the storefront controller' do
      params = ActionController::Parameters.new(filter: { gender: 'unisex', name: 'gio' }, sort: 'price_asc')

      relation = described_class.new(params: params).relation

      expect(relation.to_sql).to include('"labor_product_fragrance_details"."gender" =')
      expect(relation.to_sql).to include('spree_products.name ILIKE')
      expect(relation.to_sql).to include('spree_prices.amount ASC NULLS LAST')
    end
  end
end
