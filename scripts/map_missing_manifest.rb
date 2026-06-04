# frozen_string_literal: true

require 'json'
require 'set'

# Same exclusion regexes as the inventory pass
EXCLUDE_PATTERNS = [
  /Гель\s+для\s+душа/iu, /Крем\s+парфюмированный/iu, /Жидкое\s+крем\s*мыло/iu,
  /смесь\s+душистых\s+веществ/iu, /Diffuzor/i, /Диффузор/iu, /Body\s+Lotion/i,
  /SAVON/i, /Антисептик/iu, /Antiseptik/i, /Свеча|свеч[аи]|свечка/iu, /Svecha/i,
  /candle/i, /Флакон|флакон/iu, /Flakon/i, /Многоразов/iu, /Ароматическ/iu,
].freeze

def perfume?(product)
  EXCLUDE_PATTERNS.none? { |re| product.name.to_s.match?(re) }
end

def first_image_blob(product)
  image = product.images.first
  return unless image&.attachment&.attached?
  image.attachment.blob
end

manifest_path = Rails.root.join('db', 'data', 'product_image_manifest.json')
unless File.exist?(manifest_path)
  puts "Manifest not found at #{manifest_path}!"
  exit 1
end

manifest = JSON.parse(File.read(manifest_path))
puts "Loaded manifest with #{manifest.size} rows"

# Build mapping of product_id -> fragrantica_id and slug -> fragrantica_id
manifest_by_pid = manifest.index_by { |r| r['product_id'].to_i }
slug_to_fid = {}
name_to_fid = {}

manifest.each do |row|
  pid = row['product_id'].to_i
  p = Spree::Product.find_by(id: pid)
  if p
    slug_to_fid[p.slug] = row['fragrantica_id']
    name_to_fid[p.name.to_s.downcase.strip] = row['fragrantica_id']
  end
end

all_products = Spree::Product.all.to_a
perfumes = all_products.select { |p| perfume?(p) }

missing_img = perfumes.reject { |p| p.images.any? }
not_suitable = perfumes.select do |p|
  blob = first_image_blob(p)
  blob.nil? || Labor::CatalogImageQuality.call(blob)[:status] != 'suitable'
end

all_bad = (missing_img + not_suitable).uniq(&:id)
puts "Identified #{all_bad.size} products with missing or unsuitable images"

mapped_count = 0
already_in_manifest = 0
new_mappings = []
unmapped = []

# Helper to normalize a slug for parent matching
def get_parent_slug(slug)
  # Remove suffixes like -50-ml, -220-ml, -2, -3, etc.
  slug.sub(/-(50-ml|220-ml|\d+)\z/, '')
end

# Check if there are other detail files containing fragrantica_id
details_path = Rails.root.join('tmp', 'product_details.json')
details_map = {}
if File.exist?(details_path)
  begin
    details = JSON.parse(File.read(details_path))
    details.each do |r|
      if r['status'] == 'ok' && r['fragrantica_id'].present?
        details_map[r['slug']] = r['fragrantica_id']
      end
    end
    puts "Loaded #{details_map.size} mappings from #{details_path}"
  rescue => e
    puts "Could not load product_details.json: #{e.message}"
  end
end

all_bad.each do |product|
  # 1. Check if already in manifest
  if manifest_by_pid.key?(product.id)
    already_in_manifest += 1
    next
  end

  # 2. Try to map by parent slug or clone siblings
  parent_slug = get_parent_slug(product.slug)
  fid = slug_to_fid[parent_slug]

  # 3. Try to find any other sibling in the database that is mapped
  if fid.nil?
    sibling = Spree::Product.where('slug = ? OR slug LIKE ?', parent_slug, "#{parent_slug}-%").detect do |sib|
      slug_to_fid.key?(sib.slug)
    end
    fid = slug_to_fid[sibling.slug] if sibling
  end

  # 4. Try to find match in details_map
  if fid.nil?
    fid = details_map[product.slug] || details_map[parent_slug]
  end

  # 5. Try name-based matching
  if fid.nil?
    # Strip common suffixes/prefixes from product name
    clean_name = product.name.to_s.downcase
      .gsub(/(домашний|универсальный|авто|спрей)?\s*парфюм\s*/i, '')
      .gsub(/\s+\d+\s*(ml|мл)\b/i, '')
      .gsub(/№\d+/i, '')
      .strip

    fid = name_to_fid[clean_name]
    if fid.nil?
      # Try substring name match against manifest name keys
      matched_manifest_row = manifest.detect do |r|
        m_name = r['name'].to_s.downcase
        m_name.include?(clean_name) || clean_name.include?(m_name)
      end
      fid = matched_manifest_row['fragrantica_id'] if matched_manifest_row
    end
  end

  if fid.present?
    # Found a mapping! Let's add it to the manifest
    new_row = {
      'product_id' => product.id,
      'fragrantica_id' => fid.to_i,
      'name' => product.name
    }
    manifest << new_row
    new_mappings << { slug: product.slug, name: product.name, fragrantica_id: fid }
    mapped_count += 1
  else
    unmapped << { slug: product.slug, name: product.name }
  end
end

if mapped_count > 0
  # Write updated manifest back
  File.write(manifest_path, JSON.pretty_generate(manifest))
  puts "\nSUCCESS: Wrote #{mapped_count} new entries to product_image_manifest.json!"
  puts "New entries summary:"
  new_mappings.each do |m|
    puts "  + #{m[:slug]} -> #{m[:fragrantica_id]} (#{m[:name]})"
  end
else
  puts "\nNo new entries could be mapped automatically."
end

puts "\nStats:"
puts "  Already in manifest: #{already_in_manifest}"
puts "  Newly mapped:        #{mapped_count}"
puts "  Unmapped:            #{unmapped.size}"

if unmapped.any?
  puts "\nUnmapped products list (total #{unmapped.size}):"
  unmapped.each do |u|
    puts "  - #{u[:slug]} (#{u[:name]})"
  end
end
