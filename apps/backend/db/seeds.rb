# Labor — dev seeds.
#
# Idempotent: safe to re-run. Creates the minimum Spree + Labor fixtures the
# storefront needs to render real /catalog and /campaigns data:
#   * 1 Spree::Store + shipping/tax category
#   * 8 Labor::Brand records (popularBrands on the homepage)
#   * 6 Labor::Note records (popularNotes on the homepage)
#   * 4 Spree::Product records (Le Labo classics) + master variant + price
#   * Labor::ProductFragranceDetail + ProductNote per product
#   * 1 active Labor::Campaign linking two products, with RU translation
#
# No image attachments — Spree storefront API returns nil and the storefront
# falls back to /public/products/*.png assets it already ships.

ActiveRecord::Base.transaction do
  store = Spree::Store.find_or_create_by!(code: 'labor') do |s|
    s.name = 'Labor'
    s.url = 'localhost:3000'
    s.mail_from_address = 'noreply@labor.local'
    s.default_currency = 'UZS'
    s.supported_currencies = 'UZS'
    s.supported_locales = 'ru,en,uz,uzc'
    s.default_locale = 'ru'
  end
  # Force UZS on any pre-existing store row that pre-dates the currency
  # initializer work (older dev DBs were seeded with USD default).
  store.update!(default_currency: 'UZS') if store.default_currency != 'UZS'
  Spree::Store.default # warm the cache

  shipping_category = Spree::ShippingCategory.find_or_create_by!(name: 'Default')
  tax_category = Spree::TaxCategory.find_or_create_by!(name: 'Default')

  brand_data = [
    { slug: 'le-labo',        name: 'Le Labo',        country: 'USA',    niche: true  },
    { slug: 'chanel',         name: 'Chanel',         country: 'France', niche: false },
    { slug: 'dior',           name: 'Dior',           country: 'France', niche: false },
    { slug: 'prada',          name: 'Prada',          country: 'Italy',  niche: false },
    { slug: 'gucci',          name: 'Gucci',          country: 'Italy',  niche: false },
    { slug: 'givenchy',       name: 'Givenchy',       country: 'France', niche: false },
    { slug: 'versace',        name: 'Versace',        country: 'Italy',  niche: false },
    { slug: 'tommy-hilfiger', name: 'Tommy Hilfiger', country: 'USA',    niche: false },
    { slug: 'chloe',          name: 'Chloé',          country: 'France', niche: false }
  ]
  brands = brand_data.each_with_object({}) do |attrs, h|
    h[attrs[:slug]] = Labor::Brand.find_or_create_by!(slug: attrs[:slug]) do |b|
      b.name = attrs[:name]
      b.country = attrs[:country]
      b.niche = attrs[:niche]
    end
  end

  note_data = [
    { slug: 'sandalwood', name: 'Sandalwood', family: 'woody',    ru: 'Сандал'      },
    { slug: 'rose',       name: 'Rose',       family: 'floral',   ru: 'Роза'        },
    { slug: 'bergamot',   name: 'Bergamot',   family: 'citrus',   ru: 'Бергамот'    },
    { slug: 'black-tea',  name: 'Black Tea',  family: 'aromatic', ru: 'Чёрный чай'  },
    { slug: 'vetiver',    name: 'Vetiver',    family: 'woody',    ru: 'Ветивер'     },
    { slug: 'musk',       name: 'Musk',       family: 'oriental', ru: 'Мускус'      }
  ]
  notes = note_data.each_with_object({}) do |attrs, h|
    note = Labor::Note.find_or_create_by!(slug: attrs[:slug]) do |n|
      n.name = attrs[:name]
      n.family = attrs[:family]
    end
    Mobility.with_locale(:ru) { note.name = attrs[:ru]; note.save! }
    h[attrs[:slug]] = note
  end

  product_data = [
    {
      slug: 'santal-33',  name: 'Santal 33',     year: 2011, price: 2_400_000,
      gender: 'unisex', concentration: 'edp',
      top: %w[bergamot],         heart: %w[rose],       base: %w[sandalwood vetiver musk]
    },
    {
      slug: 'the-noir-29', name: 'Thé Noir 29',  year: 2015, price: 2_400_000,
      gender: 'unisex', concentration: 'edp',
      top: %w[bergamot black-tea], heart: %w[rose],       base: %w[vetiver musk]
    },
    {
      slug: 'bergamote-22', name: 'Bergamote 22', year: 2006, price: 2_200_000,
      gender: 'unisex', concentration: 'edp',
      top: %w[bergamot],         heart: %w[rose],       base: %w[musk]
    },
    {
      slug: 'rose-31',    name: 'Rose 31',       year: 2006, price: 2_200_000,
      gender: 'unisex', concentration: 'edp',
      top: %w[bergamot],         heart: %w[rose],       base: %w[sandalwood musk]
    }
  ]

  products = product_data.each_with_object({}) do |attrs, h|
    product = Spree::Product.find_or_initialize_by(slug: attrs[:slug])
    product.assign_attributes(
      name: attrs[:name],
      description: "#{attrs[:name]} — Le Labo signature fragrance.",
      available_on: 1.month.ago,
      status: 'active', # Spree 4.8 enum; default is :draft which the storefront filters out
      make_active_at: 1.month.ago,
      shipping_category: shipping_category,
      tax_category: tax_category,
      price: attrs[:price]
    )
    product.stores << store unless product.stores.include?(store)
    product.save!

    Labor::ProductFragranceDetail.find_or_create_by!(spree_product_id: product.id) do |d|
      d.labor_brand_id = brands['le-labo'].id
      d.release_year = attrs[:year]
      d.gender = attrs[:gender]
      d.concentration = attrs[:concentration]
      d.volume_ml = 100
    end

    Labor::ProductNote.where(spree_product_id: product.id).destroy_all
    attrs[:top].each_with_index   { |s, i| Labor::ProductNote.create!(spree_product_id: product.id, labor_note_id: notes[s].id, pyramid_layer: 'top',   position: i) }
    attrs[:heart].each_with_index { |s, i| Labor::ProductNote.create!(spree_product_id: product.id, labor_note_id: notes[s].id, pyramid_layer: 'heart', position: i) }
    attrs[:base].each_with_index  { |s, i| Labor::ProductNote.create!(spree_product_id: product.id, labor_note_id: notes[s].id, pyramid_layer: 'base',  position: i) }

    h[attrs[:slug]] = product
  end

  campaign = Labor::Campaign.find_or_initialize_by(slug: 'le-labo-launch')
  campaign.assign_attributes(
    status: 'active',
    starts_at: 1.day.ago,
    ends_at: 60.days.from_now,
    broadcast_to_telegram: false
  )
  campaign.save!
  Mobility.with_locale(:ru) do
    campaign.title = 'Le Labo в Labor'
    campaign.subtitle = 'Селективная парфюмерия из Бруклина'
    campaign.body = 'Знаковые ароматы Le Labo теперь доступны с доставкой по Узбекистану.'
    campaign.cta_label = 'Открыть подборку'
    campaign.save!
  end
  Mobility.with_locale(:en) do
    campaign.title = 'Le Labo at Labor'
    campaign.subtitle = 'Brooklyn niche perfumery'
    campaign.body = 'Le Labo classics now shipping across Uzbekistan.'
    campaign.cta_label = 'See selection'
    campaign.save!
  end

  Labor::CampaignProduct.where(labor_campaign_id: campaign.id).destroy_all
  [products['santal-33'], products['the-noir-29']].each_with_index do |p, i|
    Labor::CampaignProduct.create!(labor_campaign_id: campaign.id, spree_product_id: p.id, position: i)
  end

  Rails.logger.info "[seed] brands=#{brands.size} notes=#{notes.size} products=#{products.size} campaign=#{campaign.slug}"
end
