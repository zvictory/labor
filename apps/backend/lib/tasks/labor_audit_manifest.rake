# Detects products with wrong images / wrong descriptions caused by a bad
# fragrantica_id in db/data/product_image_manifest.json.
#
# Strategy (deterministic, no network):
#   A fragrantica_id maps to exactly one Fragrantica perfume. When the same
#   fid appears on multiple products with *different brands*, at least one
#   mapping is wrong (the image and harvested description will be incorrect).
#
#   Intentional same-fid dupes DO exist (e.g. a product and its car-perfume
#   variant share a fid because they're based on the same scent). The
#   brand-mismatch check filters these out: the car-perfume variant is still
#   the same brand, just a different product type.
#
# Outputs:
#   /tmp/manifest_suspects.json   — machine-readable suspect list
#   stdout                        — human-readable Markdown report
#
# Usage:
#   docker exec labor-backend-1 bundle exec rake labor:audit_manifest

namespace :labor do
  desc 'Audit product_image_manifest.json for duplicate fragrantica_ids that indicate wrong images/descriptions'
  task audit_manifest: :environment do
    require 'json'
    require 'set'

    manifest_path = Rails.root.join('db', 'data', 'product_image_manifest.json')
    abort "manifest not found: #{manifest_path}" unless File.exist?(manifest_path)

    manifest = JSON.parse(File.read(manifest_path))
    abort 'manifest must be a JSON array' unless manifest.is_a?(Array)

    puts "Loaded #{manifest.size} manifest entries."

    # ── Group by fragrantica_id ──────────────────────────────────────────
    by_fid = Hash.new { |h, k| h[k] = [] }
    manifest.each { |row| by_fid[row['fragrantica_id']] << row }

    dup_groups = by_fid.select { |_fid, rows| rows.size > 1 }
    puts "Found #{dup_groups.size} fragrantica_ids used by more than one product."
    puts ''

    # ── Load product → brand from DB ────────────────────────────────────
    all_pids = manifest.map { |r| r['product_id'] }.compact.uniq
    products = Spree::Product.where(id: all_pids).index_by(&:id)

    # Brand name per product via FragranceDetail → Brand
    brand_names_by_pid = Labor::ProductFragranceDetail
      .where(spree_product_id: all_pids)
      .includes(:brand)
      .each_with_object({}) do |d, h|
        h[d.spree_product_id] = d.brand&.name.to_s.strip.downcase
      end

    # ── Classify each dup group ──────────────────────────────────────────
    # "Intentional same-brand dupe": all products in the group share a brand.
    #   e.g. "Light Blue D&G" + "Car Perfume Light Blue D&G"  → same brand → ok
    # "Suspect cross-brand dupe": brands differ across the group.
    #   e.g. "Erba Pura Xerjoff" + "Oakcha Sarang"  → DIFFERENT brands → wrong

    suspects = []
    same_brand_dupes = []

    dup_groups.each do |fid, rows|
      brands_in_group = rows.map { |r| brand_names_by_pid[r['product_id']] }.uniq.reject(&:empty?)

      # If we can't resolve brands (products missing brand link), flag as suspect
      resolved_brands = brands_in_group.compact.uniq
      if resolved_brands.size <= 1
        same_brand_dupes << { fid: fid, rows: rows, brands: resolved_brands }
      else
        suspects << {
          fid:    fid,
          brands: resolved_brands,
          rows:   rows.map { |r|
            p = products[r['product_id']]
            {
              product_id:   r['product_id'],
              manifest_name: r['name'],
              product_slug:  p&.slug,
              product_name:  p&.name,
              db_brand:      brand_names_by_pid[r['product_id']],
            }
          },
        }
      end
    end

    # Also flag products whose stored description brand doesn't match their DB brand
    # (catches wrong-fid cases that are unique in the manifest)
    desc_mismatches = []
    Spree::Product
      .joins(:translations)
      .where(spree_product_translations: { locale: 'en' })
      .where.not(spree_product_translations: { description: [nil, ''] })
      .select('spree_products.id, spree_products.slug, spree_product_translations.description')
      .each do |p|
        db_brand = brand_names_by_pid[p.id]
        next if db_brand.blank?

        desc_text = p.description.to_s.downcase
        # Description starts with "X by Brand" — extract the "Brand" after " by "
        if (m = desc_text.match(/^.{0,80} by ([a-z&' ]+?)(?:\s+is\s|\s+was\s|\.|\z)/i))
          desc_brand = m[1].strip.downcase
          # Mismatch: description refers to a brand that doesn't appear in the product's brand name
          # Allow partial matches (e.g. "tom ford" in "tom ford private blend")
          next if db_brand.include?(desc_brand) || desc_brand.include?(db_brand.split.first.to_s)

          desc_mismatches << {
            product_id:  p.id,
            slug:        p.slug,
            db_brand:    db_brand,
            desc_brand:  desc_brand,
            description_start: p.description.to_s.first(120),
          }
        end
      end

    # ── Write JSON output ────────────────────────────────────────────────
    output = {
      generated_at:         Time.now.utc.iso8601,
      manifest_total:       manifest.size,
      unique_fids:          by_fid.size,
      dup_fid_groups:       dup_groups.size,
      same_brand_dupe_fids: same_brand_dupes.size,
      cross_brand_suspects: suspects.size,
      desc_mismatch_count:  desc_mismatches.size,
      suspects:             suspects,
      desc_mismatches:      desc_mismatches,
    }
    File.write('/tmp/manifest_suspects.json', JSON.pretty_generate(output))

    # ── Print Markdown report ────────────────────────────────────────────
    puts '# Manifest Audit Report'
    puts ''
    puts "Generated: #{output[:generated_at]}"
    puts ''
    puts '## Stats'
    puts ''
    puts '| Metric | Count |'
    puts '|---|---:|'
    puts "| Total manifest entries | #{manifest.size} |"
    puts "| Unique fragrantica_ids | #{by_fid.size} |"
    puts "| fids used by >1 product | #{dup_groups.size} |"
    puts "| Same-brand dupes (intentional) | #{same_brand_dupes.size} |"
    puts "| **Cross-brand suspects (wrong image/desc)** | **#{suspects.size}** |"
    puts "| Description brand-mismatch (unique fid, wrong harvest) | #{desc_mismatches.size} |"
    puts ''

    if suspects.any?
      puts '## Cross-brand suspects'
      puts ''
      puts '> These products share a `fragrantica_id` with a product from a **different brand**.'
      puts '> At least one is showing the wrong image and description.'
      puts '> Fix: look up the correct `fragrantica_id` for each product and update the manifest.'
      puts ''
      puts '| fid | product_id | slug | db_brand | manifest_name |'
      puts '|---|---|---|---|---|'
      suspects.each do |s|
        s[:rows].each do |r|
          puts "| #{s[:fid]} | #{r[:product_id]} | `#{r[:product_slug]}` | #{r[:db_brand]} | #{r[:manifest_name]} |"
        end
        puts "| | | | | |"
      end
      puts ''
    else
      puts '## Cross-brand suspects'
      puts ''
      puts '_No cross-brand duplicates found._'
      puts ''
    end

    if desc_mismatches.any?
      puts '## Description brand mismatches (unique fids)'
      puts ''
      puts '> These products have a unique `fragrantica_id` but their harvested description'
      puts "> names a brand that doesn't match the product's own brand."
      puts '> Likely caused by a wrong ID in `get_fragrantica_ids.py`.'
      puts ''
      puts '| slug | db_brand | desc_brand | description start |'
      puts '|---|---|---|---|'
      desc_mismatches.each do |m|
        puts "| `#{m[:slug]}` | #{m[:db_brand]} | #{m[:desc_brand]} | #{m[:description_start].gsub('|', '\\|').first(80)} |"
      end
      puts ''
    end

    puts "JSON written to /tmp/manifest_suspects.json"
    puts "Suspects: #{suspects.size} cross-brand · #{desc_mismatches.size} desc-mismatch"
  end
end
