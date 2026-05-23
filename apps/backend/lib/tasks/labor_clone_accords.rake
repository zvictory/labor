namespace :labor do
  desc 'Copy notes and accords from a parent product to its clone/dupe listings (slug ending -2/-3, or "смесь душистых веществ NAME").'
  task clone_accords: :environment do
    # Pick clones: products with no accords AND no notes
    with_accords = Spree::Product.joins(:labor_product_accords).distinct.pluck(:id)
    with_notes = Spree::Product.joins(:labor_product_notes).distinct.pluck(:id)
    missing = Spree::Product.where.not(id: with_accords + with_notes).order(:id)

    resolved = 0
    skipped = 0

    missing.each do |child|
      parent = nil

      # Case A: slug ends with -2/-3/-4...
      if (m = child.slug.match(/\A(.+?)-(\d+)\z/))
        candidate_slug = m[1]
        parent = Spree::Product.friendly.find_by(slug: candidate_slug)
      end

      # Case B: name starts with "смесь душистых веществ X" (clone-oil listing)
      if parent.nil? && (m = child.name.match(/\Aсмесь\s+душистых\s+веществ\s+(.+)\z/i))
        clone_name = m[1].strip
        # exact name match, accord-bearing, prefer the one with the most accord-links
        parent = Spree::Product
          .joins(:labor_product_accords)
          .where('LOWER(spree_products.name) = ?', clone_name.downcase)
          .group('spree_products.id')
          .order('count(labor_product_accords.id) desc')
          .first
        # Fallback: case-insensitive substring match
        if parent.nil?
          parent = Spree::Product
            .joins(:labor_product_accords)
            .where('LOWER(spree_products.name) LIKE ?', "%#{clone_name.downcase}%")
            .first
        end
      end

      if parent.nil? || parent.id == child.id
        skipped += 1
        next
      end

      parent_accords = Labor::ProductAccord.where(spree_product_id: parent.id)
      parent_notes   = Labor::ProductNote.where(spree_product_id: parent.id)
      if parent_accords.empty? && parent_notes.empty?
        skipped += 1
        next
      end

      parent_accords.each do |pa|
        Labor::ProductAccord.find_or_create_by!(
          spree_product_id: child.id,
          labor_accord_id:  pa.labor_accord_id,
        ) { |row| row.weight = pa.weight }
      end
      parent_notes.each do |pn|
        Labor::ProductNote.find_or_create_by!(
          spree_product_id: child.id,
          labor_note_id:    pn.labor_note_id,
          pyramid_layer:    pn.pyramid_layer,
        )
      end
      resolved += 1
    end

    puts "Cloned data for #{resolved} products. Skipped #{skipped}."
  end
end
