# apps/backend/db/patch_catalog.rb

# 1. Get or create fallback entities
house_perfumer = Labor::Perfumer.find_or_create_by!(slug: "house-perfumer") do |p|
  p.name = "In-House Team"
  p.country = "France"
  p.bio = "Default fallback master perfumer for the house."
end

linear_accord = Labor::Note.find_or_create_by!(slug: "linear-accord") do |n|
  n.name = "Linear Accord"
  n.family = "aromatic"
end

rose_note = Labor::Note.find_by(slug: "rose")
sandalwood_note = Labor::Note.find_by(slug: "sandalwood")
lemon_note = Labor::Note.find_by(slug: "lemon")

# 2. Iterate and patch products
products = Spree::Product.available
total_scanned = products.count
patched_notes = 0
patched_perfumers = 0

products.find_each do |product|
  # Check notes
  if product.labor_product_notes.empty?
    name = product.name.to_s.downcase

    selected_note = nil
    if name.include?("rose") && rose_note
      selected_note = rose_note
    elsif (name.include?("santal") || name.include?("sandal")) && sandalwood_note
      selected_note = sandalwood_note
    elsif (name.include?("lemon") || name.include?("citrus") || name.include?("limon")) && lemon_note
      selected_note = lemon_note
    else
      selected_note = linear_accord
    end

    if selected_note
      Labor::ProductNote.create!(
        spree_product_id: product.id,
        labor_note_id: selected_note.id,
        pyramid_layer: "heart"
      )
      patched_notes += 1
    end
  end

  # Check perfumers
  if product.labor_product_perfumers.empty?
    Labor::ProductPerfumer.create!(spree_product_id: product.id, labor_perfumer_id: house_perfumer.id)
    patched_perfumers += 1
  end
end

puts "=================================================="
puts " CATALOG PATCH COMPLETED"
puts "=================================================="
puts "Scanned Products:         #{total_scanned}"
puts "Patched missing notes:    #{patched_notes}"
puts "Patched missing perfumer: #{patched_perfumers}"
puts "=================================================="
