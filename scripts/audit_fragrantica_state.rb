# Read-only Rails runner. Tabulates every fragrance-data slot per perfume +
# per brand + per note + per perfumer, and writes:
#   /tmp/fragrantica_audit.json  — machine-readable summary (existing format)
#   /tmp/catalog_coverage.md    — full per-row checklist (new)
#
# After running, copy the checklist to the repo:
#   docker cp labor-backend-1:/tmp/catalog_coverage.md docs/catalog-coverage.md
#
# Usage:
#   docker cp scripts/audit_fragrantica_state.rb labor-backend-1:/tmp/audit_fragrantica_state.rb
#   docker exec labor-backend-1 bundle exec rails runner /tmp/audit_fragrantica_state.rb

require 'json'
require 'set'

# Same exclusion regexes as the inventory pass — keep in sync with
# scripts/build_harvest_targets.rb.
EXCLUDE_PATTERNS = [
  /Гель\s+для\s+душа/iu, /Крем\s+парфюмированный/iu, /Жидкое\s+крем\s*мыло/iu,
  /смесь\s+душистых\s+веществ/iu, /Diffuzor/i, /Диффузор/iu, /Body\s+Lotion/i,
  /SAVON/i, /Антисептик/iu, /Antiseptik/i, /Свеча|свеч[аи]|свечка/iu, /Svecha/i,
  /candle/i, /Флакон|флакон/iu, /Flakon/i, /Многоразов/iu, /Ароматическ/iu,
].freeze

# Seed slug list of perfumes that received real Fragrantica data in batch 1.
HARVESTED_REAL = %w[
  ebene-fume-2 tendre torino-22 bois-imperial pink-molecule-090 tygar-3
  fabulous tobacco-vanille-2 love-don-t-by-shy ombre-leather electric-cherry-2
  smoke-cherry lost-cherry-4 n4-apres-l-amour oud-wood-2 limmensite attar-musc-kashmir
].freeze

def perfume?(product)
  EXCLUDE_PATTERNS.none? { |re| product.name.to_s.match?(re) }
end

def harvested_real?(product, real_slugs)
  return true if real_slugs.include?(product.slug)
  parent = product.slug.sub(/-\d+\z/, '')
  real_slugs.any? { |s| s == parent || s.start_with?("#{parent}-") }
end

all_products = Spree::Product.all.to_a
perfumes     = all_products.select { |p| perfume?(p) }
non_perfume  = all_products - perfumes

real_set = HARVESTED_REAL.to_set
synthesized = perfumes.reject { |p| harvested_real?(p, real_set) }

# Per-perfume completeness
details_by_pid = Labor::ProductFragranceDetail.where(spree_product_id: perfumes.map(&:id)).index_by(&:spree_product_id)
note_pids      = Labor::ProductNote.where(spree_product_id: perfumes.map(&:id)).distinct.pluck(:spree_product_id).to_set
accord_pids    = Labor::ProductAccord.where(spree_product_id: perfumes.map(&:id)).distinct.pluck(:spree_product_id).to_set

missing_notes  = perfumes.reject { |p| note_pids.include?(p.id) }
missing_accord = perfumes.reject { |p| accord_pids.include?(p.id) }
missing_year   = perfumes.reject { |p| (d = details_by_pid[p.id]) && d.release_year.present? }
missing_brand  = perfumes.reject { |p| (d = details_by_pid[p.id]) && d.labor_brand_id.present? }
missing_gender = perfumes.reject { |p| (d = details_by_pid[p.id]) && d.gender.present? }
missing_conc   = perfumes.reject { |p| (d = details_by_pid[p.id]) && d.concentration.present? }
missing_rating = perfumes.reject { |p| (d = details_by_pid[p.id]) && d.avg_rating.to_f.positive? }
missing_img    = perfumes.reject { |p| p.images.any? }

brand_by_id = Labor::Brand
              .where(id: details_by_pid.values.filter_map(&:labor_brand_id).uniq)
              .index_by(&:id)

def first_image_blob(product)
  image = product.images.first
  return unless image&.attachment&.attached?

  image.attachment.blob
