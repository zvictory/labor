# Fix Fragrantica legal-disclaimer descriptions that were accidentally harvested and
# (via labor:translations:import) translated into all three locales.
#
# Workflow:
#   1. rake labor:fix_disclaimers:export  → /tmp/disclaimer_fix_source.json
#      (fragrance data for the 10 affected products — no DB writes)
#   2. Run the LLM generation workflow (scripts/ or Workflow tool) to produce
#      /tmp/disclaimer_fix_translated.json  { id, en, ru, uz }
#   3. rake labor:fix_disclaimers:import  → writes en/ru/uz via Mobility
#
# Detection: any product whose description (in ANY of the three locale storage
# locations) contains the literal string "Fragrantica".  This survives translation —
# the ru/uz disclaimers were machine-translated but still contain "Fragrantica".
#
# Storage routing (Mobility :table, default locale = ru):
#   ru  → spree_products.description     (Mobility fallthrough to main table)
#   en  → spree_product_translations  locale='en'
#   uz  → spree_product_translations  locale='uz'
#
# Usage:
#   docker cp apps/backend/lib/tasks/labor_fix_disclaimers.rake \
#             labor-backend-1:/app/lib/tasks/labor_fix_disclaimers.rake
#   docker exec labor-backend-1 bundle exec rake labor:fix_disclaimers:export
#   # run LLM generation → /tmp/disclaimer_fix_translated.json
#   docker exec labor-backend-1 bundle exec rake labor:fix_disclaimers:import

namespace :labor do
  namespace :fix_disclaimers do

    DISCLAIMER_FRAGMENT = 'Fragrantica'.freeze

    # Returns the set of product ids whose description is disclaimer-polluted in
    # any locale.  Deterministic — no hardcoded ids.
    def disclaimer_product_ids
      ru_ids = ActiveRecord::Base.connection.execute(
        "SELECT id FROM spree_products " \
        "WHERE description ILIKE '%#{DISCLAIMER_FRAGMENT}%'"
      ).map { |r| r['id'] }.to_set

      tr_ids = ActiveRecord::Base.connection.execute(
        "SELECT DISTINCT spree_product_id FROM spree_product_translations " \
        "WHERE description ILIKE '%#{DISCLAIMER_FRAGMENT}%'"
      ).map { |r| r['spree_product_id'] }.to_set

      ru_ids | tr_ids
    end

    # ─── Export ──────────────────────────────────────────────────────────────
    desc 'Export fragrance data for disclaimer-polluted products → /tmp/disclaimer_fix_source.json'
    task export: :environment do
      require 'json'

      ids = disclaimer_product_ids
      abort 'No disclaimer-polluted products found — nothing to do.' if ids.empty?
      puts "Detected #{ids.size} disclaimer-polluted product(s): #{ids.sort.inspect}"

      rows = []

      Spree::Product.where(id: ids.sort).includes(
        :labor_fragrance_detail,
        labor_product_notes: :note,
        labor_product_accords: :accord,
        labor_fragrance_detail: :brand
      ).each do |product|
        detail = product.labor_fragrance_detail

        # Notes grouped by pyramid layer; reuse the same query order as product_serializer.rb
        notes_by_layer = Hash.new { |h, k| h[k] = [] }
        Labor::ProductNote
          .where(spree_product_id: product.id)
          .includes(:note)
          .order(:pyramid_layer, :position)
          .each do |pn|
            # Use English note name for the LLM prompt (source locale for generation)
            name = Mobility.with_locale(:en) { pn.note.name.to_s.presence } ||
                   pn.note.name.to_s
            notes_by_layer[pn.pyramid_layer.to_s] << name unless name.blank?
          end

        # Accords by weight desc (same as product_serializer.rb)
        accords = Labor::ProductAccord
          .where(spree_product_id: product.id)
          .includes(:accord)
          .order(weight: :desc)
          .map do |pa|
            Mobility.with_locale(:en) { pa.accord.name.to_s.presence } ||
              pa.accord.name.to_s
          end
          .reject(&:blank?)

        # English product name for generation prompt
        name_en = Mobility.with_locale(:en) { product.name.to_s.presence } || product.name.to_s
        brand_en = Mobility.with_locale(:en) { detail&.brand&.name.to_s.presence } ||
                   detail&.brand&.name.to_s || ''

        rows << {
          id:            product.id,
          slug:          product.slug,
          name:          name_en,
          brand:         brand_en,
          gender:        detail&.gender.to_s,
          concentration: detail&.concentration.to_s,
          notes:         notes_by_layer,
          accords:       accords,
        }
      end

      out_path = '/tmp/disclaimer_fix_source.json'
      File.write(out_path, JSON.pretty_generate(rows))
      puts "Written #{rows.size} product(s) to #{out_path}"
    end

    # ─── Import ──────────────────────────────────────────────────────────────
    desc 'Import LLM-generated descriptions from /tmp/disclaimer_fix_translated.json'
    task import: :environment do
      require 'json'

      in_path = '/tmp/disclaimer_fix_translated.json'
      abort "Translated file not found: #{in_path}" unless File.exist?(in_path)

      rows = JSON.parse(File.read(in_path))
      puts "Loading #{rows.size} generated row(s)…"

      written = 0
      errors  = []

      rows.each do |row|
        id = row['id'].to_i
        product = Spree::Product.find_by(id: id)
        unless product
          errors << "product##{id}: not found"
          next
        end

        { 'en' => row['en'], 'ru' => row['ru'], 'uz' => row['uz'] }.each do |locale, value|
          value = value.to_s.strip
          next if value.blank?

          # Defense-in-depth: never write a disclaimer even if the LLM somehow echoed one
          if value.downcase.include?('fragrantica')
            errors << "product##{id}[#{locale}]: generated text still contains 'Fragrantica' — skipped"
            next
          end

          Mobility.with_locale(locale.to_sym) do
            product.description = value
            product.save!(validate: false)
          end
          written += 1
        rescue => e
          errors << "product##{id}[#{locale}]: #{e.message}"
        end
      end

      puts "\n=== Import complete ==="
      puts "Written: #{written}"
      puts "Errors:  #{errors.size}"
      errors.each { |e| puts "  ERROR: #{e}" }
    end

    # ─── Verify ──────────────────────────────────────────────────────────────
    desc 'Verify no disclaimer descriptions remain (read-only)'
    task verify: :environment do
      ru_count = ActiveRecord::Base.connection.execute(
        "SELECT COUNT(*) FROM spree_products WHERE description ILIKE '%#{DISCLAIMER_FRAGMENT}%'"
      ).first.values.first.to_i

      tr_count = ActiveRecord::Base.connection.execute(
        "SELECT COUNT(*) FROM spree_product_translations " \
        "WHERE description ILIKE '%#{DISCLAIMER_FRAGMENT}%'"
      ).first.values.first.to_i

      if ru_count.zero? && tr_count.zero?
        puts "✓ No Fragrantica disclaimer descriptions found — clean."
      else
        puts "✗ Disclaimer still present: spree_products=#{ru_count} spree_product_translations=#{tr_count}"
        exit 1
      end
    end

  end
end
