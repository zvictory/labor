# Reads /tmp/fragrantica_audit.json (produced by audit_fragrantica_state.rb)
# and emits batch files of harvest targets for Claude for Chrome.
#
# Outputs:
#   /tmp/harvest_batch_A.jsonl ... /tmp/harvest_batch_I.jsonl  (50 perfumes each)
#   /tmp/harvest_brands.jsonl                                  (one line per brand)
#   /tmp/harvest_image_updates.jsonl                           (bad/missing shop images)
#
# Each perfume line:
#   {"slug": "...", "name": "...", "brand_hint": "...",
#    "search_url": "https://www.fragrantica.com/search/?searchString=..."}
#
# Each brand line:
#   {"slug": "...", "name": "...",
#    "search_url": "https://www.fragrantica.com/designers.html"}

require 'json'
require 'uri'

BATCH_SIZE = 50
LABELS = %w[A B C D E F G H I J K L].freeze
AUDIT_PATH = '/tmp/fragrantica_audit.json'
IMAGE_UPDATE_INSTRUCTION = 'Find/update product image suitable for Labor shop: 3:4, minimum 600×800, preferred 750×1000, centered bottle, no text overlay.'.freeze

audit = JSON.parse(File.read(AUDIT_PATH))
synthesized_slugs = audit['synthesized_slugs']

# Pull one product per primary slug (drop clone siblings — the ingest task
# already propagates the harvest to siblings via sibling_products).
primary_slugs = synthesized_slugs.reject { |s| s.match?(/-\d+\z/) }

# Some primaries may have been deleted but their clones remain — fall back
# to including clones whose parent slug isn't in primary_slugs.
parent_seen = primary_slugs.to_set
clone_orphans = synthesized_slugs.select do |s|
  next false unless s.match?(/-\d+\z/)
  !parent_seen.include?(s.sub(/-\d+\z/, ''))
end

target_slugs = (primary_slugs + clone_orphans).uniq

products = Spree::Product.where(slug: target_slugs).includes(:labor_fragrance_detail).to_a
brand_by_pid = {}
products.each do |p|
  d = p.labor_fragrance_detail
  brand_by_pid[p.id] = d&.brand&.name.to_s
end

rows = products.map do |p|
  brand_hint = brand_by_pid[p.id]
  query = [brand_hint, p.name].reject { |s| s.to_s.strip.empty? }.join(' ')
  search_url = "https://www.fragrantica.com/search/?searchString=#{URI.encode_www_form_component(query)}"
  { slug: p.slug, name: p.name, brand_hint: brand_hint, search_url: search_url }
end

# Order by brand then name so each batch tends to share a brand context —
# helps Claude for Chrome stay on the same designer hub between perfumes.
rows.sort_by! { |r| [r[:brand_hint].to_s.downcase, r[:name].to_s.downcase] }

rows.each_slice(BATCH_SIZE).with_index do |slice, idx|
  label = LABELS[idx] || idx.to_s
  path  = "/tmp/harvest_batch_#{label}.jsonl"
  File.open(path, 'w') do |io|
    slice.each { |r| io.puts(JSON.generate(r)) }
  end
  puts "Wrote #{path} (#{slice.size} targets)"
end

# Brand pass — every brand with at least one perfume missing description/story/country/year
brand_slugs = (audit.dig('brands', 'missing_description') +
               audit.dig('brands', 'missing_story') +
               audit.dig('brands', 'missing_country') +
               audit.dig('brands', 'missing_founded_year')).uniq

brand_rows = Labor::Brand.where(slug: brand_slugs).order(:slug).map do |b|
  {
    slug: b.slug,
    name: b.name,
    search_url: "https://www.fragrantica.com/search/?searchString=#{URI.encode_www_form_component(b.name)}",
  }
end

File.open('/tmp/harvest_brands.jsonl', 'w') do |io|
  brand_rows.each { |r| io.puts(JSON.generate(r)) }
end
puts "Wrote /tmp/harvest_brands.jsonl (#{brand_rows.size} brands)"

image_rows = audit.dig('image_quality', 'items').to_a
                  .reject { |item| item.dig('image_quality', 'status') == 'suitable' }
                  .map do |item|
  query = [item['brand_hint'], item['name']].reject { |s| s.to_s.strip.empty? }.join(' ')
  {
    slug: item['slug'],
    name: item['name'],
    brand_hint: item['brand_hint'],
    current_image: item['current_image'],
    image_quality: item['image_quality'],
    search_url: "https://www.fragrantica.com/search/?searchString=#{URI.encode_www_form_component(query)}",
    instruction: IMAGE_UPDATE_INSTRUCTION,
  }
end

File.open('/tmp/harvest_image_updates.jsonl', 'w') do |io|
  image_rows.each { |r| io.puts(JSON.generate(r)) }
end
puts "Wrote /tmp/harvest_image_updates.jsonl (#{image_rows.size} products)"

puts ''
puts "Total perfume targets: #{rows.size}"
puts "Total brand targets:   #{brand_rows.size}"
puts "Image update targets:  #{image_rows.size}"
puts "Batches:               #{(rows.size.to_f / BATCH_SIZE).ceil}"