end

def image_blob_url(blob)
  return nil unless blob

  Rails.application.routes.url_helpers.rails_blob_url(
    blob,
    host: ENV.fetch('PUBLIC_HOST', 'http://localhost:4000')
  )
rescue StandardError
  nil
end

image_quality_items = perfumes.map do |product|
  detail = details_by_pid[product.id]
  blob = first_image_blob(product)
  {
    slug: product.slug,
    name: product.name,
    brand_hint: brand_by_id[detail&.labor_brand_id]&.name.to_s,
    current_image: image_blob_url(blob),
    image_quality: Labor::CatalogImageQuality.call(blob),
  }
end
image_quality_counts = image_quality_items
                       .group_by { |item| item[:image_quality][:status] }
                       .transform_values(&:size)
not_suitable_images = image_quality_items.reject { |item| item[:image_quality][:status] == 'suitable' }

# Brand completeness
brand_total = Labor::Brand.count
brands = Labor::Brand.all.to_a
brand_missing_desc = brands.reject { |b| Mobility.with_locale(:en) { b.description.to_s.strip.present? } }
brand_missing_story = brands.reject { |b| Mobility.with_locale(:en) { b.story.to_s.strip.present? rescue false } }
brand_missing_country = brands.reject { |b| b.country.to_s.strip.present? }
brand_missing_year = brands.reject { |b| b.founded_year.to_i.positive? }

# Accord color status
accord_total   = Labor::Accord.count
accord_default = Labor::Accord.where(color_hex: ['#999999', '#999', nil, '']).count

audit = {
  generated_at: Time.now.utc.iso8601,
  totals: {
    products:    all_products.size,
    perfumes:    perfumes.size,
    non_perfume: non_perfume.size,
    brands:      brand_total,
    accords:     accord_total,
    notes:       Labor::Note.count,
    perfumers:   Labor::Perfumer.count,
  },
  images: {
    perfumes_with_image:    perfumes.size - missing_img.size,
    perfumes_without_image: missing_img.size,
    suitable:               image_quality_counts.fetch('suitable', 0),
    not_suitable:           image_quality_counts.fetch('not_suitable', 0),
  },
  image_quality: {
    target: Labor::CatalogImageQuality::TARGET,
    counts: {
      suitable:     image_quality_counts.fetch('suitable', 0),
      not_suitable: image_quality_counts.fetch('not_suitable', 0),
      missing:      image_quality_counts.fetch('missing', 0),
    },
    items: image_quality_items,
  },
  harvested_real_count: perfumes.count { |p| harvested_real?(p, real_set) },
  synthesized_count:    synthesized.size,
  per_field_gaps: {
    missing_notes:        missing_notes.map(&:slug),
    missing_accords:      missing_accord.map(&:slug),
    missing_year:         missing_year.map(&:slug),
    missing_brand_link:   missing_brand.map(&:slug),
    missing_gender:       missing_gender.size,
    missing_concentration: missing_conc.size,
    missing_avg_rating:   missing_rating.size,
    missing_image:        missing_img.map(&:slug),
    not_suitable_image:   not_suitable_images.map { |item| item[:slug] },
  },
  accords: {
    total:              accord_total,
    placeholder_color:  accord_default,
  },
  brands: {
    total:                brand_total,
    missing_description:  brand_missing_desc.map(&:slug),
    missing_story:        brand_missing_story.map(&:slug),
    missing_country:      brand_missing_country.map(&:slug),
    missing_founded_year: brand_missing_year.map(&:slug),
  },
  synthesized_slugs: synthesized.map(&:slug),
}

File.write('/tmp/fragrantica_audit.json', JSON.pretty_generate(audit))

# ======================================================================
# Extended: per-locale translation coverage (direct SQL, no fallbacks)
# ======================================================================

# Product descriptions per locale
prod_locale_sets = Hash.new { |h, k| h[k] = Set.new }
ActiveRecord::Base.connection.execute(
  "SELECT spree_product_id, locale FROM spree_product_translations " \
  "WHERE description IS NOT NULL AND description != '' AND locale IN ('en','ru','uz')"
).each { |r| prod_locale_sets[r['spree_product_id']] << r['locale'] }

