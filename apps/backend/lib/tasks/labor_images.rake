# frozen_string_literal: true

# labor:images:attach_le_labo — attach the four cached Le Labo PNGs that ship
# in apps/web/public/products to the corresponding Spree::Product rows (matched
# by brand=Le Labo + name pattern). Idempotent: skips any product that already
# has at least one image attached.
#
# labor:images:report — print per-product image attachment status so we can see
# the current image-coverage gap before/after a sync.
#
# Usage (from host):
#   docker cp apps/web/public/products labor-backend-1:/tmp/le_labo_images
#   docker exec labor-backend-1 bin/rake labor:images:attach_le_labo
#   docker exec labor-backend-1 bin/rake labor:images:report

namespace :labor do
  namespace :images do
    # slug-fragment in product name → image filename
    LE_LABO_MAP = {
      'bergamote 22' => 'bergamote-22.png',
      'santal 33'    => 'santal-33.png',
      'rose 31'      => 'rose-31.png',
      'the noir 29'  => 'the-noir-29.png',
      'thé noir 29'  => 'the-noir-29.png'
    }.freeze

    desc 'Attach cached Le Labo images to matching products (idempotent)'
    task attach_le_labo: :environment do
      image_dir = ENV['LE_LABO_IMAGE_DIR'] || '/tmp/le_labo_images'
      raise "image dir not found: #{image_dir}" unless Dir.exist?(image_dir)

      brand = Labor::Brand.find_by(slug: 'le-labo')
      raise 'Le Labo brand not found' unless brand

      products = Spree::Product
        .joins(:labor_fragrance_detail)
        .where(labor_product_fragrance_details: { labor_brand_id: brand.id })
        .to_a

      attached = 0
      skipped  = 0
      missing  = 0

      products.each do |product|
        name = product.name.to_s.downcase
        match = LE_LABO_MAP.find { |needle, _| name.include?(needle) }
        unless match
          missing += 1
          puts "  · no image match for #{product.id} #{product.name.inspect}"
          next
        end

        image_path = File.join(image_dir, match.last)
        unless File.exist?(image_path)
          missing += 1
          puts "  · matched name but file missing: #{image_path}"
          next
        end

        master = product.master
        if master.images.any?
          skipped += 1
          puts "  = already has #{master.images.size} image(s): #{product.id} #{product.name}"
          next
        end

        image = master.images.new
        image.attachment.attach(
          io: File.open(image_path, 'rb'),
          filename: match.last,
          content_type: 'image/png'
        )
        image.save!
        attached += 1
        puts "  + attached #{match.last} → #{product.id} #{product.name}"
      end

      puts ''
      puts "DONE  attached=#{attached}  skipped(existing)=#{skipped}  unmatched=#{missing}  total_le_labo=#{products.size}"
    end

    # Manifest-driven bulk attach. Reads db/data/product_image_manifest.json
    # which is a JSON array of {product_id, fragrantica_id, name?}. For each
    # entry we hit fimgs.net's open CDN twice — thumb (375x500.{id}.jpg) for
    # the card view and the original (o.{id}.jpg) for the detail-page hero —
    # then attach both as Spree::Image rows on the master variant. Idempotent:
    # skip a product if it already has any image attached.
    desc 'Attach product images from fimgs.net via the JSON manifest'
    task attach_from_fimgs: :environment do
      require 'net/http'
      require 'uri'
      require 'json'

      manifest_path = ENV['MANIFEST'] || Rails.root.join('db', 'data', 'product_image_manifest.json')
      raise "manifest not found: #{manifest_path}" unless File.exist?(manifest_path)

      manifest = JSON.parse(File.read(manifest_path))
      raise 'manifest must be a JSON array' unless manifest.is_a?(Array)

      attached = 0
      skipped  = 0
      missing  = []
      failed   = []

      manifest.each do |row|
        pid = row['product_id']
        fid = row['fragrantica_id']
        unless pid && fid
          failed << "bad row: #{row.inspect}"
          next
        end

        product = Spree::Product.find_by(id: pid)
        unless product
          missing << pid
          puts "  · product not found: #{pid}"
          next
        end

        master = product.master
        if master.images.any?
          skipped += 1
          puts "  = #{pid} already has #{master.images.size} image(s) — skip (#{product.name})"
          next
        end

        urls = [
          ["https://fimgs.net/mdimg/perfume/o.#{fid}.jpg",        "fimgs-#{fid}-orig"],
          ["https://fimgs.net/mdimg/perfume/375x500.#{fid}.jpg",  "fimgs-#{fid}-thumb"]
        ]

        urls.each do |url, name|
          begin
            body, content_type = fetch_image(url)
            ext = case content_type
                  when %r{image/png}  then 'png'
                  when %r{image/webp} then 'webp'
                  else 'jpg'
                  end
            image = master.images.new
            image.attachment.attach(
              io: StringIO.new(body),
              filename: "#{name}.#{ext}",
              content_type: content_type
            )
            image.save!
            attached += 1
            puts "  + attached #{name}.#{ext} (#{body.bytesize} bytes) → #{pid} #{product.name}"
          rescue => e
            failed << "#{pid}/#{fid} #{url} :: #{e.class}: #{e.message}"
            puts "  ! failed #{pid} #{url} :: #{e.message}"
          end
        end
      end

      puts ''
      puts "DONE  attached_images=#{attached}  products_skipped=#{skipped}  unknown_products=#{missing.size}  failures=#{failed.size}"
      failed.first(10).each { |f| puts "    · #{f}" }
    end

    # Tiny resilient fetch — no third-party HTTP gem dependency.
    # Follows up to 3 redirects, raises on non-200, returns [bytes, content_type].
    def fetch_image(url, max_redirects: 3)
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

    # Source-agnostic gallery attacher. Reads a JSON manifest of
    # [{product_id, gallery_urls: [url, ...]}, ...], downloads each URL, and
    # attaches the image to the product's master variant — but only if the
    # filename derived from the URL isn't already attached. This keeps the task
    # idempotent across re-runs AND across switching sources (fimgs variants
    # today, parfumo photos tomorrow). Stops adding once the product has
    # MAX_IMAGES total images (default 6 — main + thumb + up to 4 extras).
    desc 'Attach gallery images from a JSON manifest of {product_id, gallery_urls}'
    task attach_gallery: :environment do
      require 'json'

      manifest_path = ENV['MANIFEST'] || Rails.root.join('tmp', 'gallery_harvest.json')
      raise "manifest not found: #{manifest_path}" unless File.exist?(manifest_path)

      max_images = (ENV['MAX_IMAGES'] || 6).to_i
      manifest   = JSON.parse(File.read(manifest_path))
      raise 'manifest must be a JSON array' unless manifest.is_a?(Array)

      # Dedupe by product_id, merging gallery_urls (preserve order, drop dups)
      merged = {}
      manifest.each do |row|
        pid = row['product_id']
        next unless pid
        urls = Array(row['gallery_urls'])
        bucket = merged[pid] ||= []
        urls.each { |u| bucket << u unless bucket.include?(u) }
      end

      added    = 0
      capped   = 0
      missing  = []
      failed   = []

      merged.each do |pid, urls|
        product = Spree::Product.find_by(id: pid)
        unless product
          missing << pid
          next
        end

        master       = product.master
        existing     = master.images.includes(:attachment_attachment).to_a
        existing_set = existing.flat_map do |img|
          fn = img.attachment&.filename&.to_s
          fn ? [fn, File.basename(fn, '.*')] : []
        end.to_set

        urls.each do |url|
          if master.images.count >= max_images
            capped += 1
            break
          end

          base_name = derived_filename_for(url)
          if existing_set.include?(base_name) || existing_set.include?(File.basename(base_name, '.*'))
            next
          end

          begin
            body, content_type = fetch_image(url)
            ext = case content_type
                  when %r{image/png}  then 'png'
                  when %r{image/webp} then 'webp'
                  else 'jpg'
                  end
            filename = base_name.end_with?(".#{ext}") ? base_name : "#{File.basename(base_name, '.*')}.#{ext}"
            image = master.images.new
            image.attachment.attach(
              io: StringIO.new(body),
              filename: filename,
              content_type: content_type
            )
            image.save!
            existing_set << filename
            existing_set << File.basename(filename, '.*')
            added += 1
            puts "  + #{pid} attached #{filename} (#{body.bytesize}B)"
          rescue => e
            failed << "#{pid} #{url} :: #{e.class}: #{e.message}"
            puts "  ! #{pid} failed #{url} :: #{e.message}"
          end
        end
      end

      puts ''
      puts "DONE  added=#{added}  cap_reached_skips=#{capped}  unknown_products=#{missing.size}  failures=#{failed.size}"
      failed.first(10).each { |f| puts "    · #{f}" }
    end

    # Derive a stable, descriptive filename from a CDN URL so the idempotency
    # check has something to match against. For fimgs: `375x500.22528.2x.jpg`
    # → `fimgs-22528-thumb-2x.jpg`. For parfumo and others: fall back to the
    # URL's basename (path-segments deduplicated).
    def derived_filename_for(url)
      uri = URI.parse(url)
      path = uri.path.to_s
      case path
      when %r{/mdimg/perfume-thumbs/dark-375x500\.(\d+)\.2x\.jpg}i
        "fimgs-#{Regexp.last_match(1)}-dark-2x.jpg"
      when %r{/mdimg/perfume-thumbs/dark-375x500\.(\d+)\.jpg}i
        "fimgs-#{Regexp.last_match(1)}-dark.jpg"
      when %r{/mdimg/perfume-thumbs/375x500\.(\d+)\.2x\.jpg}i
        "fimgs-#{Regexp.last_match(1)}-thumb-2x.jpg"
      when %r{/mdimg/perfume/social\.(\d+)\.jpg}i
        "fimgs-#{Regexp.last_match(1)}-social.jpg"
      else
        # Generic: <last 2 path segments joined with -, sans ext>
        File.basename(path)
      end
    end

    # Attach generated images from a local directory (by product slug)
    desc 'Attach generated product images (idempotent)'
    task attach_generated: :environment do
      image_dir = ENV['IMAGE_DIR'] || Rails.root.join('..', 'web', 'public', 'products')
      raise "image dir not found: #{image_dir}" unless Dir.exist?(image_dir)

      puts "Scanning #{image_dir} for product images..."

      attached = 0
      skipped  = 0
      missing  = 0

      Dir.glob(File.join(image_dir, '*')).each do |path|
        next if File.directory?(path)
        
        filename = File.basename(path)
        
        # Check if this is a gallery image
        is_gallery = filename.end_with?('-gallery.png') || filename.end_with?('-gallery.jpg') || filename.end_with?('-gallery.jpeg') || filename.end_with?('-gallery.webp')
        
        slug = if is_gallery
                 File.basename(path, '.*').sub(/-gallery\z/, '')
               else
                 File.basename(path, '.*')
               end

        # Handle Le Labo brand name suffix checks
        product = Spree::Product.find_by(slug: slug)
        unless product
          missing += 1
          puts "  · no matching product found for slug: #{slug} (#{filename})"
          next
        end

        master = product.master
        
        # Check if this specific filename is already attached
        existing_image = master.images.includes(:attachment_attachment).detect do |img|
          img.attachment&.filename&.to_s == filename
        end
        
        if existing_image
          skipped += 1
          puts "  = already has #{filename} attached — skip"
          next
        end

        position = is_gallery ? 2 : 1
        
        # If we are attaching a primary image (position 1) and there is an existing image
        # with the same slug name but without the "-gallery" suffix, we want to rename
        # that old image to <slug>-gallery.png and set its position to 2.
        if !is_gallery
          old_primary = master.images.detect { |img| img.attachment&.filename&.to_s == "#{slug}.png" }
          if old_primary
            puts "  ~ renaming old primary image #{old_primary.attachment.filename} to #{slug}-gallery.png and setting position to 2"
            old_primary.attachment.blob.update!(filename: "#{slug}-gallery.png")
            old_primary.update!(position: 2)
          end
        end

        ext = File.extname(filename).downcase.delete('.')
        content_type = case ext
                       when 'png'  then 'image/png'
                       when 'webp' then 'image/webp'
                       when 'jpg', 'jpeg' then 'image/jpeg'
                       else 'application/octet-stream'
                       end

        begin
          image = master.images.new(position: position)
          image.attachment.attach(
            io: File.open(path, 'rb'),
            filename: filename,
            content_type: content_type
          )
          image.save!
          attached += 1
          puts "  + attached #{filename} as position #{position} → #{product.id} #{product.name}"
        rescue => e
          puts "  ! failed to attach #{filename}: #{e.class}: #{e.message}"
        end
      end

      puts ''
      puts "DONE  attached=#{attached}  skipped=#{skipped}  unmatched_files=#{missing}"
    end

    # Attach exactly ONE image per parfum from fimgs.net, HD-preferred.
    # For each imageless manifest product:
    #   1. Fetch o.{fid}.jpg (max CDN res), attach, blob.analyze for dimensions.
    #   2. If it passes Labor::CatalogImageQuality (≥600×800, 0.75±0.12 ratio): keep it. Done.
    #   3. Else (404 or below quality gate): destroy the orig attempt, fetch the deterministic
    #      375x500.{fid}.2x.jpg retina fallback (750×1000), attach, flag below-standard, and
    #      append a row to /tmp/harvest_image_updates.jsonl for later replacement.
    #
    # Exactly ONE Spree::Image per master variant either way.
    # Idempotent: skips products that already have any image attached.
    # Requires blob.analyze — needs ImageMagick or libvips in the container.
    #
    # Usage:
    #   docker exec labor-backend-1 bundle exec rake labor:images:attach_one_from_fimgs
    desc 'Attach one HD image per parfum from fimgs.net; fall back to 375x500@2x below quality gate'
    task attach_one_from_fimgs: :environment do
      require 'json'
      require 'stringio'

      manifest_path = ENV['MANIFEST'] || Rails.root.join('db/data/product_image_manifest.json')
      updates_path  = ENV.fetch('UPDATES_FILE', '/tmp/harvest_image_updates.jsonl')

      raise "Manifest not found: #{manifest_path}" unless File.exist?(manifest_path)

      manifest = JSON.parse(File.read(manifest_path))
      raise 'Manifest must be a JSON array' unless manifest.is_a?(Array)

      attached_hd = 0
      attached_2x = 0
      skipped     = 0
      missing     = []
      failed      = []

      File.open(updates_path, 'a') do |updates_file|
        manifest.each do |row|
          pid = row['product_id']
          fid = row['fragrantica_id']

          unless pid && fid
            failed << "bad manifest row: #{row.inspect}"
            next
          end

          product = Spree::Product.find_by(id: pid)
          unless product
            missing << pid
            puts "  · product_id=#{pid} not found"
            next
          end

          master = product.master
          if master.images.any?
            skipped += 1
            puts "  = #{pid} already has #{master.images.size} image(s) — skip (#{product.name})"
            next
          end

          orig_url     = "https://fimgs.net/mdimg/perfume/o.#{fid}.jpg"
          fallback_url = "https://fimgs.net/mdimg/perfume/375x500.#{fid}.jpg"
          orig_ok      = false

          # ── Step 1: try the HD original ───────────────────────────────────────────
          begin
            body, content_type = fetch_image(orig_url)
            ext = case content_type
                  when %r{image/png}  then 'png'
                  when %r{image/webp} then 'webp'
                  else 'jpg'
                  end

            image = master.images.new(position: 1)
            image.attachment.attach(
              io:           StringIO.new(body),
              filename:     "fimgs-#{fid}-orig.#{ext}",
              content_type: content_type
            )
            image.save!

            blob = image.attachment.blob
            begin
              blob.analyze
            rescue StandardError => analyze_err
              warn "    blob.analyze failed #{pid}/#{fid}: #{analyze_err.message}"
            end

            quality = Labor::CatalogImageQuality.call(blob)

            if quality[:status] == 'suitable'
              orig_ok = true
              attached_hd += 1
              puts "  + #{pid} HD #{quality[:width]}x#{quality[:height]} → #{product.name}"
            else
              image.destroy!
              raise "below-gate: #{quality[:reasons].join(', ')} " \
                    "(#{quality[:width].inspect}x#{quality[:height].inspect})"
            end
          rescue StandardError => orig_err
            unless orig_err.message.start_with?('below-gate')
              warn "    orig failed #{pid}/#{fid}: #{orig_err.message.first(100)}"
            end
          end

          next if orig_ok

          # ── Step 2: fall back to 375x500.{fid}.2x.jpg (750×1000 retina) ──────────
          begin
            body, content_type = fetch_image(fallback_url)
            ext = case content_type
                  when %r{image/png}  then 'png'
                  when %r{image/webp} then 'webp'
                  else 'jpg'
                  end

            image = master.images.new(position: 1)
            image.attachment.attach(
              io:           StringIO.new(body),
              filename:     "fimgs-#{fid}-thumb.#{ext}",
              content_type: content_type
            )
            image.save!

            blob = image.attachment.blob
            begin
              blob.analyze
            rescue StandardError => analyze_err
              warn "    blob.analyze failed #{pid}/#{fid} (fallback): #{analyze_err.message}"
            end

            quality = Labor::CatalogImageQuality.call(blob)

            attached_2x += 1
            puts "  ~ #{pid} fallback 2x (below standard) → #{product.name}"

            updates_file.puts JSON.generate(
              product_id:   pid,
              fid:          fid,
              slug:         product.slug,
              catalog_name: product.name,
              current_image: fallback_url,
              image_quality: quality,
              instruction:  'replace with high-res when available'
            )
            updates_file.flush
          rescue StandardError => e2
            failed << "#{pid}/#{fid}: #{e2.class}: #{e2.message}"
            puts "  ! #{pid}/#{fid} both URLs failed: #{e2.class}: #{e2.message}"
          end
        end
      end

      puts ''
      puts "DONE  attached_hd=#{attached_hd}  attached_2x_fallback=#{attached_2x}  " \
           "skipped_existing=#{skipped}  unknown_products=#{missing.size}  failures=#{failed.size}"
      puts "Below-standard queue: #{updates_path}  (#{attached_2x} row(s))"
      failed.first(10).each { |f| puts "    · #{f}" }
      puts "  Not found in DB (#{missing.size}): #{missing.first(10).join(', ')}" if missing.any?
    end

    desc 'Report image attachment status across products'
    task report: :environment do
      total = Spree::Product.count
      master_ids_with_images = Spree::Image
        .where(viewable_type: 'Spree::Variant')
        .distinct.pluck(:viewable_id)
      with_images = Spree::Variant
        .where(id: master_ids_with_images, is_master: true)
        .distinct.count(:product_id)
      without_images = total - with_images
      puts "products with images:    #{with_images}"
      puts "products without images: #{without_images}"
      puts "total products:          #{total}"

      brand = Labor::Brand.find_by(slug: 'le-labo')
      if brand
        ll_product_ids = Spree::Product
          .joins(:labor_fragrance_detail)
          .where(labor_product_fragrance_details: { labor_brand_id: brand.id })
          .pluck(:id)
        ll_with = Spree::Variant
          .where(product_id: ll_product_ids, is_master: true, id: master_ids_with_images)
          .distinct.count(:product_id)
        puts "le-labo products:        #{ll_product_ids.size}  with_images=#{ll_with}"
      end
    end

    desc 'Delete a Spree image by id. Usage: rake "labor:images:delete[123]"'
    task :delete, [:id] => :environment do |_, args|
      id = Integer(args[:id] || ENV['ID'] || abort('pass image id (ID=... or [id])'))
      img = Spree::Image.find(id)
      v = img.viewable
      img.destroy!
      puts "deleted image_id=#{id} from viewable=#{v.class}##{v.id}"
    end

    # Shared product lookup for tasks that take a [:slug] arg. Centralizes the
    # `friendly`/`find_by!` boilerplate so behavior stays consistent.
    def lookup_product(slug)
      Spree::Product.find_by!(slug: slug)
    end

    desc 'List images for a product slug. Usage: rake "labor:images:list[ganymede]"'
    task :list, [:slug] => :environment do |_, args|
      slug = args[:slug] || ENV['SLUG'] || abort('pass product slug (SLUG=... or [slug])')
      p = lookup_product(slug)
      p.master.images.order(:position).each do |img|
        blob = img.attachment.attached? ? img.attachment.blob : nil
        fname = blob&.filename&.to_s || '(no blob)'
        size  = blob ? "#{(blob.byte_size / 1024.0).round}KB" : '-'
        key   = img.try(:key) || '-'
        puts "id=#{img.id} pos=#{img.position} key=#{key} file=#{fname} size=#{size} alt=#{img.alt.inspect}"
      end
    end

    desc 'Promote an image to main (position=1). Usage: rake "labor:images:set_main[ganymede,1907]"'
    task :set_main, [:slug, :id] => :environment do |_, args|
      slug = args[:slug] || ENV['SLUG'] || abort('pass product slug')
      id   = Integer(args[:id] || ENV['ID'] || abort('pass image id'))
      p = lookup_product(slug)
      target = p.master.images.find(id)
      # Use update! inside a transaction so counter caches (media_count) and
      # any after_save reindex callbacks fire — update_column bypasses both.
      ActiveRecord::Base.transaction do
        p.master.images.where.not(id: id).order(:position).each_with_index do |img, i|
          img.update!(position: i + 2)
        end
        target.update!(position: 1)
      end
      puts "image #{id} is now main for #{slug}"
      p.master.images.order(:position).pluck(:id, :position).each { |row| puts row.inspect }
    end
  end
end
