# frozen_string_literal: true

# labor:catalog_import — idempotent import of the real Billz catalog
# (apps/backend/db/catalog/billz_catalog.csv, 542 rows) into Spree::Product
# and Labor::Brand / Labor::ProductFragranceDetail.
#
# - Brand pulled from xlsx "Бренд" column (107 distinct).
# - Category normalized from "Категория" into one of: parfum, home, auto,
#   body_care, essentials, accessories, other.
# - Perfume rows additionally get 4-6 random notes from the canonical
#   Labor::Note table and 1-2 perfumers — synthetic, since notes/perfumers
#   are not in the source spreadsheet.
#
# Re-running is safe: existing products are matched by SKU and updated;
# missing notes/perfumers are filled in.
#
# Usage:
#   docker exec labor-backend-1 bin/rake labor:catalog_import
#
# Companion task:
#   bin/rake labor:catalog_wipe_synthetic   # drop products NOT in the CSV.

require 'csv'

namespace :labor do
  CSV_PATH = Rails.root.join('db', 'catalog', 'billz_catalog.csv').freeze

  CATEGORY_MAP = {
    'parfum'       => 'parfum',
    'домашний парфюм' => 'home',
    'home perfume- домашный парфюм' => 'home',
    'авто парфюм'  => 'auto',
    'гель для душа' => 'body_care',
    'жидкое мыло'  => 'body_care',
    'лосьон'       => 'body_care',
    'krem'         => 'body_care',
    'essential oil' => 'essentials',
    'antiseptik'   => 'essentials',
    'flakon'       => 'accessories',
    'флакон'       => 'accessories',
    'aroma diffizor' => 'accessories',
    'свеча'        => 'accessories',
    'mix'          => 'other'
  }.freeze

  def categorize(raw)
    return 'other' if raw.nil? || raw.strip.empty?
    CATEGORY_MAP[raw.strip.downcase] || 'other'
  end

  def brand_slug_for(raw)
    return 'labor' if raw.nil? || raw.strip.empty?
    raw.strip.downcase
       .tr('&', '-')
       .gsub(/[^a-z0-9]+/, '-')
       .gsub(/(^-|-$)/, '')
       .presence || 'labor'
  end

  # Build a short, human-readable product slug from the catalog name.
  # The Billz CSV embeds the brand inside the name (e.g. "Bergamote 22 Le Labo"),
  # so we strip leading/trailing brand-slug tokens to avoid duplication and we
  # do NOT append the SKU. Collisions are resolved by callers via -2/-3 suffix.
  def product_slug_for(brand_slug, name, sku)
    base = name.to_s.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/(^-|-$)/, '')
    bs   = brand_slug.to_s.strip
    if bs.present?
      base = base.sub(/\A#{Regexp.escape(bs)}-/, '').sub(/-#{Regexp.escape(bs)}\z/, '')
    end
    base = base.gsub(/-+/, '-').gsub(/(^-|-$)/, '')
    base = base[0, 60].sub(/-$/, '')
    if base.empty?
      sku_part = sku.to_s.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/(^-|-$)/, '')
      base = sku_part[0, 40].sub(/-$/, '')
    end
    base
  end

  # Build a display name in "Brand - Perfume" form.
  # Idempotent: re-running on an already-formatted name doesn't double the brand.
  # Falls back to the raw name when no brand is known or stripping leaves nothing.
  # Canonical product display name = bare perfume name with the brand stripped.
  # The brand renders separately (kicker + breadcrumb), so embedding it in the
  # name causes duplicate "Jo Malone London - Jo Malone London - …" stutter.
  # Idempotent: an already-bare name passes through unchanged.
  def product_name_for(brand_display, raw_name)
    bd = brand_display.to_s.strip
    n  = raw_name.to_s.strip
    return n if bd.empty?

    bare = n.sub(/\A#{Regexp.escape(bd)}\s*[-–—]\s*/i, '')
            .sub(/\A#{Regexp.escape(bd)}\s+/i, '')
            .sub(/\s+#{Regexp.escape(bd)}\z/i, '')
            .strip
    bare.empty? ? n : bare
  end

  # Reserve a unique slug: returns `base` if free, else `base-2`, `base-3`, …
  # `current_product_id` is allowed to keep its own slug (no collision with itself).
  def reserve_unique_slug(base, current_product_id: nil)
    return base if base.empty?
    candidate = base
    n = 2
    while (existing = Spree::Product.unscoped.where(slug: candidate).pick(:id)) &&
          existing != current_product_id
      candidate = "#{base}-#{n}"
      n += 1
    end
    candidate
  end

  desc 'Import real Billz catalog CSV into Spree::Product + Labor::Brand (idempotent)'
  task catalog_import: :environment do
    started = Time.now
    rng = Random.new(20260521)

    store = Spree::Store.default
    shipping_category = Spree::ShippingCategory.find_or_create_by!(name: 'Default')
    tax_category = Spree::TaxCategory.find_or_create_by!(name: 'Default')

    raise "CSV not found at #{CSV_PATH}" unless CSV_PATH.exist?

    rows = CSV.read(CSV_PATH.to_s, headers: true)
    puts "[catalog] read #{rows.size} rows from #{CSV_PATH.basename}"

    # ---------- BRANDS from the catalog ----------
    raw_brands = rows.map { |r| r['brand'].to_s.strip }.uniq.reject(&:empty?)
    raw_brands.each do |raw|
      slug = brand_slug_for(raw)
      next if slug.empty?
      Labor::Brand.find_or_create_by!(slug: slug) do |b|
        b.name = raw
        b.country = nil
        b.founded_year = nil
        b.niche = true
        b.active = true
      end
    end
    # House brand fallback
    Labor::Brand.find_or_create_by!(slug: 'labor') do |b|
      b.name = 'Labor'
      b.niche = false
      b.active = true
    end
    puts "[catalog] brands: #{Labor::Brand.count} (from #{raw_brands.size} raw)"

    # ---------- existing notes/perfumers (from megaseed) ----------
    note_ids     = Labor::Note.pluck(:id)
    perfumer_ids = Labor::Perfumer.pluck(:id)
    raise '[catalog] no Labor::Note rows; run labor:megaseed first to seed notes/perfumers' if note_ids.empty?

    genders        = Labor::ProductFragranceDetail::GENDERS
    concentrations = Labor::ProductFragranceDetail::CONCENTRATIONS
    layers         = %w[top heart base]

    created = 0
    updated = 0
    skipped = 0

    rows.each do |row|
      name = row['name'].to_s.strip
      sku  = row['sku'].to_s.strip
      next if name.empty? || sku.empty?

      price = row['price'].to_i
      next if price <= 0

      qty       = row['qty'].to_i
      barcode   = row['barcode'].to_s.strip
      raw_brand = row['brand'].to_s.strip
      category  = categorize(row['category'])
      volume    = row['volume_ml'].to_s.strip.to_i
      volume    = nil if volume <= 0

      brand_slug = brand_slug_for(raw_brand)
      brand = Labor::Brand.find_by(slug: brand_slug) || Labor::Brand.find_by!(slug: 'labor')

      base_slug = product_slug_for(brand_slug, name, sku)
      display_name = product_name_for(raw_brand, name)

      master_variant = Spree::Variant.where(is_master: true, sku: sku).first
      product = master_variant&.product || Spree::Product.find_by(slug: base_slug)
      slug = reserve_unique_slug(base_slug, current_product_id: product&.id)

      is_new = product.nil?

      if is_new
        product = Spree::Product.new(
          name:              display_name,
          slug:              slug,
          # description deliberately blank — the CSV ships no prose, and
          # echoing the name into description renders the title twice on PDP.
          description:       '',
          available_on:      1.year.ago,
          status:            'active',
          make_active_at:    1.year.ago,
          shipping_category: shipping_category,
          tax_category:      tax_category,
          price:             price
        )
        product.stores << store unless product.stores.include?(store)
        product.save!
        created += 1
      else
        product.update!(
          name:        display_name,
          status:      'active',
          price:       price
        )
        updated += 1
      end

      master = product.master
      master.update_columns(sku: sku) if master.sku != sku
      if master.default_price
        master.default_price.update_columns(amount: price, currency: 'UZS')
      else
        master.prices.create!(amount: price, currency: 'UZS')
      end

      # Stock: set on first stock location
      stock_loc = Spree::StockLocation.first
      if stock_loc
        item = master.stock_items.find_or_create_by!(stock_location_id: stock_loc.id)
        item.update_columns(count_on_hand: qty, backorderable: false)
      end

      # ---------- ProductFragranceDetail ----------
      detail = Labor::ProductFragranceDetail.find_or_initialize_by(spree_product_id: product.id)
      detail.assign_attributes(
        labor_brand_id: brand.id,
        gender:         genders[rng.rand(genders.size)],
        concentration:  category == 'parfum' ? concentrations[rng.rand(concentrations.size)] : nil,
        volume_ml:      volume,
        release_year:   rng.rand(2000..2025),
        discontinued:   false,
        avg_rating:     (rng.rand * 1.3 + 3.6).round(2),
        avg_longevity:  (rng.rand * 5 + 3).round(2),
        avg_sillage:    (rng.rand * 5 + 3).round(2),
        votes_count:    rng.rand(5..900),
        reviews_count:  rng.rand(0..200),
        seasons_breakdown: {},
        time_breakdown:    {},
        love_breakdown:    {}
      )
      detail.save!

      # ---------- Notes/Perfumers only for perfume + home perfume + auto ----------
      if %w[parfum home auto].include?(category) && Labor::ProductNote.where(spree_product_id: product.id).none?
        picked = note_ids.sample(rng.rand(4..6), random: rng)
        picked.each_with_index do |nid, idx|
          Labor::ProductNote.create!(
            spree_product_id: product.id,
            labor_note_id:    nid,
            pyramid_layer:    layers[idx % layers.size],
            position:         idx
          )
        end
      end

      if category == 'parfum' && Labor::ProductPerfumer.where(spree_product_id: product.id).none?
        rng.rand(1..2).times do
          pid = perfumer_ids[rng.rand(perfumer_ids.size)]
          Labor::ProductPerfumer.find_or_create_by!(
            spree_product_id:  product.id,
            labor_perfumer_id: pid
          )
        end
      end
    rescue => e
      skipped += 1
      warn "[catalog] SKIP #{sku.inspect} (#{name.inspect}): #{e.class}: #{e.message}"
    end

    elapsed = (Time.now - started).round(1)
    puts "[catalog] DONE in #{elapsed}s  created=#{created} updated=#{updated} skipped=#{skipped}"
    puts "[catalog] totals  brands=#{Labor::Brand.count}  products=#{Spree::Product.count}  details=#{Labor::ProductFragranceDetail.count}"
  end

  desc 'Delete synthetic megaseed products that are NOT in the Billz catalog CSV'
  task catalog_wipe_synthetic: :environment do
    rows = CSV.read(CSV_PATH.to_s, headers: true)
    real_skus = rows.map { |r| r['sku'].to_s.strip }.reject(&:empty?).to_set
    puts "[wipe] real catalog SKUs: #{real_skus.size}"

    real_product_ids = Spree::Variant.where(is_master: true, sku: real_skus.to_a).pluck(:product_id)
    puts "[wipe] matched #{real_product_ids.size} real product rows via master variant SKU"
    synthetic_scope = Spree::Product.where.not(id: real_product_ids)
    n = synthetic_scope.count
    puts "[wipe] deleting #{n} synthetic products"

    deleted = 0
    synthetic_scope.find_in_batches(batch_size: 100) do |batch|
      ids = batch.map(&:id)
      Labor::ProductNote.where(spree_product_id: ids).delete_all
      Labor::ProductPerfumer.where(spree_product_id: ids).delete_all
      Labor::ProductFragranceDetail.where(spree_product_id: ids).delete_all
      Spree::Vote.where(spree_product_id: ids).delete_all if defined?(Spree::Vote)
      Labor::Vote.where(spree_product_id: ids).delete_all if defined?(Labor::Vote)
      variant_ids = Spree::Variant.unscoped.where(product_id: ids).pluck(:id)
      Spree::StockItem.where(variant_id: variant_ids).delete_all
      Spree::Price.where(variant_id: variant_ids).delete_all
      Spree::ProductsTaxon.where(product_id: ids).delete_all if defined?(Spree::ProductsTaxon)
      Spree::ProductOptionType.where(product_id: ids).delete_all
      Spree::ProductProperty.where(product_id: ids).delete_all
      Spree::StoreProduct.where(product_id: ids).delete_all
      ActiveRecord::Base.connection.execute(
        "DELETE FROM labor_campaign_products WHERE spree_product_id IN (#{ids.join(',')})"
      )
      Spree::Variant.unscoped.where(product_id: ids).delete_all
      Spree::Product.where(id: ids).delete_all
      deleted += ids.size
    end

    puts "[wipe] deleted=#{deleted}  remaining products=#{Spree::Product.count}"
  end

  # labor:catalog_reslug — rewrite every product's slug to the short form.
  # Old slugs are preserved by FriendlyId history (friendly_id_slugs table),
  # so existing PDP URLs keep resolving and 301-redirect to the new ones.
  desc 'Rewrite all Spree::Product slugs to the short brand-stripped form (history preserved)'
  task catalog_reslug: :environment do
    started = Time.now
    detail_brand = Labor::ProductFragranceDetail.pluck(:spree_product_id, :labor_brand_id).to_h
    brand_slugs  = Labor::Brand.pluck(:id, :slug).to_h

    changed = 0
    unchanged = 0
    collisions = 0

    Spree::Product.unscoped.order(:id).find_each do |product|
      brand_id   = detail_brand[product.id]
      brand_slug = brand_slugs[brand_id] || 'labor'
      master_sku = product.master&.sku.to_s

      base = product_slug_for(brand_slug, product.name, master_sku)
      next if base.empty?

      new_slug = reserve_unique_slug(base, current_product_id: product.id)
      collisions += 1 if new_slug != base

      if product.slug == new_slug
        unchanged += 1
        next
      end

      # The existing friendly_id_slugs row already points at the OLD slug, so
      # visits to /<old-slug> keep resolving via FriendlyId history → 301 to
      # the new slug. We just need to update the canonical slug column and
      # add a history row for the NEW slug so it's also recognized.
      product.update_columns(slug: new_slug)
      default_locale = Spree::Store.default&.default_locale
      FriendlyId::Slug.create!(
        sluggable_type: 'Spree::Product',
        sluggable_id:   product.id,
        slug:           new_slug,
        scope:          nil,
        locale:         default_locale
      ) rescue nil
      changed += 1
    end

    elapsed = (Time.now - started).round(1)
    puts "[reslug] DONE in #{elapsed}s  changed=#{changed} unchanged=#{unchanged} collisions_resolved=#{collisions}"

    # Mirror the new default-locale slugs into the Mobility translations table
    # so /en|uz|uzc/product/<slug> keep resolving in all locales.
    Rake::Task['labor:catalog_locales'].invoke
  end

  # labor:catalog_rename — rewrite every product's display name to "Brand - Perfume".
  # Idempotent: re-runs strip the existing "Brand - " prefix before re-applying.
  desc 'Rewrite all Spree::Product names to "Brand - Perfume" format (idempotent)'
  task catalog_rename: :environment do
    started = Time.now
    detail_brand = Labor::ProductFragranceDetail.pluck(:spree_product_id, :labor_brand_id).to_h
    brand_rows   = Labor::Brand.pluck(:id, :name, :slug).to_h { |id, name, slug| [id, [name, slug]] }

    changed = 0
    unchanged = 0
    skipped = 0

    Spree::Product.unscoped.order(:id).find_each do |product|
      brand_id   = detail_brand[product.id]
      bname, bslug = brand_rows[brand_id] || [nil, nil]
      # Treat the synthetic "labor" fallback brand as no-brand: those products
      # had an empty `brand` cell in the CSV, so a "labor - ..." prefix would
      # be a fake brand. Leave the raw name untouched for these.
      brand_for_prefix = bslug.to_s == 'labor' ? '' : bname.to_s
      # Strip a stale "labor - " prefix left by an earlier rename pass before
      # we treated the fallback brand as no-brand. Safe no-op otherwise.
      cleaned_input = product.name.to_s.sub(/\Alabor\s*-\s*/i, '')
      new_name   = product_name_for(brand_for_prefix, cleaned_input)

      if new_name.to_s.strip.empty?
        skipped += 1
        next
      end

      if new_name == product.name
        unchanged += 1
        next
      end

      product.update_columns(name: new_name)
      changed += 1
    end

    elapsed = (Time.now - started).round(1)
    puts "[rename] DONE in #{elapsed}s  changed=#{changed} unchanged=#{unchanged} skipped=#{skipped}"

    # Propagate the new name/description into the Mobility translations table
    # so PDPs render the updated name across en/uz/uzc, not just ru.
    Rake::Task['labor:catalog_locales'].invoke
  end

  # labor:catalog_locales — backfill spree_product_translations and
  # friendly_id_slugs for every non-default locale (en/uz/uzc), copying
  # name/slug/description from the canonical spree_products columns.
  #
  # Why: Spree::Product uses Mobility's table backend; the storefront PDP
  # query joins spree_product_translations_<locale>. Without rows there,
  # /uz/product/<slug> and /en/product/<slug> return 404 even though the
  # default-locale lookup succeeds. This task is the safety net until we
  # have real per-locale translations from a translator.
  desc 'Backfill Mobility product translations + friendly_id_slugs for non-default locales (idempotent)'
  task catalog_locales: :environment do
    started = Time.now
    target_locales = %w[en uz uzc]

    conn = ActiveRecord::Base.connection
    now = Time.current

    inserted_trans = 0
    inserted_slugs = 0
    products_total = 0

    Spree::Product.unscoped.find_each do |product|
      products_total += 1
      target_locales.each do |loc|
        # UPSERT so subsequent reslug/rename runs propagate to other locales
        # instead of leaving stale rows that 404 or display old names.
        result = conn.execute(<<~SQL)
          INSERT INTO spree_product_translations
            (spree_product_id, locale, name, slug, description, created_at, updated_at)
          VALUES
            (#{product.id},
             #{conn.quote(loc)},
             #{conn.quote(product.name.to_s)},
             #{conn.quote(product.slug.to_s)},
             #{conn.quote(product.description.to_s)},
             #{conn.quote(now)},
             #{conn.quote(now)})
          ON CONFLICT (spree_product_id, locale) DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            description = EXCLUDED.description,
            updated_at = EXCLUDED.updated_at
          RETURNING (xmax = 0) AS inserted
        SQL
        inserted_trans += 1 if result.first && result.first['inserted']

        # Mirror friendly_id_slugs history into the locale, so old long URLs
        # keep resolving on /uz/product/<old-long-slug> as well.
        # WHERE NOT EXISTS guards idempotency at SQL level; the unique index
        # on (slug, sluggable_type, scope, locale) does NOT prevent duplicates
        # because scope is NULL and PG treats NULL = NULL as not equal.
        ru_slugs = conn.execute(<<~SQL).to_a
          SELECT slug FROM friendly_id_slugs
          WHERE sluggable_type='Spree::Product' AND sluggable_id=#{product.id.to_i} AND locale='ru'
        SQL
        ru_slugs.each do |row|
          slug_q = conn.quote(row['slug'])
          loc_q  = conn.quote(loc)
          ins = conn.execute(<<~SQL).to_a
            INSERT INTO friendly_id_slugs (slug, sluggable_id, sluggable_type, scope, locale, created_at)
            SELECT #{slug_q}, #{product.id.to_i}, 'Spree::Product', NULL, #{loc_q}, NOW()
            WHERE NOT EXISTS (
              SELECT 1 FROM friendly_id_slugs
              WHERE sluggable_type='Spree::Product' AND sluggable_id=#{product.id.to_i}
                AND slug=#{slug_q} AND locale=#{loc_q}
            )
            RETURNING id
          SQL
          inserted_slugs += 1 unless ins.empty?
        end
      end
    end

    elapsed = (Time.now - started).round(1)
    puts "[locales] DONE in #{elapsed}s products=#{products_total} translations_added=#{inserted_trans} history_rows_added=#{inserted_slugs}"
  end
end
