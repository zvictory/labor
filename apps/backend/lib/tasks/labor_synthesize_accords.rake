namespace :labor do
  desc 'Synthesize Labor::ProductAccord rows from existing notes when Fragrantica accord data is unavailable. Idempotent: only fills products that have notes but zero accords.'
  task synthesize_accords: :environment do
    family_to_slug = {
      'citrus'   => 'citrus',
      'woody'    => 'woody',
      'floral'   => 'floral',
      'aromatic' => 'aromatic',
      'oriental' => 'amber',    # Fragrantica renamed "oriental" to "amber"
      'gourmand' => 'sweet',
      'green'    => 'green',
      'leather'  => 'leather',
      'smoky'    => 'smoky',
      'aquatic'  => 'aquatic',
      'chypre'   => 'mossy',
    }.freeze

    # Friendly display names for the synthesized accords (used when we create new
    # Labor::Accord rows because the slug didn't already exist).
    display_name_for = {
      'citrus'   => 'citrus',
      'woody'    => 'woody',
      'floral'   => 'floral',
      'aromatic' => 'aromatic',
      'amber'    => 'amber',
      'sweet'    => 'sweet',
      'green'    => 'green',
      'leather'  => 'leather',
      'smoky'    => 'smoky',
      'aquatic'  => 'aquatic',
      'mossy'    => 'mossy',
    }

    fallback_color = {
      'citrus'   => '#f9ff52',
      'woody'    => '#774414',
      'floral'   => '#ff5f8d',
      'aromatic' => '#37a089',
      'amber'    => '#bc4d10',
      'sweet'    => '#ee363b',
      'green'    => '#0e8c1d',
      'leather'  => '#78483a',
      'smoky'    => '#827487',
      'aquatic'  => '#63cce2',
      'mossy'    => '#5b6b32',
    }

    products_with_notes_only = Spree::Product
      .joins(:labor_product_notes)
      .where.not(id: Labor::ProductAccord.select(:spree_product_id))
      .distinct

    puts "Synthesizing accords for #{products_with_notes_only.count} products..."

    enriched = 0
    accord_links = 0

    products_with_notes_only.find_each do |product|
      family_counts = Labor::ProductNote
        .where(spree_product_id: product.id)
        .joins(:note)
        .where.not(labor_notes: { family: [nil, ''] })
        .group('labor_notes.family')
        .count

      next if family_counts.empty?

      max_count = family_counts.values.max.to_f
      ranked = family_counts.sort_by { |_, c| -c }.first(8)

      ranked.each do |family, count|
        slug = family_to_slug[family]
        next unless slug

        accord = Labor::Accord.find_or_initialize_by(slug: slug)
        if accord.new_record?
          accord[:name] = display_name_for[slug]
          accord.color_hex = fallback_color[slug] if accord.color_hex.blank?
          accord.save!
          Mobility.with_locale(:en) { accord.name = display_name_for[slug]; accord.save! }
        end

        weight = ((count / max_count) * 100).round.clamp(15, 100)
        Labor::ProductAccord.create!(
          spree_product_id: product.id,
          labor_accord_id:  accord.id,
          weight: weight,
        )
        accord_links += 1
      end
      enriched += 1
    end

    puts "Done. Synthesized accords for #{enriched} products. Created #{accord_links} ProductAccord links."
  end
end
