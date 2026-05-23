namespace :labor do
  desc 'Second pass: clone parent accords/notes into shower-gel, body-lotion, diffuser and cream variants by name match.'
  task clone_accords_v2: :environment do
    with_accords = Spree::Product.joins(:labor_product_accords).distinct.pluck(:id)
    with_notes = Spree::Product.joins(:labor_product_notes).distinct.pluck(:id)
    missing = Spree::Product.where.not(id: with_accords + with_notes).order(:id)

    name_strippers = [
      /\AГель\s+для\s+душа\s+\(?парфюмированный\)?\s*/iu,
      /\AКрем\s+парфюмированный\s+/iu,
      /\AЖидкое\s+крем\s*мыло\s+/iu,
      /\Aсмесь\s+душистых\s+веществ\s+/iu,
      /\ADiffuzor\s+/iu, /\AДиффузор\s+/iu,
      /\ABody\s+Lotion\s+/i,
      /\ASAVON\s+krem\s+milo\s+/i,
    ]

    size_suffixes = [
      /\s*\d{2,4}\s*(гр|gr|g|мл|ml)\.?\s*\z/iu,
      /\s*\(\d+\s*(гр|gr|g|мл|ml)\)\s*\z/iu,
    ]

    def normalize(s)
      t = s.to_s.downcase
      t.gsub!(/[’'`]/u, "")
      t.gsub!(/[^[:alnum:][:space:]]/u, " ")
      t.squeeze(" ").strip
    end

    resolved = 0
    skipped = 0
    log = []

    # Build an index: normalized parent name → product id (only products that have accord data)
    name_index = {}
    Spree::Product
      .joins(:labor_product_accords)
      .distinct
      .find_each do |parent|
        key = normalize(parent.name)
        name_index[key] ||= parent.id
      end

    missing.each do |child|
      core_name = child.name.to_s
      name_strippers.each { |re| core_name = core_name.sub(re, "") }
      size_suffixes.each  { |re| core_name = core_name.sub(re, "") }
      core_name.strip!

      norm = normalize(core_name)
      next if norm.empty?

      parent_id = name_index[norm]

      if parent_id.nil?
        # Loose match: pick parent whose normalized name STARTS with the core
        # name (Russian gel "Aventus" should match parent "Aventus" or "Aventus EDP")
        match_key = name_index.keys.find { |k| k == norm || k.start_with?(norm + " ") || norm.start_with?(k + " ") }
        parent_id = name_index[match_key] if match_key
      end

      if parent_id.nil?
        skipped += 1
        next
      end

      parent_accords = Labor::ProductAccord.where(spree_product_id: parent_id)
      parent_notes   = Labor::ProductNote.where(spree_product_id: parent_id)

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
      log << "#{child.slug.ljust(40)} → parent_id=#{parent_id}"
    end

    puts log.first(40).join("\n")
    puts "..." if log.size > 40
    puts
    puts "Cloned data for #{resolved} products by name match. Skipped #{skipped}."
  end
end
