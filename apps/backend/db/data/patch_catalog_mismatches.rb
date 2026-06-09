# frozen_string_literal: true

# apps/backend/db/data/patch_catalog_mismatches.rb
# Run inside the container using rails runner.

ActiveRecord::Base.transaction do
  # 1. Setup target brands
  calvin_klein = Labor::Brand.find_or_create_by!(slug: 'calvin-klein') do |b|
    b.name = 'Calvin Klein'
    b.country = 'USA'
    b.niche = false
  end

  sospiro = Labor::Brand.find_or_create_by!(slug: 'sospiro') do |b|
    b.name = 'Sospiro Perfumes'
    b.country = 'Italy'
    b.niche = true
  end

  xerjoff = Labor::Brand.find_or_create_by!(slug: 'xerjoff') do |b|
    b.name = 'Xerjoff'
    b.country = 'Italy'
    b.niche = true
  end

  louis_vuitton = Labor::Brand.find_or_create_by!(slug: 'louis-vuitton') do |b|
    b.name = 'Louis Vuitton'
    b.country = 'France'
    b.niche = true
  end

  carolina_herrera = Labor::Brand.find_or_create_by!(slug: 'carolina-herrera') do |b|
    b.name = 'Carolina Herrera'
    b.country = 'USA'
    b.niche = false
  end

  tiziana_terenzi = Labor::Brand.find_or_create_by!(slug: 'tiziana-terenzi') do |b|
    b.name = 'Tiziana Terenzi'
    b.country = 'Italy'
    b.niche = true
  end

  creed = Labor::Brand.find_or_create_by!(slug: 'creed') do |b|
    b.name = 'Creed'
    b.country = 'France'
    b.niche = true
  end

  hermes = Labor::Brand.find_or_create_by!(slug: 'hermes') do |b|
    b.name = 'Hermes'
    b.country = 'France'
    b.niche = false
  end

  bvlgari = Labor::Brand.find_or_create_by!(slug: 'bvlgari') do |b|
    b.name = 'Bvlgari'
    b.country = 'Italy'
    b.niche = false
  end

  giorgio_armani = Labor::Brand.find_or_create_by!(slug: 'giorgio-armani') do |b|
    b.name = 'Giorgio Armani'
    b.country = 'Italy'
    b.niche = false
  end

  versace = Labor::Brand.find_or_create_by!(slug: 'versace') do |b|
    b.name = 'Versace'
    b.country = 'Italy'
    b.niche = false
  end

  thomas_kosmala = Labor::Brand.find_or_create_by!(slug: 'thomas-kosmala') do |b|
    b.name = 'Thomas Kosmala'
    b.country = 'France'
    b.niche = true
  end

  frederic_malle = Labor::Brand.find_or_create_by!(slug: 'frederic-malle') do |b|
    b.name = 'Frédéric Malle'
    b.country = 'France'
    b.niche = true
  end

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

  # 2. Setup correct metadata mapping hash
  catalog_data = {
    # Erba Pura (Xerjoff)
    1292 => {
      brand: xerjoff,
      year: 2019,
      gender: 'unisex',
      concentration: 'edp',
      perfumers: ['Christian Carbonnel', 'Laura Santander'],
      accords: [
        { name: 'fruity', weight: 100 },
        { name: 'citrus', weight: 85 },
        { name: 'musky', weight: 80 },
        { name: 'sweet', weight: 70 },
        { name: 'amber', weight: 60 }
      ],
      notes: {
        top: ['Sicilian Orange', 'Calabrian Bergamot', 'Sicilian Lemon'],
        heart: ['Fruits'],
        base: ['White Musk', 'Madagascar Vanilla', 'Amber']
      },
      desc_en: 'Erba Pura by Xerjoff is a Amber fragrance for women and men. Erba Pura was launched in 2019. Erba Pura was created by Christian Carbonnel and Laura Santander. Top notes are Sicilian Orange, Calabrian bergamot and Sicilian Lemon; middle note is Fruits; base notes are White Musk, Madagascar Vanilla and Amber.',
      desc_ru: 'Erba Pura Xerjoff — это аромат для мужчин и женщин, он принадлежит к группе восточные. Erba Pura выпущен в 2019 году. Erba Pura был создан Christian Carbonnel и Laura Santander. Верхние ноты: Сицилийский апельсин, Калабрийский бергамот и Сицилийский лимон; средняя нота: Фруктовые ноты; базовые ноты: Белый мускус, Мадагаскарская ваниль и Амбра.'
    },
    # Erba Pura (Sospiro)
    1472 => {
      brand: sospiro,
      year: 2013,
      gender: 'unisex',
      concentration: 'edp',
      perfumers: ['Christian Carbonnel', 'Laura Santander'],
      accords: [
        { name: 'fruity', weight: 100 },
        { name: 'citrus', weight: 85 },
        { name: 'musky', weight: 80 },
        { name: 'sweet', weight: 70 },
        { name: 'amber', weight: 60 }
      ],
      notes: {
        top: ['Sicilian Orange', 'Calabrian Bergamot', 'Sicilian Lemon'],
        heart: ['Fruits'],
        base: ['White Musk', 'Madagascar Vanilla', 'Amber']
      },
      desc_en: 'Erba Pura by Sospiro Perfumes is a Amber fragrance for women and men. Erba Pura was launched in 2013. Erba Pura was created by Christian Carbonnel and Laura Santander. Top notes are Sicilian Orange, Calabrian bergamot and Sicilian Lemon; middle note is Fruits; base notes are White Musk, Madagascar Vanilla and Amber.',
      desc_ru: 'Erba Pura Sospiro Perfumes — это аромат для мужчин и женщин, он принадлежит к группе восточные. Erba Pura выпущен в 2013 году. Erba Pura был создан Christian Carbonnel и Laura Santander. Верхние ноты: Сицилийский апельсин, Калабрийский бергамот и Сицилийский лимон; средняя нота: Фруктовые ноты; базовые ноты: Белый мускус, Мадагаскарская ваниль и Амбра.'
    },
    # La Tosca
    1225 => {
      brand: xerjoff,
      year: 2015,
      gender: 'women',
      concentration: 'edp',
      perfumers: ['Chris Maurice'],
      accords: [
        { name: 'citrus', weight: 100 },
        { name: 'floral', weight: 85 },
        { name: 'musky', weight: 80 },
        { name: 'fresh', weight: 75 },
        { name: 'patchouli', weight: 70 }
      ],
      notes: {
        top: ['Italian Lemon', 'Green Mandarin'],
        heart: ['Violet Leaf', 'Eucalyptus', 'Bulgarian Rose'],
        base: ['Musk', 'Patchouli', 'Madagascar Vanilla', 'Amber']
      },
      desc_en: 'La Tosca by Xerjoff is a Chypre Floral fragrance for women. La Tosca was launched in 2015. The nose behind this fragrance is Chris Maurice. Top notes are Italian Lemon and Green Mandarin; middle notes are Violet Leaf, Eucalyptus and Bulgarian Rose; base notes are Musk, Patchouli, Madagascar Vanilla and Amber.',
      desc_ru: 'La Tosca Xerjoff — это аромат для женщин, он принадлежит к группе шипровые цветочные. La Tosca выпущен в 2015 году. Парфюмер: Chris Maurice. Верхние ноты: Итальянский лимон и Зеленый мандарин; средние ноты: Лист фиалки, Эвкалипт и Болгарская роза; базовые ноты: Мускус, Пачули, Мадагаскарская ваниль и Амбра.'
    },
    # Mefisto
    1291 => {
      brand: xerjoff,
      year: 2009,
      gender: 'men',
      concentration: 'edp',
      perfumers: [],
      accords: [
        { name: 'citrus', weight: 100 },
        { name: 'powdery', weight: 90 },
        { name: 'aromatic', weight: 85 },
        { name: 'fresh spicy', weight: 75 },
        { name: 'woody', weight: 70 }
      ],
      notes: {
        top: ['Grapefruit', 'Bergamot', 'Amalfi Lemon'],
        heart: ['Lavender', 'Iris', 'Rose'],
        base: ['Musk', 'Sandalwood', 'Virginia Cedar', 'Amber']
      },
      desc_en: 'Mefisto by Xerjoff is a Citrus Aromatic fragrance for men. Mefisto was launched in 2009. Top notes are Grapefruit, Bergamot and Amalfi Lemon; middle notes are Lavender, Iris and Rose; base notes are Musk, Sandalwood, Virginia Cedar and Amber.',
      desc_ru: 'Mefisto Xerjoff — это аромат для мужчин, он принадлежит к группе цитрусовые фужерные. Mefisto выпущен в 2009 году. Верхние ноты: Грейпфрут, Бергамот и Амальфитанский лимон; средние ноты: Лаванда, Ирис и Роза; базовые ноты: Мускус, Сандал, Вирджинский кедр и Амбра.'
    },
    # Mefisto Gentiluomo
    1108 => {
      brand: xerjoff,
      year: 2018,
      gender: 'men',
      concentration: 'edp',
      perfumers: [],
      accords: [
        { name: 'citrus', weight: 100 },
        { name: 'aromatic', weight: 90 },
        { name: 'fresh spicy', weight: 80 },
        { name: 'floral', weight: 75 },
        { name: 'woody', weight: 70 }
      ],
      notes: {
        top: ['Bergamot', 'Grapefruit', 'Lemon', 'Lavender'],
        heart: ['Violet', 'Iris', 'Rose'],
        base: ['Amber', 'Musk', 'Cedarwood']
      },
      desc_en: 'Mefisto Gentiluomo by Xerjoff is a Citrus Aromatic fragrance for men. Mefisto Gentiluomo was launched in 2018. Top notes are Lavender, Grapefruit, Bergamot and Lemon; middle notes are Violet, Iris and Rose; base notes are Musk, Cedar and Amber.',
      desc_ru: 'Mefisto Gentiluomo Xerjoff — это аромат для мужчин, он принадлежит к группе цитрусовые фужерные. Mefisto Gentiluomo выпущен в 2018 году. Верхние ноты: Лаванда, Грейпфрут, Бергамот и Лимон; средние ноты: Фиалка, Ирис и Роза; базовые ноты: Мускус, Кедр и Амбра.'
    },
    # Gran Ballo
    1173 => {
      brand: xerjoff,
      year: 2013,
      gender: 'women',
      concentration: 'edp',
      perfumers: [],
      accords: [
        { name: 'sweet', weight: 100 },
        { name: 'white floral', weight: 90 },
        { name: 'caramel', weight: 85 },
        { name: 'vanilla', weight: 75 }
      ],
      notes: {
        top: ['Red Berries', 'Tangerine'],
        heart: ['Gardenia', 'Jasmine', 'Honey'],
        base: ['Caramel', 'Vanilla', 'Amber', 'Sandalwood']
      },
      desc_en: 'Gran Ballo by Xerjoff is a Floral Fruity Gourmand fragrance for women. Gran Ballo was launched in 2013. The fragrance features wild berries, honey, tangerine, jasmine, gardenia, caramel, vanilla, amber and sandalwood.',
      desc_ru: 'Gran Ballo Xerjoff — это аромат для женщин, он принадлежит к группе цветочные фруктовые сладкие. Gran Ballo выпущен в 2013 году. Композиция аромата включает ноты: Жимолость, Гардения, Жасмин, Карамель, Ваниль и Амбра.'
    },
    # More Than Words
    1154 => {
      brand: xerjoff,
      year: 2012,
      gender: 'unisex',
      concentration: 'edp',
      perfumers: ['Chris Maurice'],
      accords: [
        { name: 'fruity', weight: 100 },
        { name: 'rose', weight: 90 },
        { name: 'oud', weight: 85 },
        { name: 'amber', weight: 75 },
        { name: 'woody', weight: 70 }
      ],
      notes: {
        top: ['Fruity Notes', 'Ambergris'],
        heart: ['Floral Notes', 'Rose', 'Labdanum'],
        base: ['Oud', 'Woody Notes', 'Amber', 'Benzoin', 'Frankincense']
      },
      desc_en: 'More Than Words by Xerjoff is a Amber Woody fragrance for women and men. More Than Words was launched in 2012. The nose behind this fragrance is Chris Maurice. The fragrance features agarwood (oud), fruity notes, floral notes, oriental notes, ambergris, amber, olibanum and labdanum.',
      desc_ru: 'More Than Words Xerjoff — это аромат для мужчин и женщин, он принадлежит к группе восточные древесные. More Than Words выпущен в 2012 году. Парфюмер: Chris Maurice. Композиция аромата включает ноты: Уд, Фруктовые ноты, Цветочные ноты, Древесные ноты, Серая амбра, Амбра, Олибанум и Лабданум.'
    },
    # Alexandria II
    1195 => {
      brand: xerjoff,
      year: 2012,
      gender: 'unisex',
      concentration: 'edp',
      perfumers: ['Chris Maurice'],
      accords: [
        { name: 'woody', weight: 100 },
        { name: 'amber', weight: 90 },
        { name: 'powdery', weight: 85 },
        { name: 'oud', weight: 80 },
        { name: 'lavender', weight: 75 }
      ],
      notes: {
        top: ['Palisander Rosewood', 'Lavender', 'Cinnamon', 'Apple'],
        heart: ['Bulgarian Rose', 'Cedar', 'Lily-of-the-Valley'],
        base: ['Oud', 'Sandalwood', 'Amber', 'Vanilla', 'Musk']
      },
      desc_en: 'Alexandria II by Xerjoff is a Amber Woody fragrance for women and men. Alexandria II was launched in 2012. The nose behind this fragrance is Chris Maurice. Top notes are Palisander Rosewood, Lavender, Cinnamon and Apple; middle notes are Bulgarian Rose, Cedar and Lily-of-the-Valley; base notes are Agarwood (Oud), Sandalwood, Amber, Vanilla and Musk.',
      desc_ru: 'Alexandria II Xerjoff — это аромат для мужчин и женщин, он принадлежит к группе восточные древесные. Alexandria II выпущен в 2012 году. Парфюмер: Chris Maurice. Верхние ноты: Палисандр, Лаванда, Корица и Яблоко; средние ноты: Болгарская роза, Кедр и Ландыш; базовые ноты: Уд, Сандал, Амбра, Ваниль и Мускус.'
    },
    # Afternoon Swim (1348)
    1348 => {
      brand: louis_vuitton,
      year: 2019,
      gender: 'unisex',
      concentration: 'edp',
      perfumers: ['Jacques Cavallier Belletrud'],
      accords: [
        { name: 'citrus', weight: 100 },
        { name: 'fresh spicy', weight: 85 }
      ],
      notes: {
        top: ['Sicilian Orange', 'Mandarin Orange', 'Bergamot'],
        heart: ['Ginger'],
        base: ['Ambergris']
      },
      desc_en: 'Afternoon Swim by Louis Vuitton is a Citrus fragrance for women and men. Afternoon Swim was launched in 2019. The nose behind this fragrance is Jacques Cavallier Belletrud. The fragrance features mandarin orange, sicilian orange and bergamot.',
      desc_ru: 'Afternoon Swim Louis Vuitton — это аромат для мужчин и женщин, он принадлежит к группе цитрусовые. Afternoon Swim выпущен в 2019 году. Парфюмер: Jacques Cavallier Belletrud. Композиция аромата включает ноты: Мандарин, Сицилийский апельсин и Бергамот.'
    },
    # Afternoon Swim (1518)
    1518 => {
      brand: louis_vuitton,
      year: 2019,
      gender: 'unisex',
      concentration: 'edp',
      perfumers: ['Jacques Cavallier Belletrud'],
      accords: [
        { name: 'citrus', weight: 100 },
        { name: 'fresh spicy', weight: 85 }
      ],
      notes: {
        top: ['Sicilian Orange', 'Mandarin Orange', 'Bergamot'],
        heart: ['Ginger'],
        base: ['Ambergris']
      },
      desc_en: 'Afternoon Swim by Louis Vuitton is a Citrus fragrance for women and men. Afternoon Swim was launched in 2019. The nose behind this fragrance is Jacques Cavallier Belletrud. The fragrance features mandarin orange, sicilian orange and bergamot.',
      desc_ru: 'Afternoon Swim Louis Vuitton — это аромат для мужчин и женщин, он принадлежит к группе цитрусовые. Afternoon Swim выпущен в 2019 году. Парфюмер: Jacques Cavallier Belletrud. Композиция аромата включает ноты: Мандарин, Сицилийский апельсин и Бергамот.'
    },
    # On The Beach (1210)
    1210 => {
      brand: louis_vuitton,
      year: 2021,
      gender: 'unisex',
      concentration: 'edp',
      perfumers: ['Jacques Cavallier Belletrud'],
      accords: [
        { name: 'citrus', weight: 100 },
        { name: 'aromatic', weight: 90 },
        { name: 'fresh spicy', weight: 80 },
        { name: 'green', weight: 70 },
        { name: 'woody', weight: 65 }
      ],
      notes: {
        top: ['Yuzu', 'Neroli'],
        heart: ['Rosemary', 'Thyme', 'Pink Pepper'],
        base: ['Cypress']
      },
      desc_en: 'On The Beach by Louis Vuitton is a Citrus Aromatic fragrance for women and men. On The Beach was launched in 2021. The nose behind this fragrance is Jacques Cavallier Belletrud. Top notes are Yuzu and Neroli; middle notes are Rosemary, Thyme, Pink Pepper, Cloves and Sand; base note is Cypress.',
      desc_ru: 'On The Beach Louis Vuitton — это аромат для мужчин и женщин, он принадлежит к группе цитрусовые фужерные. On The Beach выпущен в 2021 году. Парфюмер: Jacques Cavallier Belletrud. Верхние ноты: Юзу и Нероли; средние ноты: Розмарин, Тимьян, Розовый перец, Гвоздика (пряность) и Песок; базовая нота: Кипарис.'
    },
    # On The Beach (1499)
    1499 => {
      brand: louis_vuitton,
      year: 2021,
      gender: 'unisex',
      concentration: 'edp',
      perfumers: ['Jacques Cavallier Belletrud'],
      accords: [
        { name: 'citrus', weight: 100 },
        { name: 'aromatic', weight: 90 },
        { name: 'fresh spicy', weight: 80 },
        { name: 'green', weight: 70 },
        { name: 'woody', weight: 65 }
      ],
      notes: {
        top: ['Yuzu', 'Neroli'],
        heart: ['Rosemary', 'Thyme', 'Pink Pepper'],
        base: ['Cypress']
      },
      desc_en: 'On The Beach by Louis Vuitton is a Citrus Aromatic fragrance for women and men. On The Beach was launched in 2021. The nose behind this fragrance is Jacques Cavallier Belletrud. Top notes are Yuzu and Neroli; middle notes are Rosemary, Thyme, Pink Pepper, Cloves and Sand; base note is Cypress.',
      desc_ru: 'On The Beach Louis Vuitton — это аромат для мужчин и женщин, он принадлежит к группе цитрусовые фужерные. On The Beach выпущен в 2021 году. Парфюмер: Jacques Cavallier Belletrud. Верхние ноты: Юзу и Нероли; средние ноты: Розмарин, Тимьян, Розовый перец, Гвоздика (пряность) и Песок; базовая нота: Кипарис.'
    },
    # Good Girl
    1205 => {
      brand: carolina_herrera,
      year: 2016,
      gender: 'women',
      concentration: 'edp',
      perfumers: ['Louise Turner'],
      accords: [
        { name: 'sweet', weight: 100 },
        { name: 'white floral', weight: 90 },
        { name: 'cacao', weight: 85 },
        { name: 'vanilla', weight: 80 },
        { name: 'warm spicy', weight: 70 }
      ],
      notes: {
        top: ['Almond', 'Coffee', 'Bergamot', 'Lemon'],
        heart: ['Jasmine Sambac', 'Tuberose', 'Orris', 'Orange Blossom', 'Bulgarian Rose'],
        base: ['Tonka Bean', 'Cacao', 'Vanilla', 'Praline', 'Sandalwood', 'Musk', 'Amber', 'Cashmere Wood', 'Patchouli', 'Cinnamon', 'Cedar']
      },
      desc_en: 'Good Girl by Carolina Herrera is a Amber Floral fragrance for women. Good Girl was launched in 2016. The nose behind this fragrance is Louise Turner. Top notes are Almond, Coffee, Bergamot and Lemon; middle notes are Tuberose, Jasmine Sambac, Orange Blossom, Orris and Bulgarian Rose; base notes are Tonka Bean, Cacao, Vanilla, Praline, Sandalwood, Musk, Amber, Cashmere Wood, Cinnamon, Patchouli and Cedar.',
      desc_ru: 'Good Girl Carolina Herrera — это аромат для женщин, он принадлежит к группе восточные цветочные. Good Girl выпущен в 2016 году. Парфюмер: Louise Turner. Верхние ноты: Миндаль, Кофе, Бергамот и Лимон; средние ноты: Тубероза, Жасмин самбак, Апельсиновый цвет, Ирис и Болгарская роза; базовые ноты: Бобы тонка, Какао, Ваниль, Пралине, Сандал, Мускус, Январь, Кашемировое дерево, Корица, Пачули и Кедр.'
    },
    # Gumin (1231)
    1231 => {
      brand: tiziana_terenzi,
      year: 2016,
      gender: 'unisex',
      concentration: 'extrait',
      perfumers: ['Paolo Terenzi'],
      accords: [
        { name: 'citrus', weight: 100 },
        { name: 'fruity', weight: 90 },
        { name: 'sweet', weight: 80 },
        { name: 'woody', weight: 75 },
        { name: 'musky', weight: 70 }
      ],
      notes: {
        top: ['Mandarin Orange', 'Orange', 'Pineapple', 'Bergamot'],
        heart: ['Ozonic notes', 'Amber', 'Violet', 'Jasmine', 'Rose'],
        base: ['Musk', 'Sandalwood', 'Birch', 'Agarwood (Oud)']
      },
      desc_en: 'Gumin by Tiziana Terenzi is a Amber Woody fragrance for women and men. Gumin was launched in 2016. The nose behind this fragrance is Paolo Terenzi. Top notes are Mandarin Orange, Orange, Pineapple and Bergamot; middle notes are Ozonic notes, Amber, Violet, Jasmine and Rose; base notes are Musk, Sandalwood, Birch and Oud.',
      desc_ru: 'Gumin Tiziana Terenzi — это аромат для мужчин и женщин, он принадлежит к группе восточные древесные. Gumin выпущен в 2016 году. Парфюмер: Paolo Terenzi. Верхние ноты: Мандарин, Апельсин, Ананас и Бергамот; средние ноты: Озоновые ноты, Амбра, Фиалка, Жасмин и Роза; базовые ноты: Мускус, Сандал, Береза и Уд.'
    },
    # Gumin (1484)
    1484 => {
      brand: tiziana_terenzi,
      year: 2016,
      gender: 'unisex',
      concentration: 'extrait',
      perfumers: ['Paolo Terenzi'],
      accords: [
        { name: 'citrus', weight: 100 },
        { name: 'fruity', weight: 90 },
        { name: 'sweet', weight: 80 },
        { name: 'woody', weight: 75 },
        { name: 'musky', weight: 70 }
      ],
      notes: {
        top: ['Mandarin Orange', 'Orange', 'Pineapple', 'Bergamot'],
        heart: ['Ozonic notes', 'Amber', 'Violet', 'Jasmine', 'Rose'],
        base: ['Musk', 'Sandalwood', 'Birch', 'Agarwood (Oud)']
      },
      desc_en: 'Gumin by Tiziana Terenzi is a Amber Woody fragrance for women and men. Gumin was launched in 2016. The nose behind this fragrance is Paolo Terenzi. Top notes are Mandarin Orange, Orange, Pineapple and Bergamot; middle notes are Ozonic notes, Amber, Violet, Jasmine and Rose; base notes are Musk, Sandalwood, Birch and Oud.',
      desc_ru: 'Gumin Tiziana Terenzi — это аромат для мужчин и женщин, он принадлежит к группе восточные древесные. Gumin выпущен в 2016 году. Парфюмер: Paolo Terenzi. Верхние ноты: Мандарин, Апельсин, Ананас и Бергамот; средние ноты: Озоновые ноты, Амбра, Фиалка, Жасмин и Роза; базовые ноты: Мускус, Сандал, Береза и Уд.'
    },
    # Aventus for Her
    1202 => {
      brand: creed,
      year: 2016,
      gender: 'women',
      concentration: 'edp',
      perfumers: [],
      accords: [
        { name: 'fruity', weight: 100 },
        { name: 'fresh', weight: 90 },
        { name: 'citrus', weight: 85 },
        { name: 'woody', weight: 75 },
        { name: 'floral', weight: 70 }
      ],
      notes: {
        top: ['Green Apple', 'Bergamot', 'Lemon', 'Patchouli', 'Pink Pepper', 'Violet'],
        heart: ['Bulgarian Rose', 'Sandalwood', 'Musk', 'Styrax'],
        base: ['Peach', 'Blackcurrant', 'Lilac', 'Ylang-Ylang', 'Amber']
      },
      desc_en: 'Aventus for Her by Creed is a Chypre Fruity fragrance for women. Aventus for Her was launched in 2016. Top notes are Green Apple, Bergamot, Patchouli, Lemon, Pink Pepper and Violet; middle notes are Musk, Rose, Sandalwood and Styrax; base notes are Black Currant, Peach, Amber, Lilac, Ylang-Ylang and Ylang-Ylang.',
      desc_ru: 'Aventus for Her Creed — это аромат для женщин, он принадлежит к группе шипровые фруктовые. Aventus for Her выпущен в 2016 году. Верхние ноты: Зеленое яблоко, Бергамот, Пачули, Лимон, Розовый перец и Фиалка; средние ноты: Мускус, Роза, Сандал и Стиракс; базовые ноты: Черная смородина, Персик, Амбра, Сирень и Иланг-иланг.'
    },
    # Terre d'Hermès Intense
    1117 => {
      brand: hermes,
      year: 2018,
      gender: 'men',
      concentration: 'edp',
      perfumers: ['Christine Nagel'],
      accords: [
        { name: 'woody', weight: 100 },
        { name: 'citrus', weight: 90 },
        { name: 'aromatic', weight: 85 },
        { name: 'fresh spicy', weight: 80 }
      ],
      notes: {
        top: ['Bergamot', 'Grapefruit', 'Lemon'],
        heart: ['Sichuan Pepper', 'Geranium'],
        base: ['Vetiver', 'Patchouli', 'Amberwood', 'Olibanum']
      },
      desc_en: "Terre D'Hermes Eau Intense Vetiver by Hermès is a Woody Aromatic fragrance for men. Terre D'Hermes Eau Intense Vetiver was launched in 2018. The nose behind this fragrance is Christine Nagel. Top notes are Bergamot, Grapefruit and Lemon; middle notes are Sichuan Pepper and Geranium; base notes are Vetiver, Amberwood, Patchouli and Olibanum.",
      desc_ru: 'Terre D\'Hermes Eau Intense Vetiver Hermès — это аромат для мужчин, он принадлежит к группе древесные фужерные. Terre D\'Hermes Eau Intense Vetiver выпущен в 2018 году. Парфюмер: Christine Nagel. Верхние ноты: Бергамот, Грейпфрут и Лимон; средние ноты: Сычуаньский перец и Герань; базовые ноты: Ветивер, Древесный янтарь, Пачули и Олибанум.'
    },
    # bulgari-aqua-220-ml
    1246 => {
      brand: bvlgari,
      year: 2005,
      gender: 'men',
      concentration: 'edt',
      perfumers: ['Jacques Cavallier Belletrud'],
      accords: [
        { name: 'marine', weight: 100 },
        { name: 'citrus', weight: 90 },
        { name: 'aromatic', weight: 85 },
        { name: 'woody', weight: 75 }
      ],
      notes: {
        top: ['Mandarin Orange', 'Orange', 'Petitgrain'],
        heart: ['Seaweed', 'Lavender', 'Cotton Flower'],
        base: ['Patchouli', 'Cedar', 'Woodsy Notes', 'Amber', 'Clary Sage']
      },
      desc_en: 'Aqva Pour Homme by Bvlgari is a Aromatic Aquatic fragrance for men. Aqva Pour Homme was launched in 2005. The nose behind this fragrance is Jacques Cavallier. Top notes are Mandarin Orange, Orange and Petitgrain; middle notes are Seaweed, Lavender and Cotton Flower; base notes are Patchouli, Virginia Cedar, Woodsy Notes, Amber and Clary Sage.',
      desc_ru: 'Aqva Pour Homme Bvlgari — это аромат для мужчин, он принадлежит к группе фужерные водяные. Aqva Pour Homme выпущен в 2005 году. Парфюмер: Jacques Cavallier. Верхние ноты: Мандарин, Апельсин и Петитгрейн; средние ноты: Морские водоросли, Лаванда и Цветок хлопка; базовые ноты: Пачули, Вирджинский кедр, Древесные ноты, Амбра и Шалфей.'
    },
    # black-code-50-ml
    1144 => {
      brand: giorgio_armani,
      year: 2004,
      gender: 'men',
      concentration: 'edt',
      perfumers: ['Antoine Lie', 'Antoine Maisondieu'],
      accords: [
        { name: 'citrus', weight: 100 },
        { name: 'leather', weight: 90 },
        { name: 'aromatic', weight: 85 },
        { name: 'warm spicy', weight: 80 }
      ],
      notes: {
        top: ['Lemon', 'Bergamot'],
        heart: ['Star Anise', 'Olive Blossom', 'Guaiac Wood'],
        base: ['Leather', 'Tonka Bean', 'Tobacco']
      },
      desc_en: 'Armani Code by Giorgio Armani is a Amber Spicy fragrance for men. Armani Code was launched in 2004. Top notes are Lemon and Bergamot; middle notes are Star Anise, Olive Blossom and Guaiac Wood; base notes are Leather, Tonka Bean and Tobacco.',
      desc_ru: 'Armani Code Giorgio Armani — это аромат для мужчин, он принадлежит к группе восточные пряные. Armani Code выпущен в 2004 году. Верхние ноты: Лимон и Бергамот; средние ноты: Звездчатый анис, Цветок маслины и Гуаяк; базовые ноты: Кожа, Бобы тонка и Табак.'
    },
    # bright-crystal-220-ml
    1243 => {
      brand: versace,
      year: 2006,
      gender: 'women',
      concentration: 'edt',
      perfumers: ['Alberto Morillas'],
      accords: [
        { name: 'floral', weight: 100 },
        { name: 'citrus', weight: 90 },
        { name: 'fresh', weight: 85 }
      ],
      notes: {
        top: ['Yuzu', 'Pomegranate', 'Ice Accord'],
        heart: ['Peony', 'Lotus', 'Magnolia'],
        base: ['Musk', 'Mahogany', 'Amber']
      },
      desc_en: 'Bright Crystal by Versace is a Floral Fruity fragrance for women. Bright Crystal was launched in 2006. The nose behind this fragrance is Alberto Morillas. Top notes are Yuzu, Pomegranate and Ice; middle notes are Peony, Lotus and Magnolia; base notes are Musk, Mahogany and Amber.',
      desc_ru: 'Bright Crystal Versace — это аромат для женщин, он принадлежит к группе цветочные фруктовые. Bright Crystal выпущен в 2006 году. Парфюмер: Alberto Morillas. Верхние ноты: Юзу, Гранат и Лед; средние ноты: Пион, Лотос и Магнолия; базовые ноты: Мускус, Махагони и Амбра.'
    },
    # avto-parfum-thomas-kosmala-4
    1035 => {
      brand: thomas_kosmala,
      year: 2018,
      gender: 'unisex',
      concentration: 'edp',
      perfumers: ['Thomas Kosmala'],
      accords: [
        { name: 'musky', weight: 100 },
        { name: 'amber', weight: 90 },
        { name: 'woody', weight: 85 }
      ],
      notes: {
        top: ['Lemon Zest', 'Bitter Orange Blossom'],
        heart: ['Aromatic Spices'],
        base: ['Musk', 'Amber', 'Woody Notes']
      },
      desc_en: "No. 4 Apres l'Amour by Thomas Kosmala is a Woody Aromatic fragrance for women and men. No. 4 Apres l'Amour was launched in 2018. The nose behind this fragrance is Thomas Kosmala. Top notes are Lemon Zest and Bitter Orange Blossom; middle note is Aromatic Spices; base notes are Musk, Amber and Woody Notes.",
      desc_ru: 'No. 4 Apres l\'Amour Thomas Kosmala — это аромат для мужчин и женщин, он принадлежит к группе древесные фужерные. No. 4 Apres l\'Amour выпущен в 2018 году. Парфюмер: Thomas Kosmala. Верхние ноты: Цедра лимона и Цветы горького апельсина; средняя нота: Специи; базовые ноты: Мускус, Амбра и Древесные ноты.'
    },
    # elixir-des-merveilles
    1430 => {
      brand: hermes,
      year: 2006,
      gender: 'women',
      concentration: 'edp',
      perfumers: ['Jean-Claude Ellena'],
      accords: [
        { name: 'amber', weight: 100 },
        { name: 'woody', weight: 90 },
        { name: 'citrus', weight: 85 },
        { name: 'warm spicy', weight: 80 }
      ],
      notes: {
        top: ['Candied Orange', 'Caramel', 'Clementine'],
        heart: ['Patchouli', 'Tonka Bean', 'Sandalwood', 'Incense'],
        base: ['Ambergris', 'Peru Balsam', 'Siam Benzoin', 'Cedar', 'Oak']
      },
      desc_en: 'Elixir des Merveilles by Hermès is a Amber Fougère fragrance for women. Elixir des Merveilles was launched in 2006. The nose behind this fragrance is Jean-Claude Ellena. Top notes are Clementine, Caramel and Candied Orange; middle notes are Patchouli, Tonka Bean, Sandalwood and Incense; base notes are Siam Benzoin, Peru Balsam, Ambergris, Oak and Cedar.',
      desc_ru: 'Elixir des Merveilles Hermès — это аромат для женщин, он принадлежит к группе восточные фужерные. Elixir des Merveilles выпущен в 2006 году. Парфюмер: Jean-Claude Ellena. Верхние ноты: Клементин, Карамель и Засахаренный апельсин; средние ноты: Пачули, Бобы тонка, Сандал и Ладан; базовые ноты: Сиамский бензоин, Перуанский бальзам, Серая амбра, Дуб и Кедр.'
    },
    # french-lover
    1250 => {
      brand: frederic_malle,
      year: 2007,
      gender: 'men',
      concentration: 'edp',
      perfumers: ['Pierre Bourdon'],
      accords: [
        { name: 'woody', weight: 100 },
        { name: 'musky', weight: 90 },
        { name: 'aromatic', weight: 85 },
        { name: 'green', weight: 80 }
      ],
      notes: {
        top: ['Galbanum', 'Juniper', 'Pepper', 'Violet Leaf'],
        heart: ['Angelica', 'Cedar', 'Incense', 'Orris'],
        base: ['Vetiver', 'Oakmoss', 'White Musk', 'Patchouli', 'Amber']
      },
      desc_en: 'French Lover by Frederic Malle is a Woody Aromatic fragrance for men. French Lover was launched in 2007. The nose behind this fragrance is Pierre Bourdon. Top notes are Galbanum, Juniper, Pepper and Violet Leaf; middle notes are Angelica, Cedar, Incense and Orris; base notes are Vetiver, Oakmoss, White Musk, Patchouli and Amber.',
      desc_ru: 'French Lover Frederic Malle — это аромат для мужчин, он принадлежит к группе древесные фужерные. French Lover выпущен в 2007 году. Парфюмер: Pierre Bourdon. Верхние ноты: Гальбанум, Можжевельник, Перец и Лист фиалки; средние ноты: Ангелика, Кедр, Ладан и Ирис; базовые ноты: Ветивер, Дубовый мох, Белый мускус, Пачули и Амбра.'
    },
    # ombre-nomade-2
    1504 => {
      brand: louis_vuitton,
      year: 2018,
      gender: 'unisex',
      concentration: 'edp',
      perfumers: ['Jacques Cavallier Belletrud'],
      accords: [
        { name: 'amber', weight: 100 },
        { name: 'oud', weight: 90 },
        { name: 'warm spicy', weight: 85 },
        { name: 'rose', weight: 80 },
        { name: 'smoky', weight: 75 }
      ],
      notes: {
        top: ['Agarwood (Oud)', 'Rose', 'Incense', 'Raspberry'],
        heart: ['Saffron', 'Geranium'],
        base: ['Amberwood', 'Benzoin', 'Birch']
      },
      desc_en: 'Ombre Nomade by Louis Vuitton is a Amber Woody fragrance for women and men. Ombre Nomade was launched in 2018. The nose behind this fragrance is Jacques Cavallier Belletrud. The fragrance features agarwood (oud), geranium, raspberry, rose, amberwood, benzoin, birch, incense and saffron.',
      desc_ru: 'Ombre Nomade Louis Vuitton — это аромат для мужчин и женщин, он принадлежит к группе восточные древесные. Ombre Nomade выпущен в 2018 году. Парфюмер: Jacques Cavallier Belletrud. Композиция аромата включает ноты: Уд, Герань, Малина, Роза, Древесный янтарь, Бензоин, Береза, Ладан и Шафран.'
    },
    # EUPHORIA Collection
    1137 => {
      brand: calvin_klein,
      year: 2006,
      gender: 'men',
      concentration: 'edt',
      perfumers: ['Carlos Benaim', 'Loc Dong', 'Jean-Marc Chaillan'],
      accords: [
        { name: 'fresh spicy', weight: 100 },
        { name: 'aromatic', weight: 90 },
        { name: 'woody', weight: 85 }
      ],
      notes: {
        top: ['Ginger', 'Pepper'],
        heart: ['Black Basil', 'Sage', 'Cedar'],
        base: ['Amber', 'Suede', 'Redwood', 'Patchouli']
      },
      desc_en: 'Euphoria Men by Calvin Klein is a Woody Aromatic fragrance for men. Euphoria Men was launched in 2006. Euphoria Men was created by Carlos Benaim, Loc Dong and Jean-Marc Chaillan. Top notes are Ginger and Pepper; middle notes are Black Basil, Sage and Cedar; base notes are Amber, Suede, Brazilian Redwood and Patchouli.',
      desc_ru: 'Euphoria Men Calvin Klein — это аромат для мужчин, он принадлежит к группе древесные фужерные. Euphoria Men выпущен в 2006 году. Euphoria Men был создан Carlos Benaim, Loc Dong и Jean-Marc Chaillan. Верхние ноты: Имбирь и Перец; средние ноты: Черный базилик, Шалфей и Кедр; базовые ноты: Амбра, Замша, Бразильский махагони и Пачули.'
    },
    # eyphoria
    1164 => {
      brand: calvin_klein,
      year: 2006,
      gender: 'men',
      concentration: 'edt',
      perfumers: ['Carlos Benaim', 'Loc Dong', 'Jean-Marc Chaillan'],
      accords: [
        { name: 'fresh spicy', weight: 100 },
        { name: 'aromatic', weight: 90 },
        { name: 'woody', weight: 85 }
      ],
      notes: {
        top: ['Ginger', 'Pepper'],
        heart: ['Black Basil', 'Sage', 'Cedar'],
        base: ['Amber', 'Suede', 'Redwood', 'Patchouli']
      },
      desc_en: 'Euphoria Men by Calvin Klein is a Woody Aromatic fragrance for men. Euphoria Men was launched in 2006. Euphoria Men was created by Carlos Benaim, Loc Dong and Jean-Marc Chaillan. Top notes are Ginger and Pepper; middle notes are Black Basil, Sage and Cedar; base notes are Amber, Suede, Brazilian Redwood and Patchouli.',
      desc_ru: 'Euphoria Men Calvin Klein — это аромат для мужчин, он принадлежит к группе древесные фужерные. Euphoria Men выпущен в 2006 году. Euphoria Men был создан Carlos Benaim, Loc Dong и Jean-Marc Chaillan. Верхние ноты: Имбирь и Перец; средние ноты: Черный базилик, Шалфей и Кедр; базовые ноты: Амбра, Замша, Бразильский махагони и Пачули.'
    }
  }

  # 3. Apply the changes
  catalog_data.each do |pid, data|
    product = Spree::Product.find_by(id: pid)
    next unless product

    puts "Patching Product #{pid}: #{product.name} (slug: #{product.slug})"

    # Wiping images
    product.master.images.destroy_all

    # Wiping relationships
    product.labor_product_notes.destroy_all
    product.labor_product_accords.destroy_all
    product.labor_product_perfumers.destroy_all

    # Detail updates
    detail = Labor::ProductFragranceDetail.find_or_initialize_by(spree_product_id: product.id)
    detail.release_year = data[:year]
    detail.labor_brand_id = data[:brand].id
    detail.gender = data[:gender]
    detail.concentration = data[:concentration]
    detail.save!

    # Accords seeding
    data[:accords].each do |a|
      acc = fetch_accord(a[:name])
      Labor::ProductAccord.create!(
        spree_product_id: product.id,
        labor_accord_id: acc.id,
        weight: a[:weight]
      )
    end

    # Notes seeding
    %w[top heart base].each do |layer|
      Array(data[:notes][layer.to_sym]).each_with_index do |note_name, idx|
        n = fetch_note(note_name)
        Labor::ProductNote.create!(
          spree_product_id: product.id,
          labor_note_id: n.id,
          pyramid_layer: layer,
          position: idx
        )
      end
    end

    # Perfumers seeding
    data[:perfumers].each do |perf_name|
      perf = fetch_perfumer(perf_name)
      if perf
        Labor::ProductPerfumer.create!(
          spree_product_id: product.id,
          labor_perfumer_id: perf.id
        )
      end
    end

    # Description translations
    Mobility.with_locale(:en) do
      product.description = data[:desc_en]
      product.save!
    end
    Mobility.with_locale(:ru) do
      product.description = data[:desc_ru]
      product.save!
    end
  end

  # 4. Handle non-perfumes / diffusers / private label items (clear images)
  non_perfumes = [1002, 1126, 1127, 1128, 1471]
  non_perfumes.each do |pid|
    product = Spree::Product.find_by(id: pid)
    next unless product
    puts "Clearing images for non-perfume Product #{pid}: #{product.name}"
    product.master.images.destroy_all
  end

  puts "DONE PATCHING CATALOG MISMATCHES."
end
