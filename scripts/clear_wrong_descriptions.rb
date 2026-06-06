# Clears EN descriptions for products confirmed to have wrong fragrantica_id.
#
# A product's description is "confirmed wrong" when the harvested text opens with
# "X by BrandY" and BrandY does not match the product's own brand in the DB.
# Showing the wrong description (e.g. "Sarang by Oakcha…" on a Xerjoff product page)
# actively misleads customers, so we null it out and flag for re-harvest.
#
# Safety:
#   - ONLY nulls EN descriptions, does NOT touch ru/uz.
#   - Does NOT delete images (no correct fid yet → image-less > wrong-image is debatable;
#     we keep the image and let a manual re-harvest replace it).
#   - Idempotent: safe to re-run.
#   - Skips "labor"-brand products (their descriptions may intentionally reference
#     the original scent they're "inspired by" — leave that to human review).
#
# Run via:
#   docker cp scripts/clear_wrong_descriptions.rb labor-backend-1:/tmp/clear_wrong_descriptions.rb
#   docker exec labor-backend-1 bundle exec rails runner /tmp/clear_wrong_descriptions.rb

WRONG_SLUGS = %w[
  erba-pura
  erba-pura-2
  hayati
  hayati-2
  ecstasy-collection
  ecstasy
  bleu-de
  aventus-man
  oud-for-greatness
  oud-for-greatness-initio-parfums-prives
  molecule-01
  molecule-02
  molecule-04
  molecule-05
  sedley
  megamare
  l-air-du-desert-marocain
  silver-mountain
  electric-cherry
  electric-cherry-2
  interlude-man
  n4-apres-l-amour
  on-the-beach-2
  love-don-t-by-shy
  narcotic-delight-initio-parfums-prives
  tobacco-oud
  lost-cherry-2
  lost-cherry-4
  lost-cherry-5
  bal-d-afrique
  tub-reuse-astrale
  mojave-ghost
  black-eyes
  aoud-roja-dove
  the-tragedy-of-lord-george
  another-13
  another-13-2
  blue-talisman
  oud-satin-mood-maison
  dear-polly
  ombre-nomade
  montabaco-verano
  smoke-cherry
  50
].freeze

cleared = 0
skipped_labor = 0
not_found = 0

WRONG_SLUGS.each do |slug|
  product = Spree::Product.find_by(slug: slug)
  unless product
    puts "NOT FOUND: #{slug}"
    not_found += 1
    next
  end

  brand_name = Labor::ProductFragranceDetail
    .where(spree_product_id: product.id)
    .includes(:brand)
    .first&.brand&.name.to_s.strip.downcase

  if brand_name == 'labor'
    puts "SKIP (labor brand): #{slug}"
    skipped_labor += 1
    next
  end

  Mobility.with_locale(:en) do
    current = product.description
    if current.present?
      old_preview = current.first(60).gsub("\n", ' ')
      # Mobility :table backend writes through dirty tracking — assigning nil +
      # save!(validate:false) deletes the translation row for this locale.
      product.description = nil
      product.save!(validate: false)
      puts "CLEARED: #{slug} (brand: #{brand_name}) | was: #{old_preview}..."
      cleared += 1
    else
      puts "ALREADY EMPTY: #{slug}"
    end
  end
end

puts "\n=== Summary ==="
puts "Cleared:       #{cleared}"
puts "Skipped labor: #{skipped_labor}"
puts "Not found:     #{not_found}"
puts "Total slugs:   #{WRONG_SLUGS.size}"
