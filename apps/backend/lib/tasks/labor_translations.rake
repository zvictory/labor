# Catalog i18n tooling: export English Mobility values → translate → import ru/uz.
#
# Workflow:
#   1. rake labor:translations:export  → /tmp/catalog_strings_en.json
#   2. Run the LLM translation workflow (scripts/translate_catalog.js or Claude workflow)
#      Input:  /tmp/catalog_strings_en.json
#      Output: /tmp/catalog_strings_translated.json
#   3. rake labor:translations:import  → writes ru + uz via Mobility
#
# JSON key shape: { model, id, field, en, ru, uz }
# model values:  product | brand | perfumer | note | accord
#
# Usage:
#   docker cp apps/backend/lib/tasks/labor_translations.rake \
#             labor-backend-1:/app/lib/tasks/labor_translations.rake
#   docker exec labor-backend-1 bundle exec rake labor:translations:export
#   # … run LLM translation …
#   docker exec labor-backend-1 bundle exec rake labor:translations:import

namespace :labor do
  namespace :translations do

    # ─── Export ────────────────────────────────────────────────────────────────
    desc 'Export all EN Mobility strings that still need ru or uz translations'
    task export: :environment do
      require 'json'

      rows = []

      # ── Products — description ──────────────────────────────────────────
      puts 'Exporting product descriptions…'
      # Direct SQL is faster and bypasses fallbacks so we see the real locale state.
      have_ru = ActiveRecord::Base.connection.execute(
        "SELECT spree_product_id FROM spree_product_translations " \
        "WHERE locale='ru' AND description IS NOT NULL AND description != ''"
      ).map { |r| r['spree_product_id'] }.to_set

      have_uz = ActiveRecord::Base.connection.execute(
        "SELECT spree_product_id FROM spree_product_translations " \
        "WHERE locale='uz' AND description IS NOT NULL AND description != ''"
      ).map { |r| r['spree_product_id'] }.to_set

      ActiveRecord::Base.connection.execute(
        "SELECT spree_product_id, description FROM spree_product_translations " \
        "WHERE locale='en' AND description IS NOT NULL AND description != ''"
      ).each do |r|
        pid = r['spree_product_id']
        next if have_ru.include?(pid) && have_uz.include?(pid)

        rows << {
          model:       'product',
          id:          pid,
          field:       'description',
          en:          r['description'],
          needs_ru:    !have_ru.include?(pid),
          needs_uz:    !have_uz.include?(pid),
        }
      end
      puts "  #{rows.count} products need translation."

      product_count = rows.count

      # ── Brands — description + story ───────────────────────────────────
      puts 'Exporting brand fields…'
      %w[description story].each do |field|
        # Mobility :table: translation table is labor_brand_translations
        have_ru_b = ActiveRecord::Base.connection.execute(
          "SELECT labor_brand_id FROM labor_brand_translations " \
          "WHERE locale='ru' AND #{field} IS NOT NULL AND #{field} != ''"
        ).map { |r| r['labor_brand_id'] }.to_set

        have_uz_b = ActiveRecord::Base.connection.execute(
          "SELECT labor_brand_id FROM labor_brand_translations " \
          "WHERE locale='uz' AND #{field} IS NOT NULL AND #{field} != ''"
        ).map { |r| r['labor_brand_id'] }.to_set

        ActiveRecord::Base.connection.execute(
          "SELECT labor_brand_id, #{field} FROM labor_brand_translations " \
          "WHERE locale='en' AND #{field} IS NOT NULL AND #{field} != ''"
        ).each do |r|
          bid = r['labor_brand_id']
          next if have_ru_b.include?(bid) && have_uz_b.include?(bid)

          rows << {
            model:    'brand',
            id:       bid,
            field:    field,
            en:       r[field],
            needs_ru: !have_ru_b.include?(bid),
            needs_uz: !have_uz_b.include?(bid),
          }
        end
      end
      puts "  #{rows.count - product_count} brand strings need translation."

      brand_count = rows.count

      # ── Perfumers — bio ─────────────────────────────────────────────────
      puts 'Exporting perfumer bios…'
      have_ru_p = ActiveRecord::Base.connection.execute(
        "SELECT labor_perfumer_id FROM labor_perfumer_translations " \
        "WHERE locale='ru' AND bio IS NOT NULL AND bio != ''"
      ).map { |r| r['labor_perfumer_id'] }.to_set

      have_uz_p = ActiveRecord::Base.connection.execute(
        "SELECT labor_perfumer_id FROM labor_perfumer_translations " \
        "WHERE locale='uz' AND bio IS NOT NULL AND bio != ''"
      ).map { |r| r['labor_perfumer_id'] }.to_set

      ActiveRecord::Base.connection.execute(
        "SELECT labor_perfumer_id, bio FROM labor_perfumer_translations " \
        "WHERE locale='en' AND bio IS NOT NULL AND bio != ''"
      ).each do |r|
        pid = r['labor_perfumer_id']
        next if have_ru_p.include?(pid) && have_uz_p.include?(pid)

        rows << {
          model:    'perfumer',
          id:       pid,
          field:    'bio',
          en:       r['bio'],
          needs_ru: !have_ru_p.include?(pid),
          needs_uz: !have_uz_p.include?(pid),
        }
      end
      puts "  #{rows.count - brand_count} perfumer bios need translation."

      perf_count = rows.count

      # ── Notes — name + description ──────────────────────────────────────
      puts 'Exporting note strings…'
      %w[name description].each do |field|
        have_ru_n = ActiveRecord::Base.connection.execute(
          "SELECT labor_note_id FROM labor_note_translations " \
          "WHERE locale='ru' AND #{field} IS NOT NULL AND #{field} != ''"
        ).map { |r| r['labor_note_id'] }.to_set

        have_uz_n = ActiveRecord::Base.connection.execute(
          "SELECT labor_note_id FROM labor_note_translations " \
          "WHERE locale='uz' AND #{field} IS NOT NULL AND #{field} != ''"
        ).map { |r| r['labor_note_id'] }.to_set

        ActiveRecord::Base.connection.execute(
          "SELECT labor_note_id, #{field} FROM labor_note_translations " \
          "WHERE locale='en' AND #{field} IS NOT NULL AND #{field} != ''"
        ).each do |r|
          nid = r['labor_note_id']
          next if have_ru_n.include?(nid) && have_uz_n.include?(nid)

          rows << {
            model:    'note',
            id:       nid,
            field:    field,
            en:       r[field],
            needs_ru: !have_ru_n.include?(nid),
            needs_uz: !have_uz_n.include?(nid),
          }
        end
      end
      puts "  #{rows.count - perf_count} note strings need translation."

      note_count = rows.count

      # ── Accords — name ──────────────────────────────────────────────────
      puts 'Exporting accord names…'
      have_ru_a = ActiveRecord::Base.connection.execute(
        "SELECT labor_accord_id FROM labor_accord_translations " \
        "WHERE locale='ru' AND name IS NOT NULL AND name != ''"
      ).map { |r| r['labor_accord_id'] }.to_set

      have_uz_a = ActiveRecord::Base.connection.execute(
        "SELECT labor_accord_id FROM labor_accord_translations " \
        "WHERE locale='uz' AND name IS NOT NULL AND name != ''"
      ).map { |r| r['labor_accord_id'] }.to_set

      ActiveRecord::Base.connection.execute(
        "SELECT labor_accord_id, name FROM labor_accord_translations " \
        "WHERE locale='en' AND name IS NOT NULL AND name != ''"
      ).each do |r|
        aid = r['labor_accord_id']
        next if have_ru_a.include?(aid) && have_uz_a.include?(aid)

        rows << {
          model:    'accord',
          id:       aid,
          field:    'name',
          en:       r['name'],
          needs_ru: !have_ru_a.include?(aid),
          needs_uz: !have_uz_a.include?(aid),
        }
      end
      puts "  #{rows.count - note_count} accord names need translation."

      out_path = '/tmp/catalog_strings_en.json'
      File.write(out_path, JSON.pretty_generate(rows))
      puts "\nTotal: #{rows.size} strings written to #{out_path}"
    end

    # ─── Import ────────────────────────────────────────────────────────────────
    desc 'Import translated catalog strings from /tmp/catalog_strings_translated.json'
    task import: :environment do
      require 'json'

      in_path = '/tmp/catalog_strings_translated.json'
      abort "Translated file not found: #{in_path}" unless File.exist?(in_path)

      rows = JSON.parse(File.read(in_path))
      puts "Loading #{rows.size} translated rows…"

      written = Hash.new(0)
      errors  = []

      rows.each do |row|
        model_key = row['model']
        id        = row['id'].to_i
        field     = row['field']
        ru_val    = row['ru'].to_s.strip
        uz_val    = row['uz'].to_s.strip

        record = case model_key
                 when 'product'   then Spree::Product.find_by(id: id)
                 when 'brand'     then Labor::Brand.find_by(id: id)
                 when 'perfumer'  then Labor::Perfumer.find_by(id: id)
                 when 'note'      then Labor::Note.find_by(id: id)
                 when 'accord'    then Labor::Accord.find_by(id: id)
                 else nil
                 end

        unless record
          errors << "#{model_key}##{id}: not found"
          next
        end

        { ru: ru_val, uz: uz_val }.each do |locale, value|
          next if value.blank?

          Mobility.with_locale(locale) do
            record.public_send(:"#{field}=", value)
            record.save!(validate: false)
          end
          written[locale] += 1
        rescue => e
          errors << "#{model_key}##{id}.#{field}[#{locale}]: #{e.message}"
        end
      end

      puts "\n=== Import complete ==="
      puts "Written ru: #{written[:ru]}"
      puts "Written uz: #{written[:uz]}"
      puts "Errors:     #{errors.size}"
      errors.each { |e| puts "  ERROR: #{e}" }
    end

    desc 'Show translation coverage stats (no DB writes)'
    task stats: :environment do
      puts '=== Translation coverage ==='
      {
        'product.description' => ['spree_product_translations', 'spree_product_id', 'description'],
        'brand.description'   => ['labor_brand_translations',   'labor_brand_id',   'description'],
        'brand.story'         => ['labor_brand_translations',   'labor_brand_id',   'story'],
        'perfumer.bio'        => ['labor_perfumer_translations', 'labor_perfumer_id','bio'],
        'note.name'           => ['labor_note_translations',     'labor_note_id',    'name'],
        'accord.name'         => ['labor_accord_translations',   'labor_accord_id',  'name'],
      }.each do |label, (table, fk, field)|
        counts = {}
        %w[en ru uz].each do |locale|
          counts[locale] = ActiveRecord::Base.connection.execute(
            "SELECT COUNT(DISTINCT #{fk}) FROM #{table} " \
            "WHERE locale='#{locale}' AND #{field} IS NOT NULL AND #{field} != ''"
          ).first.values.first.to_i
        end
        total = ActiveRecord::Base.connection.execute(
          "SELECT COUNT(DISTINCT #{fk}) FROM #{table}"
        ).first.values.first.to_i
        puts "#{label.ljust(25)} | en=#{counts['en'].to_s.rjust(3)}/#{total} | ru=#{counts['ru'].to_s.rjust(3)}/#{total} | uz=#{counts['uz'].to_s.rjust(3)}/#{total}"
      end
    end

  end
end