prod_desc_en = perfumes.select { |p| prod_locale_sets[p.id].include?('en') }
prod_desc_ru = perfumes.select { |p| prod_locale_sets[p.id].include?('ru') }
prod_desc_uz = perfumes.select { |p| prod_locale_sets[p.id].include?('uz') }
missing_desc_en = perfumes.reject { |p| prod_locale_sets[p.id].include?('en') }

# Note translations
note_locale_data = Hash.new { |h, k| h[k] = {} }
ActiveRecord::Base.connection.execute(
  "SELECT labor_note_id, locale, name, description FROM labor_note_translations " \
  "WHERE locale IN ('en','ru','uz')"
).each do |r|
  note_locale_data[r['labor_note_id']][r['locale']] = {
    name: r['name'].to_s.strip.present?,
    desc: r['description'].to_s.strip.present?,
  }
end

all_notes = Labor::Note.order(:name).to_a
note_rows = all_notes.map do |n|
  t = note_locale_data[n.id]
  {
    id: n.id, slug: n.slug, name: n.name,
    icon:    n.icon_url.to_s.strip.present?,
    name_en: t['en']&.fetch(:name, false) || false,
    name_ru: t['ru']&.fetch(:name, false) || false,
    name_uz: t['uz']&.fetch(:name, false) || false,
    desc_en: t['en']&.fetch(:desc, false) || false,
  }
end

# Perfumer translations
perf_locale_data = Hash.new { |h, k| h[k] = {} }
ActiveRecord::Base.connection.execute(
  "SELECT labor_perfumer_id, locale, bio FROM labor_perfumer_translations " \
  "WHERE locale IN ('en','ru','uz')"
).each { |r| perf_locale_data[r['labor_perfumer_id']][r['locale']] = r['bio'].to_s.strip.present? }

all_perfumers = Labor::Perfumer.order(:name).to_a
perf_rows = all_perfumers.map do |pf|
  t = perf_locale_data[pf.id]
  { id: pf.id, slug: pf.slug, name: pf.name,
    bio_en: t['en'] || false, bio_ru: t['ru'] || false, bio_uz: t['uz'] || false }
end

# Brand translations
brand_locale_data = Hash.new { |h, k| h[k] = {} }
ActiveRecord::Base.connection.execute(
  "SELECT labor_brand_id, locale, description, story FROM labor_brand_translations " \
  "WHERE locale IN ('en','ru','uz')"
).each do |r|
  brand_locale_data[r['labor_brand_id']][r['locale']] = {
    desc:  r['description'].to_s.strip.present?,
    story: r['story'].to_s.strip.present?,
  }
end

brand_rows = brands.map do |b|
  t = brand_locale_data[b.id]
  { id: b.id, slug: b.slug, name: b.name,
    country:     b.country.to_s.strip.present?,
    founded_year: b.founded_year.to_i.positive?,
    desc_en:  t['en']&.fetch(:desc, false) || false,
    desc_ru:  t['ru']&.fetch(:desc, false) || false,
    desc_uz:  t['uz']&.fetch(:desc, false) || false,
    story_en: t['en']&.fetch(:story, false) || false,
    story_ru: t['ru']&.fetch(:story, false) || false,
  }
end

# Size variant check
size_ot = Spree::OptionType.find_by(name: 'size')
size_pids = size_ot ? Spree::ProductOptionType.where(option_type_id: size_ot.id).pluck(:product_id).to_set : Set.new

# ======================================================================
# Write catalog-coverage.md
# ======================================================================

pct  = ->(n, d) { d.zero? ? '0%' : "#{((n.to_f / d) * 100).round(1)}%" }
tick = ->(v) { v ? '✓' : '—' }
n_perf = perfumes.size
n_notes = all_notes.size
n_perfs = all_perfumers.size
n_brands = brands.size

