require 'yaml'

namespace :labor do
  desc 'Seed curated accord profiles for the remaining 60 products that could not be harvested or cloned. Idempotent — only writes when the product has zero accords.'
  task seed_curated_accords: :environment do
    accord_color = {
      'amber'       => '#bc4d10',
      'aquatic'     => '#63cce2',
      'aromatic'    => '#37a089',
      'balsamic'    => '#8f6e2c',
      'cherry'      => '#a91212',
      'citrus'      => '#f9ff52',
      'floral'      => '#ff5f8d',
      'fresh'       => '#7dd3c0',
      'fruity'      => '#e87b3d',
      'green'       => '#0e8c1d',
      'leather'     => '#78483a',
      'musky'       => '#9c8a73',
      'oud'         => '#3a2a1a',
      'powdery'     => '#e6d5e0',
      'rose'        => '#d94d6c',
      'smoky'       => '#827487',
      'sweet'       => '#ee363b',
      'tobacco'     => '#6b4423',
      'vanilla'     => '#e8c79e',
      'warm spicy'  => '#b8451a',
      'white floral'=> '#f5e5d6',
      'woody'       => '#774414',
      'mossy'       => '#5b6b32',
    }

    # Curated accord data, keyed by slug. Values: array of [accord_name, weight].
    # Profiles assembled from publicly documented fragrance compositions /
    # category conventions (training knowledge through Jan 2026).
    curated = {
      # ---- Real perfumes ----
      'tendre'              => [['floral',100],['powdery',75],['sweet',60],['white floral',50],['woody',30]],
      'bois-imperial'       => [['woody',100],['aromatic',75],['musky',60],['amber',50],['warm spicy',40]],
      'pink-molecule-090'   => [['woody',100],['musky',80],['aromatic',65],['warm spicy',50],['powdery',40]],
      'love-don-t-by-shy'   => [['amber',100],['sweet',85],['warm spicy',70],['floral',55],['woody',45]],
      'smoke-cherry'        => [['cherry',100],['smoky',85],['sweet',70],['woody',55],['tobacco',40]],
      'n4-apres-l-amour'    => [['floral',100],['powdery',80],['musky',60],['woody',45],['amber',35]],
      'limmensite'          => [['aromatic',100],['citrus',85],['woody',70],['aquatic',50],['warm spicy',35]],
      'attar-musc-kashmir'  => [['amber',100],['musky',85],['sweet',70],['oud',55],['woody',45]],

      # ---- "смесь душистых веществ" raw oils (parent unknown) ----
      'chanel-tendre'   => [['floral',100],['fruity',75],['citrus',60],['white floral',50],['sweet',35]],
      'ocean'           => [['aquatic',100],['fresh',85],['citrus',60],['aromatic',45]],
      'cucumber'        => [['aquatic',100],['green',85],['fresh',70],['aromatic',50]],
      'thermal-spa'     => [['aromatic',100],['aquatic',80],['fresh',65],['green',50]],
      'nature-function' => [['green',100],['aromatic',85],['floral',60],['fresh',45]],
      'japanese-tatami' => [['green',100],['aromatic',85],['fresh',65],['aquatic',50],['woody',35]],
      'black-prince'    => [['amber',100],['woody',85],['leather',70],['warm spicy',55],['oud',40]],
      'cola-diffuser'   => [['sweet',100],['fruity',85],['warm spicy',55],['vanilla',40]],

      # ---- Body lotions / diffusers / creams / soaps named by character ----
      'body-lotion-osmanthus-jasmine' => [['floral',100],['white floral',80],['fruity',55],['powdery',40]],
      'body-lotion-violet-peach'      => [['fruity',100],['floral',80],['sweet',55],['powdery',40]],
      'body-lotion-vanilla-milk'      => [['vanilla',100],['sweet',85],['powdery',60],['amber',40]],
      'diffuzor-joly'                 => [['floral',100],['fruity',75],['sweet',55]],
      'diffuzor-black-vanilla'        => [['vanilla',100],['sweet',85],['amber',60],['warm spicy',40]],
      'diffuzor-rosso-nobili'         => [['floral',100],['rose',85],['woody',55],['warm spicy',40]],
      'savon-krem-milo-relax-500-gr'  => [['floral',100],['aromatic',75],['powdery',55]],
      'savon-krem-milo-thermal-spa-500-gr' => [['aromatic',100],['aquatic',80],['fresh',65]],
      'savon-krem-milo-natural-500-gr'=> [['green',100],['aromatic',75],['fresh',55]],
      'savon-krem-milo-romance-500-gr'=> [['floral',100],['rose',85],['sweet',60],['powdery',45]],
      'savon-500'                     => [['aromatic',100],['fresh',85],['powdery',55]],
      'black-earth'                   => [['mossy',100],['woody',85],['amber',60],['smoky',45]],
      'green-scent'                   => [['green',100],['aromatic',80],['fresh',65]],
      'thermal-spa-2'                 => [['aromatic',100],['aquatic',80],['fresh',65]],
      'eyphoria'                      => [['floral',100],['fruity',85],['sweet',60],['woody',45]],
      'svecha-aroma'                  => [['amber',100],['sweet',75],['vanilla',60],['warm spicy',45]],
      'limmensite-300-gr'             => [['aromatic',100],['citrus',85],['woody',60]],
      'pink-molecule-090-300'         => [['woody',100],['musky',80],['aromatic',60]],
      'molecula-020-300'              => [['woody',100],['musky',85],['amber',60],['aromatic',45]],

      # ---- Antiseptik Sofderm sub-variants (functional fresh perfumery) ----
      'antiseptik-sofderm-blue-400-ml'    => [['aquatic',100],['fresh',85],['citrus',55]],
      'antiseptik-sofderm-melon-400-ml'   => [['fruity',100],['fresh',75],['green',55]],
      'antiseptik-sofderm-crystal-400-ml' => [['aquatic',100],['fresh',85],['aromatic',55]],
      'antiseptik-sofderm-citiboy-400-ml' => [['citrus',100],['fresh',85],['aromatic',55]],
      'antiseptik-sofderm-blue-100-ml'    => [['aquatic',100],['fresh',85],['citrus',55]],
      'antiseptik-sofderm-melon-100-ml'   => [['fruity',100],['fresh',75],['green',55]],
      'antiseptik-sofderm-fleur-100-ml'   => [['floral',100],['fresh',75],['powdery',45]],
      'antiseptik-sofderm-crystal-100-ml' => [['aquatic',100],['fresh',85],['aromatic',55]],
      'antiseptik-sofderm-citiboy-100-ml' => [['citrus',100],['fresh',85],['aromatic',55]],
      'antiseptik-sofderm-extra-50-ml'    => [['aromatic',100],['fresh',85],['citrus',55]],

      # ---- Generic empty flacons / refillables (assigned neutral "fresh") ----
      'mr-flakon-20-ml'         => [['fresh',60],['aromatic',40]],
      'magnit-flakon-10-ml'     => [['fresh',60],['aromatic',40]],
      'kalso-10'                => [['fresh',60],['aromatic',40]],
      'kalso-20'                => [['fresh',60],['aromatic',40]],
      '20-c'                    => [['fresh',60],['aromatic',40]],
      'flakon-koja-louivitton'  => [['fresh',60],['aromatic',40]],
      'flakon-koja-kvadrat'     => [['fresh',60],['aromatic',40]],
      'flakon-koja-zeleniy'     => [['fresh',60],['aromatic',40]],
      'flakon-koja-roziviy'     => [['fresh',60],['aromatic',40]],
      'flakon-koja-orang'       => [['fresh',60],['aromatic',40]],
      'ctu-18189'               => [['fresh',60],['aromatic',40]],
      'zed-87190'               => [['fresh',60],['aromatic',40]],
      'xrn-92860'               => [['fresh',60],['aromatic',40]],
      'prs-28742'               => [['fresh',60],['aromatic',40]],
      'lv'                      => [['fresh',60],['aromatic',40]],
      '120'                     => [['fresh',60],['aromatic',40]],
      'ecstasy'                 => [['floral',100],['fruity',75],['sweet',55],['powdery',40]],
    }

    seeded = 0
    skipped_already = 0
    not_found = 0
    accord_cache = {}

    fetch_accord = lambda do |slug_name|
      return accord_cache[slug_name] if accord_cache.key?(slug_name)
      record = Labor::Accord.find_or_initialize_by(slug: slug_name)
      if record.new_record?
        record[:name] = slug_name
        record.color_hex = accord_color[slug_name] || '#999999'
        record.save!
      end
      accord_cache[slug_name] = record
    end

    curated.each do |slug, accord_rows|
      product = Spree::Product.friendly.find_by(slug: slug)
      if product.nil?
        not_found += 1
        puts "  missing product: #{slug}"
        next
      end
      if Labor::ProductAccord.where(spree_product_id: product.id).any?
        skipped_already += 1
        next
      end
      accord_rows.each do |accord_name, weight|
        accord = fetch_accord.call(accord_name)
        Labor::ProductAccord.find_or_create_by!(
          spree_product_id: product.id,
          labor_accord_id:  accord.id,
        ) { |row| row.weight = weight }
      end
      seeded += 1
    end

    puts "Seeded curated accords for #{seeded} products. Skipped #{skipped_already} (already had accords). #{not_found} slugs not found."
  end
end
