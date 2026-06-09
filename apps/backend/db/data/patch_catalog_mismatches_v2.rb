# frozen_string_literal: true

# apps/backend/db/data/patch_catalog_mismatches_v2.rb
# Run inside the container using rails runner.

ActiveRecord::Base.transaction do
  # 1. Setup target brands
  thomas_kosmala = Labor::Brand.find_by(slug: 'thomas-kosmala')
  tom_ford = Labor::Brand.find_by(slug: 'tom-ford-perfume-a-fragrance') || Labor::Brand.find_by(slug: 'tom-ford')

  # Helper to resolve / create accords
  def fetch_accord(raw_name)
    slug = raw_name.to_s.downcase.gsub(/\s+/, '-').gsub(/[^a-z0-9-]/, '')
    display = slug.tr('-', ' ')
    record = Labor::Accord.find_or_initialize_by(slug: slug)
    if record.new_record?
      record.name = display
      record.color_hex = '#999999'
      record.save!
    end
    Mobility.with_locale(:en) { record.name = display; record.save! }
    record
  end

  # Helper to resolve / create notes
  def fetch_note(raw_name)
    slug = raw_name.to_s.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/\A-+|-+\z/, '')
    record = Labor::Note.find_or_initialize_by(slug: slug)
    if record.new_record?
      record.name = raw_name.to_s
      record.save!
    end
    Mobility.with_locale(:en) { record.name = raw_name.to_s; record.save! }
    record
  end

  # Helper to resolve / create perfumers
  def fetch_perfumer(raw_name)
    name = raw_name.to_s.strip
    return nil if name.empty?
    slug = name.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/\A-+|-+\z/, '')
    Labor::Perfumer.find_or_create_by!(slug: slug) { |p| p.name = name }
  end

  # --- Fix Product 1525 (N4 Apres l'Amour) ---
  p1525 = Spree::Product.find_by(id: 1525)
  if p1525
    puts "Patching Product 1525: #{p1525.name}"
    p1525.master.images.destroy_all
    p1525.labor_product_notes.destroy_all
    p1525.labor_product_accords.destroy_all
    p1525.labor_product_perfumers.destroy_all

    detail = Labor::ProductFragranceDetail.find_or_initialize_by(spree_product_id: p1525.id)
    detail.release_year = 2018
    detail.labor_brand_id = thomas_kosmala.id if thomas_kosmala
    detail.gender = 'unisex'
    detail.concentration = 'edp'
    detail.save!

    # Accords
    accords = [
      { name: 'musky', weight: 100 },
      { name: 'amber', weight: 90 },
      { name: 'woody', weight: 85 }
    ]
    accords.each do |a|
      acc = fetch_accord(a[:name])
      Labor::ProductAccord.create!(spree_product_id: p1525.id, labor_accord_id: acc.id, weight: a[:weight])
    end

    # Notes
    notes = {
      top: ['Lemon Zest', 'Bitter Orange Blossom'],
      heart: ['Aromatic Spices'],
      base: ['Musk', 'Amber', 'Woody Notes']
    }
    %w[top heart base].each do |layer|
      Array(notes[layer.to_sym]).each_with_index do |note_name, idx|
        n = fetch_note(note_name)
        Labor::ProductNote.create!(spree_product_id: p1525.id, labor_note_id: n.id, pyramid_layer: layer, position: idx)
      end
    end

    # Perfumers
    perf = fetch_perfumer('Thomas Kosmala')
    if perf
      Labor::ProductPerfumer.create!(spree_product_id: p1525.id, labor_perfumer_id: perf.id)
    end

    # Descriptions
    desc_en = "No. 4 Apres l'Amour by Thomas Kosmala is a Woody Aromatic fragrance for women and men. No. 4 Apres l'Amour was launched in 2018. The nose behind this fragrance is Thomas Kosmala. Top notes are Lemon Zest and Bitter Orange Blossom; middle note is Aromatic Spices; base notes are Musk, Amber and Woody Notes."
    desc_ru = "No. 4 Apres l'Amour Thomas Kosmala — это аромат для мужчин и женщин, он принадлежит к группе древесные фужерные. No. 4 Apres l'Amour выпущен в 2018 году. Парфюмер: Thomas Kosmala. Верхние ноты: Цедра лимона и Цветы горького апельсина; средняя нота: Специи; базовые ноты: Мускус, Амбра и Древесные ноты."
    Mobility.with_locale(:en) { p1525.description = desc_en; p1525.save! }
    Mobility.with_locale(:ru) { p1525.description = desc_ru; p1525.save! }
  end

  # --- Fix Product 1294 (Lost Cherry) ---
  p1294 = Spree::Product.find_by(id: 1294)
  if p1294
    puts "Patching Product 1294: #{p1294.name}"
    p1294.master.images.destroy_all
    p1294.labor_product_notes.destroy_all
    p1294.labor_product_accords.destroy_all
    p1294.labor_product_perfumers.destroy_all

    detail = Labor::ProductFragranceDetail.find_or_initialize_by(spree_product_id: p1294.id)
    detail.release_year = 2018
    detail.labor_brand_id = tom_ford.id if tom_ford
    detail.gender = 'unisex'
    detail.concentration = 'edp'
    detail.save!

    # Accords
    accords = [
      { name: 'cherry', weight: 100 },
      { name: 'sweet', weight: 92 },
      { name: 'almond', weight: 85 },
      { name: 'nutty', weight: 76 },
      { name: 'fruity', weight: 72 },
      { name: 'vanilla', weight: 64 },
      { name: 'warm spicy', weight: 58 },
      { name: 'amber', weight: 55 }
    ]
    accords.each do |a|
      acc = fetch_accord(a[:name])
      Labor::ProductAccord.create!(spree_product_id: p1294.id, labor_accord_id: acc.id, weight: a[:weight])
    end

    # Notes
    notes = {
      top: ['Bitter Almond', 'Black Cherry', 'Cherry Liqueur'],
      heart: ['Sour Cherry', 'Plum', 'Turkish Rose', 'Jasmine Sambac'],
      base: ['Vanilla', 'Tonka Bean', 'Cinnamon', 'Peru Balsam', 'Sandalwood', 'Benzoin', 'Cloves', 'Cedar', 'Patchouli', 'Vetiver']
    }
    %w[top heart base].each do |layer|
      Array(notes[layer.to_sym]).each_with_index do |note_name, idx|
        n = fetch_note(note_name)
        Labor::ProductNote.create!(spree_product_id: p1294.id, labor_note_id: n.id, pyramid_layer: layer, position: idx)
      end
    end

    # Perfumers
    perf = fetch_perfumer('Louise Turner')
    if perf
      Labor::ProductPerfumer.create!(spree_product_id: p1294.id, labor_perfumer_id: perf.id)
    end

    # Descriptions
    desc_en = "Lost Cherry by Tom Ford is a Amber Floral fragrance for women and men. Lost Cherry was launched in 2018. The nose behind this fragrance is Louise Turner. Top notes are Bitter Almond, Black Cherry and Cherry Liqueur; middle notes are Sour Cherry, Plum, Turkish Rose and Jasmine Sambac; base notes are Vanilla, Tonka Bean, Cinnamon, Peru Balsam, Sandalwood, Benzoin, Cloves, Cedar, Patchouli and Vetiver."
    desc_ru = "Lost Cherry Tom Ford — это аромат для мужчин и женщин, он принадлежит к группе восточные цветочные. Lost Cherry выпущен в 2018 году. Парфюмер: Louise Turner. Верхние ноты: Горький миндаль, Черная вишня и Вишневый ликер; средние ноты: Кислая вишня, Слива, Турецкая роза и Жасмин самбак; базовые ноты: Ваниль, Бобы тонка, Корица, Перуанский бальзам, Сандал, Бензоин, Гвоздика (пряность), Кедр, Пачули и Ветивер."
    Mobility.with_locale(:en) { p1294.description = desc_en; p1294.save! }
    Mobility.with_locale(:ru) { p1294.description = desc_ru; p1294.save! }
  end

  # --- Fix Product 1454 (lost-cherry-3) ---
  p1454 = Spree::Product.find_by(id: 1454)
  if p1454
    puts "Patching Product 1454: #{p1454.name}"
    p1454.master.images.destroy_all
    p1454.labor_product_notes.destroy_all
    p1454.labor_product_accords.destroy_all
    p1454.labor_product_perfumers.destroy_all

    detail = Labor::ProductFragranceDetail.find_or_initialize_by(spree_product_id: p1454.id)
    detail.release_year = 2018
    detail.labor_brand_id = tom_ford.id if tom_ford
    detail.gender = 'unisex'
    detail.concentration = 'edp'
    detail.save!

    # Accords
    accords = [
      { name: 'cherry', weight: 100 },
      { name: 'sweet', weight: 92 },
      { name: 'almond', weight: 85 }
    ]
    accords.each do |a|
      acc = fetch_accord(a[:name])
      Labor::ProductAccord.create!(spree_product_id: p1454.id, labor_accord_id: acc.id, weight: a[:weight])
    end

    # Notes
    notes = {
      top: ['Bitter Almond', 'Black Cherry', 'Cherry Liqueur'],
      heart: ['Sour Cherry'],
      base: ['Vanilla']
    }
    %w[top heart base].each do |layer|
      Array(notes[layer.to_sym]).each_with_index do |note_name, idx|
        n = fetch_note(note_name)
        Labor::ProductNote.create!(spree_product_id: p1454.id, labor_note_id: n.id, pyramid_layer: layer, position: idx)
      end
    end

    Mobility.with_locale(:en) { p1454.description = nil; p1454.save! }
    Mobility.with_locale(:ru) { p1454.description = nil; p1454.save! }
  end

  # --- Clear descriptions for 1128 (MUSCAVILLA) and 1471 (120) ---
  [1128, 1471].each do |pid|
    product = Spree::Product.find_by(id: pid)
    next unless product
    puts "Clearing descriptions for Product #{pid}: #{product.name}"
    Mobility.with_locale(:en) { product.description = nil; product.save! }
    Mobility.with_locale(:ru) { product.description = nil; product.save! }
  end

  puts "DONE REPAIRING REMAINING MISMATCHES."
end