md = []
md << '# Catalog Coverage Report'
md << ''
md << "> Generated: #{Time.now.utc.strftime('%Y-%m-%d %H:%M UTC')}. " \
      'Auto-generated by `scripts/audit_fragrantica_state.rb` — do not edit by hand.'
md << ''

md << '## Summary'
md << ''
md << '| Entity | Total | Key gaps |'
md << '|---|---:|---|'
md << "| Perfumes | #{n_perf} | " \
      "#{missing_img.size} missing image · #{missing_desc_en.size} missing EN desc · " \
      "#{prod_desc_ru.size == 0 ? 'all' : n_perf - prod_desc_ru.size} missing ru desc · " \
      "#{size_pids.size}/#{n_perf} have size variants |"
md << "| Notes | #{n_notes} | " \
      "#{note_rows.count { |r| !r[:icon] }} missing icon · " \
      "#{note_rows.count { |r| !r[:name_ru] }} missing ru name |"
md << "| Perfumers | #{n_perfs} | " \
      "#{perf_rows.count { |r| !r[:bio_en] }} missing EN bio (all have no translations) |"
md << "| Brands | #{n_brands} | " \
      "#{brand_rows.count { |r| !r[:desc_en] }} missing EN desc · " \
      "#{brand_rows.count { |r| !r[:desc_ru] }} missing ru desc · " \
      "#{brand_rows.count { |r| !r[:desc_uz] }} missing uz desc |"
md << ''
md << '---'
md << ''

# ── Products ──────────────────────────────────────────────────────────
md << '## Products (perfumes only)'
md << ''
md << '### Field coverage'
md << ''
md << '| Field | Filled | Total | % |'
md << '|---|---:|---:|---:|'
md << "| image attached | #{n_perf - missing_img.size} | #{n_perf} | #{pct.call(n_perf - missing_img.size, n_perf)} |"
md << "| image suitable (≥750×1000) | #{audit[:images][:suitable]} | #{n_perf} | #{pct.call(audit[:images][:suitable], n_perf)} |"
md << "| description (en) | #{prod_desc_en.size} | #{n_perf} | #{pct.call(prod_desc_en.size, n_perf)} |"
md << "| description (ru) | #{prod_desc_ru.size} | #{n_perf} | #{pct.call(prod_desc_ru.size, n_perf)} |"
md << "| description (uz) | #{prod_desc_uz.size} | #{n_perf} | #{pct.call(prod_desc_uz.size, n_perf)} |"
md << "| notes pyramid | #{n_perf - missing_notes.size} | #{n_perf} | #{pct.call(n_perf - missing_notes.size, n_perf)} |"
md << "| accords | #{n_perf - missing_accord.size} | #{n_perf} | #{pct.call(n_perf - missing_accord.size, n_perf)} |"
md << "| release year | #{n_perf - missing_year.size} | #{n_perf} | #{pct.call(n_perf - missing_year.size, n_perf)} |"
md << "| brand link | #{n_perf - missing_brand.size} | #{n_perf} | #{pct.call(n_perf - missing_brand.size, n_perf)} |"
md << "| size variants (10/20/30) | #{size_pids.size} | #{n_perf} | #{pct.call(size_pids.size, n_perf)} |"
md << ''

md << '### Missing image'
md << ''
md << "#{missing_img.size} products have no image attached:"
md << ''
if missing_img.any?
  md << '| slug | name |'
  md << '|---|---|'
  missing_img.sort_by(&:slug).each { |p| md << "| `#{p.slug}` | #{p.name} |" }
else
  md << '_All products have images._'
end
md << ''

md << '### Missing description (EN)'
md << ''
md << "#{missing_desc_en.size} products have no English description:"
md << ''
if missing_desc_en.any?
  md << '| slug | name |'
  md << '|---|---|'
  missing_desc_en.sort_by(&:slug).each { |p| md << "| `#{p.slug}` | #{p.name} |" }
else
  md << '_All products have an English description._'
end
md << ''
md << '---'
md << ''

