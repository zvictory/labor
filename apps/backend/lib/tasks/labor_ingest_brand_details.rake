require 'json'

namespace :labor do
  desc 'Ingest brand harvest JSON (HARVEST_FILE=/tmp/brand_harvest.json). Updates description, story, country, founded_year, website per brand slug.'
  task ingest_brand_details: :environment do
    path = ENV['HARVEST_FILE'] || '/tmp/brand_harvest.json'
    rows = JSON.parse(File.read(path))

    stats = { brands_updated: 0, skipped: 0, missing: [] }

    ActiveRecord::Base.transaction do
      rows.each do |row|
        if row['not_found']
          stats[:skipped] += 1
          next
        end

        brand = Labor::Brand.find_by(slug: row['slug'])
        unless brand
          stats[:missing] << row['slug']
          stats[:skipped] += 1
          next
        end

        brand.country      = row['country']           if row['country'].to_s.strip.present?
        brand.founded_year = row['founded_year'].to_i if row['founded_year'].to_i.positive?
        brand.website      = row['website']           if row['website'].to_s.strip.present?
        brand.logo_url     = row['logo_url']           if row['logo_url'].to_s.match?(%r{\Ahttps?://})
        brand.save!

        Mobility.with_locale(:en) do
          brand.description = row['description'] if row['description'].to_s.strip.present?
          brand.story       = row['story']       if row['story'].to_s.strip.present?
          brand.save!
        end

        stats[:brands_updated] += 1
      end
    end

    puts "Updated: #{stats[:brands_updated]} brands. Skipped: #{stats[:skipped]}."
    puts "Missing slugs: #{stats[:missing].inspect}" if stats[:missing].any?
  end
end
