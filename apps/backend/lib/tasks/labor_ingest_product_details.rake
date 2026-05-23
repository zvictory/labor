namespace :labor do
  desc 'Apply scripts/harvest_product_details.py JSON output: product descriptions (en) + main accord weights/colors.'
  task ingest_product_details: :environment do
    path = ENV['INPUT'] || Rails.root.join('tmp/product_details.json').to_s
    raise "missing #{path}" unless File.exist?(path)

    rows = JSON.parse(File.read(path))
    desc_updated = 0
    accord_links = 0
    accords_created = 0
    years_set = 0

    rows.each do |row|
      next unless row['status'] == 'ok'

      product = Spree::Product.friendly.find_by(slug: row['slug'])
      next unless product

      if row['description'].to_s.length >= 80
        Mobility.with_locale(:en) do
          product.description = row['description']
          product.save!
        end
        desc_updated += 1
      end

      year = row['year'].to_i
      if year.between?(1900, Date.current.year + 1)
        detail = Labor::ProductFragranceDetail.find_or_initialize_by(spree_product_id: product.id)
        if detail.release_year != year
          detail.release_year = year
          detail.save!
          years_set += 1
        end
      end

      accords = Array(row['accords']).reject { |a| a['name'].to_s.strip.empty? }
      next if accords.empty?

      Labor::ProductAccord.where(spree_product_id: product.id).delete_all
      accords.each do |a|
        name = a['name'].to_s.strip
        slug = name.parameterize
        accord = Labor::Accord.find_or_initialize_by(slug: slug)
        is_new = accord.new_record?
        accord.color_hex = a['color_hex'] if a['color_hex'].to_s.match?(/\A#?[0-9A-Fa-f]{6}\z/)
        accord[:name] = name if accord[:name].blank?  # base column (Mobility fallback)
        if is_new
          accord.save!
          Mobility.with_locale(:en) { accord.name = name; accord.save! }
          accords_created += 1
        else
          accord.save! if accord.changed?
        end
        weight = a['weight'].to_i
        weight = 1 if weight < 1
        Labor::ProductAccord.create!(
          spree_product_id: product.id,
          labor_accord_id:  accord.id,
          weight: weight,
        )
        accord_links += 1
      end
      puts "[ok] #{row['slug']} -> #{accords.size} accords"
    end

    puts "Updated #{desc_updated} descriptions, set #{years_set} release_years, created #{accords_created} accords, linked #{accord_links} product-accords"
  end
end