# ── Notes ─────────────────────────────────────────────────────────────
md << "## Notes (#{n_notes} total)"
md << ''
md << '### Coverage'
md << ''
md << '| Field | Filled | Total | % |'
md << '|---|---:|---:|---:|'
md << "| icon_url | #{note_rows.count { |r| r[:icon] }} | #{n_notes} | #{pct.call(note_rows.count { |r| r[:icon] }, n_notes)} |"
md << "| name (en) | #{note_rows.count { |r| r[:name_en] }} | #{n_notes} | #{pct.call(note_rows.count { |r| r[:name_en] }, n_notes)} |"
md << "| name (ru) | #{note_rows.count { |r| r[:name_ru] }} | #{n_notes} | #{pct.call(note_rows.count { |r| r[:name_ru] }, n_notes)} |"
md << "| name (uz) | #{note_rows.count { |r| r[:name_uz] }} | #{n_notes} | #{pct.call(note_rows.count { |r| r[:name_uz] }, n_notes)} |"
md << "| description (en) | #{note_rows.count { |r| r[:desc_en] }} | #{n_notes} | #{pct.call(note_rows.count { |r| r[:desc_en] }, n_notes)} |"
md << ''
md << '### Per-note detail'
md << ''
md << '| slug | icon | en name | ru name | uz name | en desc |'
md << '|---|:---:|:---:|:---:|:---:|:---:|'
note_rows.each { |r| md << "| #{r[:slug]} | #{tick.call(r[:icon])} | #{tick.call(r[:name_en])} | #{tick.call(r[:name_ru])} | #{tick.call(r[:name_uz])} | #{tick.call(r[:desc_en])} |" }
md << ''
md << '---'
md << ''

# ── Perfumers ──────────────────────────────────────────────────────────
md << "## Perfumers (#{n_perfs} total)"
md << ''
md << '> Note: perfumers have no photo/image column in the schema.'
md << ''
md << '| name | slug | bio (en) | bio (ru) | bio (uz) |'
md << '|---|---|:---:|:---:|:---:|'
perf_rows.each { |r| md << "| #{r[:name]} | #{r[:slug]} | #{tick.call(r[:bio_en])} | #{tick.call(r[:bio_ru])} | #{tick.call(r[:bio_uz])} |" }
md << ''
md << '---'
md << ''

# ── Brands ────────────────────────────────────────────────────────────
md << "## Brands (#{n_brands} total)"
md << ''
md << '> Note: brands have no logo/image column in the schema.'
md << ''
md << '### Coverage'
md << ''
md << '| Field | Filled | Total | % |'
md << '|---|---:|---:|---:|'
md << "| country | #{brand_rows.count { |r| r[:country] }} | #{n_brands} | #{pct.call(brand_rows.count { |r| r[:country] }, n_brands)} |"
md << "| founded year | #{brand_rows.count { |r| r[:founded_year] }} | #{n_brands} | #{pct.call(brand_rows.count { |r| r[:founded_year] }, n_brands)} |"
md << "| description (en) | #{brand_rows.count { |r| r[:desc_en] }} | #{n_brands} | #{pct.call(brand_rows.count { |r| r[:desc_en] }, n_brands)} |"
md << "| description (ru) | #{brand_rows.count { |r| r[:desc_ru] }} | #{n_brands} | #{pct.call(brand_rows.count { |r| r[:desc_ru] }, n_brands)} |"
md << "| description (uz) | #{brand_rows.count { |r| r[:desc_uz] }} | #{n_brands} | #{pct.call(brand_rows.count { |r| r[:desc_uz] }, n_brands)} |"
md << "| story (en) | #{brand_rows.count { |r| r[:story_en] }} | #{n_brands} | #{pct.call(brand_rows.count { |r| r[:story_en] }, n_brands)} |"
md << "| story (ru) | #{brand_rows.count { |r| r[:story_ru] }} | #{n_brands} | #{pct.call(brand_rows.count { |r| r[:story_ru] }, n_brands)} |"
md << ''
md << '### Per-brand detail'
md << ''
md << '| slug | country | year | en desc | ru desc | uz desc | en story | ru story |'
md << '|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|'
brand_rows.sort_by { |r| r[:slug] }.each do |r|
  md << "| #{r[:slug]} | #{tick.call(r[:country])} | #{tick.call(r[:founded_year])} | #{tick.call(r[:desc_en])} | #{tick.call(r[:desc_ru])} | #{tick.call(r[:desc_uz])} | #{tick.call(r[:story_en])} | #{tick.call(r[:story_ru])} |"
