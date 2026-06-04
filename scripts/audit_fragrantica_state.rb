# Read-only Rails runner. Tabulates every fragrance-data slot per perfume +
# per brand and prints a Markdown summary. Also emits machine-readable JSON
# at /tmp/fragrantica_audit.json (inside the container).
#
# Usage:
#   docker cp scripts/audit_fragrantica_state.rb labor-backend-1:/tmp/audit_fragrantica_state.rb
#   docker exec labor-backend-1 bundle exec rails runner /tmp/audit_fragrantica_state.rb

require 'json'

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

# Human summary
pct = ->(n, d) { d.zero? ? '0.0%' : "#{((n.to_f / d) * 100).round(1)}%" }
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
puts "| image attached       | #{audit[:images][:perfumes_with_image]} | #{perfumes.size} | #{pct.call(audit[:images][:perfumes_with_image], perfumes.size)} |"
puts "| shop image suitable  | #{audit[:images][:suitable]} | #{perfumes.size} | #{pct.call(audit[:images][:suitable], perfumes.size)} |"
puts "| real Fragrantica row | #{audit[:harvested_real_count]} | #{perfumes.size} | #{pct.call(audit[:harvested_real_count], perfumes.size)} |"
puts "| notes pyramid        | #{perfumes.size - missing_notes.size} | #{perfumes.size} | #{pct.call(perfumes.size - missing_notes.size, perfumes.size)} |"
puts "| accords              | #{perfumes.size - missing_accord.size} | #{perfumes.size} | #{pct.call(perfumes.size - missing_accord.size, perfumes.size)} |"
puts "| release_year         | #{perfumes.size - missing_year.size} | #{perfumes.size} | #{pct.call(perfumes.size - missing_year.size, perfumes.size)} |"
puts "| brand FK             | #{perfumes.size - missing_brand.size} | #{perfumes.size} | #{pct.call(perfumes.size - missing_brand.size, perfumes.size)} |"
puts "| gender               | #{perfumes.size - missing_gender.size} | #{perfumes.size} | #{pct.call(perfumes.size - missing_gender.size, perfumes.size)} |"
puts "| concentration        | #{perfumes.size - missing_conc.size} | #{perfumes.size} | #{pct.call(perfumes.size - missing_conc.size, perfumes.size)} |"
puts "| avg_rating (>0)      | #{perfumes.size - missing_rating.size} | #{perfumes.size} | #{pct.call(perfumes.size - missing_rating.size, perfumes.size)} |"
puts ''
puts '## Brands'
puts ''
puts '| Brand slot | Filled | Total | % |'
puts '|---|---:|---:|---:|'
puts "| description (EN) | #{brand_total - brand_missing_desc.size}    | #{brand_total} | #{pct.call(brand_total - brand_missing_desc.size, brand_total)} |"
puts "| story (EN)       | #{brand_total - brand_missing_story.size}   | #{brand_total} | #{pct.call(brand_total - brand_missing_story.size, brand_total)} |"
puts "| country          | #{brand_total - brand_missing_country.size} | #{brand_total} | #{pct.call(brand_total - brand_missing_country.size, brand_total)} |"
puts "| founded_year     | #{brand_total - brand_missing_year.size}    | #{brand_total} | #{pct.call(brand_total - brand_missing_year.size, brand_total)} |"
puts ''
puts '## Accord colors'
puts ''
puts "Placeholder (#999999 / blank): #{accord_default} / #{accord_total}"
puts ''
puts 'JSON written to /tmp/fragrantica_audit.json'
