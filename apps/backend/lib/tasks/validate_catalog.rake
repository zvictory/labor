namespace :labor do
  namespace :catalog do
    desc "Audit database records for brand, notes, and perfumer associations"
    task validate: :environment do
      products = Spree::Product.available.to_a
      total_products = products.size

      fully_populated = 0
      missing_brand = 0
      missing_notes = 0
      missing_perfumer = 0
      orphans_detail = []

      products.each do |product|
        has_brand = product.labor_fragrance_detail&.labor_brand_id.present?
        has_notes = product.labor_product_notes.any?
        has_perfumer = product.labor_product_perfumers.any?

        if has_brand && has_notes && has_perfumer
          fully_populated += 1
        else
          missing_brand += 1 unless has_brand
          missing_notes += 1 unless has_notes
          missing_perfumer += 1 unless has_perfumer

          issues = []
          issues << "brand" unless has_brand
          issues << "notes" unless has_notes
          issues << "perfumer" unless has_perfumer
          orphans_detail << "Product ID #{product.id} (#{product.name}): missing #{issues.join(', ')}"
        end
      end

      puts "=================================================="
      puts " CATALOG VALIDATION REPORT"
      puts "=================================================="
      puts "Total Active Products scanned: #{total_products}"
      puts "Fully Populated Products:      #{fully_populated}"
      puts "Orphaned/Incomplete Products:  #{total_products - fully_populated}"
      puts "--------------------------------------------------"
      puts "Breakdown of deficiencies:"
      puts "  Missing Brand:    #{missing_brand}"
      puts "  Missing Notes:    #{missing_notes}"
      puts "  Missing Perfumer: #{missing_perfumer}"
      puts "=================================================="

      if orphans_detail.any?
        puts "\nFirst 20 orphaned products details:"
        puts orphans_detail.first(20).join("\n")
      end
    end
  end
end