end

File.write('/tmp/catalog_coverage.md', md.join("\n") + "\n")
puts "\ncatalog-coverage.md written to /tmp/catalog_coverage.md"

# ======================================================================
# Original human summary (unchanged)
# ======================================================================

pct2 = ->(n, d) { d.zero? ? '0.0%' : "#{((n.to_f / d) * 100).round(1)}%" }
puts ''
puts '# Fragrantica audit'
puts ''
puts "Generated: #{audit[:generated_at]}"
puts ''
puts '## Totals'
puts ''
puts '| Bucket | Count |'
puts '|---|---:|'
audit[:totals].each { |k, v| puts "| #{k} | #{v} |" }
puts ''
puts '## Coverage'
puts ''
puts '| Slot | Filled | Total | % |'
puts '|---|---:|---:|---:|'
puts "| image attached       | #{audit[:images][:perfumes_with_image]} | #{perfumes.size} | #{pct2.call(audit[:images][:perfumes_with_image], perfumes.size)} |"
puts "| shop image suitable  | #{audit[:images][:suitable]} | #{perfumes.size} | #{pct2.call(audit[:images][:suitable], perfumes.size)} |"
puts "| real Fragrantica row | #{audit[:harvested_real_count]} | #{perfumes.size} | #{pct2.call(audit[:harvested_real_count], perfumes.size)} |"
puts "| notes pyramid        | #{perfumes.size - missing_notes.size} | #{perfumes.size} | #{pct2.call(perfumes.size - missing_notes.size, perfumes.size)} |"
puts "| accords              | #{perfumes.size - missing_accord.size} | #{perfumes.size} | #{pct2.call(perfumes.size - missing_accord.size, perfumes.size)} |"
puts "| release_year         | #{perfumes.size - missing_year.size} | #{perfumes.size} | #{pct2.call(perfumes.size - missing_year.size, perfumes.size)} |"
puts "| brand FK             | #{perfumes.size - missing_brand.size} | #{perfumes.size} | #{pct2.call(perfumes.size - missing_brand.size, perfumes.size)} |"
puts "| gender               | #{perfumes.size - missing_gender.size} | #{perfumes.size} | #{pct2.call(perfumes.size - missing_gender.size, perfumes.size)} |"
puts "| concentration        | #{perfumes.size - missing_conc.size} | #{perfumes.size} | #{pct2.call(perfumes.size - missing_conc.size, perfumes.size)} |"
puts "| avg_rating (>0)      | #{perfumes.size - missing_rating.size} | #{perfumes.size} | #{pct2.call(perfumes.size - missing_rating.size, perfumes.size)} |"
puts ''
puts '## Brands'
puts ''
puts '| Brand slot | Filled | Total | % |'
puts '|---|---:|---:|---:|'
puts "| description (EN) | #{brand_total - brand_missing_desc.size}    | #{brand_total} | #{pct2.call(brand_total - brand_missing_desc.size, brand_total)} |"
puts "| story (EN)       | #{brand_total - brand_missing_story.size}   | #{brand_total} | #{pct2.call(brand_total - brand_missing_story.size, brand_total)} |"
puts "| country          | #{brand_total - brand_missing_country.size} | #{brand_total} | #{pct2.call(brand_total - brand_missing_country.size, brand_total)} |"
puts "| founded_year     | #{brand_total - brand_missing_year.size}    | #{brand_total} | #{pct2.call(brand_total - brand_missing_year.size, brand_total)} |"
puts ''
puts '## Accord colors'
puts ''
puts "Placeholder (#999999 / blank): #{accord_default} / #{accord_total}"
puts ''
puts 'JSON written to /tmp/fragrantica_audit.json'
