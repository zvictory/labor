require 'json'
require 'net/http'
require 'uri'
require 'stringio'

namespace :labor do
  desc 'Ingest Fragrantica harvest JSON (HARVEST_FILE=tmp/fragrantica_harvest.json). Replaces synthesized accords + notes with real Fragrantica data, propagates to clone siblings (slug-2/-3/-N).'
  task ingest_fragrantica_harvest: :environment do
    path = ENV['HARVEST_FILE'] || '/tmp/fragrantica_harvest.json'
    rows = JSON.parse(File.read(path))

    new_accord_colors = {
      'caramel'   => '#c4853a',
      'champagne' => '#f5e8b8',
    }

    family_for = lambda do |note_name|
      n = note_name.to_s.downcase
      return 'citrus'   if n.match?(/bergamot|lemon|lime|orange|grapefruit|neroli|mandarin|yuzu|citron|tangerine|petitgrain/)
      return 'floral'   if n.match?(/rose|jasmine|iris|violet|lily|peony|gardenia|tuberose|magnolia|osmanthus|geranium|ylang|orange blossom|honeysuckle|narcissus|lavender|orris/)
      return 'woody'    if n.match?(/cedar|sandalwood|patchouli|vetiver|oud|wood|guaiac|cypress|rosewood|cashmeran|akigalawood|mahogany|blackwood|ebony|papyrus/)
      return 'gourmand' if n.match?(/vanilla|caramel|chocolate|tonka|almond|honey|marshmallow|sugar|whipped cream|coffee|nut|cacao|cocoa|praline|toffee|milk|cream/)
      return 'oriental' if n.match?(/amber|labdanum|benzoin|resin|incense|myrrh|frankincense|ambrette|ambroxan|musk|civet/)
      return 'oriental' if n.match?(/pepper|cinnamon|saffron|cardamom|clove|nutmeg|coriander|ginger|cumin|anise|spice|cade|cad oil/)
      return 'leather'  if n.match?(/leather/)
      return 'smoky'    if n.match?(/smoke|tobacco|palo santo/)
      return 'aquatic'  if n.match?(/water|sea|aquatic|marine|salt|ozonic|rain/)
      return 'chypre'   if n.match?(/moss|oakmoss|chypre/)
      return 'aromatic' if n.match?(/basil|rosemary|sage|mate|mint|thyme|eucalyptus|clary|herbal/)
      return 'green'    if n.match?(/leaf|grass|green|fig|hay|tomato|tea|tea leaf|elder/)
      return 'gourmand' if n.match?(/cherry|peach|apricot|plum|fruit|berry|apple|pear|coconut|pineapple|mango|fig|melon/)
      nil
    end

    canonicalize_accord_slug = lambda do |raw|
      raw.to_s.downcase.gsub(/\s+/, '-').gsub(/[^a-z0-9-]/, '')
    end

    fetch_accord = lambda do |raw_name|
      slug = canonicalize_accord_slug.call(raw_name)
      display = slug.tr('-', ' ')
      record = Labor::Accord.find_or_initialize_by(slug: slug)
      if record.new_record?
        record[:name] = display
        record.color_hex = new_accord_colors[slug] || '#999999'
        record.save!
        Mobility.with_locale(:en) { record.name = display; record.save! }
      else
        if record.read_attribute(:name).to_s.strip.empty?
          record.update_column(:name, display)
        end
        if record.color_hex.to_s.strip.empty?
          record.update_column(:color_hex, new_accord_colors[slug] || '#999999')
        end
        Mobility.with_locale(:en) do
          if record.name.to_s.strip.empty?
            record.name = display
            record.save!
          end
        end
      end
      record
    end

    fetch_note = lambda do |raw_name|
      slug = raw_name.to_s.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/\A-+|-+\z/, '')
      record = Labor::Note.find_or_initialize_by(slug: slug)
      if record.new_record?
        record[:name] = raw_name.to_s
        record.family = family_for.call(raw_name)
        record.save!
        Mobility.with_locale(:en) { record.name = raw_name.to_s; record.save! }
      else
        if record.read_attribute(:name).to_s.strip.empty?
          record.update_column(:name, raw_name.to_s)
        end
        if record.family.blank?
          fam = family_for.call(raw_name)
          record.update_column(:family, fam) if fam
        end
        Mobility.with_locale(:en) do
          if record.name.to_s.strip.empty?
            record.name = raw_name.to_s
            record.save!
          end
        end
      end
      record
    end

    fetch_brand = lambda do |brand_name|
      return nil if brand_name.to_s.strip.empty?
      brand_slug = brand_name.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/\A-+|-+\z/, '')
      record = Labor::Brand.find_or_initialize_by(slug: brand_slug)
      if record.new_record?
        record[:name] = brand_name
        record.save!
      end
      record
    end

    fetch_perfumer = lambda do |raw_name|
      name = raw_name.to_s.strip
      return nil if name.empty?
      slug = name.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/\A-+|-+\z/, '')
      Labor::Perfumer.find_or_create_by!(slug: slug) { |p| p.name = name }
    end

    valid_gender        = %w[men women unisex].to_set
    valid_concentration = %w[edc edt edp parfum extrait cologne].to_set

    fetch_image = lambda do |url, max_redirects: 3|
      uri = URI.parse(url)
      max_redirects.times do
        http = Net::HTTP.new(uri.host, uri.port)
        http.use_ssl = (uri.scheme == 'https')
        http.open_timeout = 10
        http.read_timeout = 30
        req = Net::HTTP::Get.new(uri.request_uri)
        req['User-Agent'] = 'Mozilla/5.0 (labor-rake-image-bot)'
        req['Accept']     = 'image/*,*/*;q=0.8'
        res = http.request(req)
        case res
        when Net::HTTPSuccess
          return [res.body, res['Content-Type'].to_s]
        when Net::HTTPRedirection
          uri = URI.join(uri.to_s, res['Location'])
          next
        else
          raise "HTTP #{res.code} from #{url}"
        end
      end
      raise "too many redirects from #{url}"
    end

    normalize_seasons_time = lambda do |row|
      seasons_payload = nil
      time_payload    = nil

      raw_seasons = row['seasons'].is_a?(Hash) ? row['seasons'] : {}
      raw_time    = row['time'].is_a?(Hash)    ? row['time']    : {}

      if raw_seasons.any?
        seasons_payload = {
          'spring' => raw_seasons['spring'].to_i,
          'summer' => raw_seasons['summer'].to_i,
          'autumn' => (raw_seasons['autumn'] || raw_seasons['fall']).to_i,
          'winter' => raw_seasons['winter'].to_i,
        }
        if raw_seasons.key?('day') || raw_seasons.key?('night')
          time_payload = {
            'day'   => raw_seasons['day'].to_i,
            'night' => raw_seasons['night'].to_i,
          }
        end
      end

      if raw_time.any?
        time_payload = {
          'day'   => raw_time['day'].to_i,
          'night' => raw_time['night'].to_i,
        }
      end

      [seasons_payload, time_payload]
    end

    sibling_products = lambda do |slug|
      parent_slug = slug.sub(/-\d+\z/, '')
      candidates = Spree::Product.where('slug = ? OR slug LIKE ?', parent_slug, "#{parent_slug}-%")
      candidates.select { |p| p.slug == parent_slug || p.slug.match?(/\A#{Regexp.escape(parent_slug)}-\d+\z/) }
    end

    stats = {
      products_updated: 0, accord_links: 0, note_links: 0,
      perfumer_links: 0, accord_colors_set: 0, skipped: 0,
      images_replaced: 0, image_failures: 0
    }
    image_errors = []

    ActiveRecord::Base.transaction do
      rows.each do |row|
        if row['not_found']
          stats[:skipped] += 1
          puts "  skip (not_found): #{row['slug']}"
          next
        end

        primary = Spree::Product.friendly.find_by(slug: row['slug'])
        unless primary
          stats[:skipped] += 1
          puts "  skip (product missing): #{row['slug']}"
          next
        end

        targets = sibling_products.call(primary.slug).uniq(&:id)
        brand = fetch_brand.call(row['brand'])

        image_bytes        = nil
        image_content_type = nil
        image_extension    = nil
        if row['image_url'].to_s.match?(%r{\Ahttps?://})
          begin
            image_bytes, image_content_type = fetch_image.call(row['image_url'])
            image_extension = case image_content_type
                              when %r{image/png}  then 'png'
                              when %r{image/webp} then 'webp'
                              when %r{image/gif}  then 'gif'
                              else 'jpg'
                              end
          rescue StandardError => e
            stats[:image_failures] += 1
            image_errors << "#{row['slug']}: #{e.class}: #{e.message}"
            puts "  ! image fetch failed for #{row['slug']}: #{e.class}: #{e.message}"
          end
        end

        targets.each do |product|
          Labor::ProductAccord.where(spree_product_id: product.id).delete_all
          Labor::ProductNote.where(spree_product_id: product.id).delete_all

          row['accords'].to_a.each do |a|
            accord = fetch_accord.call(a['name'])
            hex = a['color_hex'].to_s.downcase
            if hex.match?(/\A#[0-9a-f]{6}\z/) && accord.color_hex.to_s.downcase != hex
              if accord.color_hex.to_s.strip.empty? || accord.color_hex.to_s.downcase == '#999999'
                accord.update_column(:color_hex, hex)
                stats[:accord_colors_set] += 1
              end
            end
            Labor::ProductAccord.create!(
              spree_product_id: product.id,
              labor_accord_id:  accord.id,
              weight:           a['weight'].to_i.clamp(0, 100),
            )
            stats[:accord_links] += 1
          end

          notes_hash = row['notes'] || {}
          note_name_of = lambda { |n| n.is_a?(Hash) ? (n['name'] || n[:name]).to_s : n.to_s }
          note_icon_of = lambda { |n| n.is_a?(Hash) ? (n['icon_url'] || n[:icon_url]).to_s : '' }
          maybe_set_icon = lambda do |note, icon|
            note.update_column(:icon_url, icon) if icon.match?(%r{\Ahttps?://}) && note.icon_url.blank?
          end

          if notes_hash['flat']
            notes_hash['flat'].each_with_index do |n, idx|
              note = fetch_note.call(note_name_of.call(n))
              maybe_set_icon.call(note, note_icon_of.call(n))
              Labor::ProductNote.create!(
                spree_product_id: product.id,
                labor_note_id:    note.id,
                pyramid_layer:    'heart',
                position:         idx,
              )
              stats[:note_links] += 1
            end
          else
            %w[top heart base].each do |layer|
              Array(notes_hash[layer]).each_with_index do |n, idx|
                note = fetch_note.call(note_name_of.call(n))
                maybe_set_icon.call(note, note_icon_of.call(n))
                Labor::ProductNote.create!(
                  spree_product_id: product.id,
                  labor_note_id:    note.id,
                  pyramid_layer:    layer,
                  position:         idx,
                )
                stats[:note_links] += 1
              end
            end
          end

          detail = Labor::ProductFragranceDetail.find_or_initialize_by(spree_product_id: product.id)
          detail.release_year   = row['year'].to_i if row['year']
          detail.labor_brand_id = brand.id if brand
          detail.gender         = row['gender']        if valid_gender.include?(row['gender'])
          detail.concentration  = row['concentration'] if valid_concentration.include?(row['concentration'])
          detail.volume_ml      = row['volume_ml'].to_i if row['volume_ml'].to_i.positive?
          detail.avg_rating     = row['avg_rating']    if row['avg_rating'].is_a?(Numeric)
          detail.avg_longevity  = row['avg_longevity'] if row['avg_longevity'].is_a?(Numeric)
          detail.avg_sillage    = row['avg_sillage']   if row['avg_sillage'].is_a?(Numeric)
          detail.votes_count    = row['votes_count'].to_i if row['votes_count'].to_i.positive?
          seasons_payload, time_payload = normalize_seasons_time.call(row)
          detail.seasons_breakdown = seasons_payload if seasons_payload
          detail.time_breakdown    = time_payload    if time_payload
          detail.love_breakdown    = row['love']     if row['love'].is_a?(Hash)
          detail.save!

          Labor::ProductPerfumer.where(spree_product_id: product.id).delete_all
          Array(row['perfumers']).each do |raw|
            perfumer = fetch_perfumer.call(raw)
            next unless perfumer
            Labor::ProductPerfumer.create!(
              spree_product_id:  product.id,
              labor_perfumer_id: perfumer.id,
            )
            stats[:perfumer_links] += 1
          end

          if row['description_en'].present?
            Mobility.with_locale(:en) do
              product.update!(description: row['description_en'])
            end
          end

          if image_bytes
            master = product.master
            master.images.destroy_all
            new_image = master.images.new(position: 1)
            new_image.attachment.attach(
              io:           StringIO.new(image_bytes),
              filename:     "fragrantica-#{product.slug}.#{image_extension}",
              content_type: image_content_type,
            )
            new_image.save!
            stats[:images_replaced] += 1
          end

          stats[:products_updated] += 1
        end
      end
    end

    puts "Updated: #{stats[:products_updated]} products, #{stats[:accord_links]} accord links, " \
         "#{stats[:note_links]} note links, #{stats[:perfumer_links]} perfumer links, " \
         "#{stats[:accord_colors_set]} accord colors set, " \
         "#{stats[:images_replaced]} images replaced. " \
         "Skipped: #{stats[:skipped]}. Image failures: #{stats[:image_failures]}."
    if image_errors.any?
      puts 'Image errors:'
      image_errors.each { |e| puts "  - #{e}" }
    end
  end
end
