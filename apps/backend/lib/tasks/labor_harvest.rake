namespace :labor do
  namespace :harvest do
    desc 'Fetch and parse explicit fragrance URLs. Usage: URLS="https://..." bundle exec rake labor:harvest:fetch_parse'
    task fetch_parse: :environment do
      urls = ENV.fetch('URLS', '').split(/\s*,\s*/).reject(&:blank?)
      abort 'Set URLS to a comma-separated list of explicit fragrance URLs' if urls.empty?

      urls.each do |url|
        result = Labor::Harvest::FetchAndParse.new(source_url: url).call
        puts JSON.generate(
          url: url,
          raw_html_path: result.raw_html_path,
          staging_json_path: result.staging_json_path,
          found_fields: result.payload.dig(:parse_quality, :found_fields),
          missing_fields: result.payload.dig(:parse_quality, :missing_fields)
        )
      rescue Labor::Harvest::PoliteFetcher::RobotsDeniedError, Labor::Harvest::PoliteFetcher::BlockedSourceError => e
        warn JSON.generate(url: url, status: 'stopped', error: e.message)
      rescue StandardError => e
        warn JSON.generate(url: url, status: 'failed', error: e.message)
      end
    end

    desc 'Parse a saved raw harvest document without fetching. Usage: RAW_HTML_PATH=... bundle exec rake labor:harvest:parse_raw'
    task parse_raw: :environment do
      html_path = ENV.fetch('RAW_HTML_PATH')
      metadata_path = ENV.fetch('RAW_METADATA_PATH', html_path.sub(/\.html\z/, '.json'))
      result = Labor::Harvest::ParseRawDocument.new(
        raw_html_path: html_path,
        raw_metadata_path: metadata_path
      ).call

      puts JSON.generate(
        raw_html_path: html_path,
        staging_json_path: result.staging_json_path,
        found_fields: result.payload.dig(:parse_quality, :found_fields),
        missing_fields: result.payload.dig(:parse_quality, :missing_fields)
      )
    end

    # Build /tmp/harvest_urls.jsonl by resolving each manifest fragrantica_id to its
    # canonical Fragrantica URL. Looks up each product_id in the DB to get the brand name
    # and product name, then slugifies both. The URL is a best-guess from slugification —
    # some will 404 on fetch (Fragrantica's exact slug may differ); run_batch logs those as
    # not_found. No network calls here.
    #
    # Usage:
    #   docker exec labor-backend-1 bundle exec rake labor:harvest:resolve_urls
    #   docker exec labor-backend-1 bundle exec rake "labor:harvest:resolve_urls[OUTPUT=/tmp/urls.jsonl]"
    desc 'Resolve manifest fragrantica_ids to Fragrantica URLs. Output: /tmp/harvest_urls.jsonl'
    task resolve_urls: :environment do
      require 'json'

      manifest_path = Rails.root.join('db/data/product_image_manifest.json')
      output_path   = ENV.fetch('OUTPUT', '/tmp/harvest_urls.jsonl')

      abort "Manifest not found: #{manifest_path}" unless File.exist?(manifest_path)

      manifest = JSON.parse(File.read(manifest_path))

      # Transliterate + ASCII-slugify: é→e, ñ→n, etc., then collapse non-alnum to hyphens.
      # Matches Fragrantica's convention for the vast majority of brand/product names.
      slugify = lambda do |text|
        ActiveSupport::Inflector.transliterate(text.to_s)
          .gsub(/[^a-zA-Z0-9]+/, '-')
          .gsub(/-+/, '-')
          .gsub(/\A-|-\z/, '')
      end

      resolved = 0
      skipped  = 0

      File.open(output_path, 'w') do |f|
        manifest.each do |row|
          pid = row['product_id']
          fid = row['fragrantica_id']

          unless pid && fid
            skipped += 1
            next
          end

          product = Spree::Product.find_by(id: pid)
          unless product
            skipped += 1
            warn "  · product_id=#{pid} not found in DB"
            next
          end

          brand_name   = product.labor_fragrance_detail&.brand&.name.to_s.strip
          product_name = product.name.to_s.strip

          # Fragrantica URL pattern: /perfume/{BrandSlug}/{ProductWithoutBrand}-{fid}.html
          # Catalog stores names as "{Brand} {Product Name}" → strip the brand prefix to get
          # the Fragrantica product-name portion (e.g. "Hugo Boss Boss Bottled" → "Boss Bottled").
          frag_product = product_name.sub(/\A#{Regexp.escape(brand_name)}\s*/i, '').strip
          # Fallback: if brand not found in name, use the full product name as the slug
          frag_product = product_name if frag_product.empty?

          brand_slug   = slugify.call(brand_name.presence || 'unknown')
          product_slug = slugify.call(frag_product)
          url          = "https://www.fragrantica.com/perfume/#{brand_slug}/#{product_slug}-#{fid}.html"

          f.puts JSON.generate(
            product_id:   pid,
            fid:          fid,
            slug:         product.slug,
            catalog_name: product_name,
            brand_name:   brand_name,
            url:          url
          )
          resolved += 1
        end
      end

      puts "DONE  resolved=#{resolved}  skipped_missing=#{skipped}  output=#{output_path}"
      puts '      NOTE: URLs are best-guess slugs — run_batch logs 404s as not_found.'
    end

    # Drive a polite batch harvest over a JSONL URL file produced by resolve_urls.
    # For each URL it calls FetchAndParse (PoliteFetcher → RawDocumentStore → FragranticaParser v2
    # → StageWriter). Writes per-URL status rows to a status JSONL file so the task is resumable:
    # re-running the same command skips already-done/stopped URLs.
    #
    # Harvest Policy (docs/plans/catalog-image-rules.md): polite access only. On BlockedSourceError
    # or RobotsDeniedError, record status: stopped and continue to the next URL — never bypass.
    #
    # Usage:
    #   docker exec labor-backend-1 bundle exec rake "labor:harvest:run_batch[URLS=@/tmp/harvest_urls.jsonl]"
    #   # Or via ENV:
    #   docker exec -e URLS=@/tmp/harvest_urls.jsonl labor-backend-1 bundle exec rake labor:harvest:run_batch
    desc 'Batch-fetch URLs from a JSONL file. Usage: URLS=@/tmp/harvest_urls.jsonl'
    task run_batch: :environment do
      require 'json'
      require 'set'

      urls_input = (ENV['URLS'] || '').strip
      abort 'Set URLS=@/path/to/urls.jsonl' if urls_input.empty?

      urls_file = urls_input.sub(/\A@/, '')
      abort "URLS file not found: #{urls_file}" unless File.exist?(urls_file)

      status_file = ENV.fetch('STATUS_FILE', '/tmp/harvest_run_status.jsonl')

      # Load already-processed URLs so re-runs skip them (resumability).
      done_urls = Set.new
      if File.exist?(status_file)
        File.foreach(status_file) do |line|
          row = JSON.parse(line.chomp) rescue next
          done_urls << row['url'] if %w[done stopped].include?(row['status'])
        end
        puts "  Resuming — #{done_urls.size} URL(s) already in status file."
      end

      stats = { done: 0, blocked: 0, failed: 0, skipped: 0 }

      File.open(status_file, 'a') do |sf|
        File.foreach(urls_file) do |line|
          row = JSON.parse(line.chomp) rescue next
          url  = row['url']
          pid  = row['product_id']
          fid  = row['fid']
          slug = row['slug']

          if done_urls.include?(url)
            stats[:skipped] += 1
            next
          end

          begin
            result = Labor::Harvest::FetchAndParse.new(source_url: url).call
            sf.puts JSON.generate(
              url:               url,
              product_id:        pid,
              fid:               fid,
              slug:              slug,
              status:            'done',
              staging_json_path: result.staging_json_path.to_s,
              found_fields:      result.payload.dig(:parse_quality, :found_fields),
              missing_fields:    result.payload.dig(:parse_quality, :missing_fields)
            )
            sf.flush
            stats[:done] += 1
            puts "  ✓ #{pid} (#{slug}) → #{result.payload[:brand_name]} #{result.payload[:product_name]}"
          rescue Labor::Harvest::PoliteFetcher::RobotsDeniedError,
                 Labor::Harvest::PoliteFetcher::BlockedSourceError => e
            sf.puts JSON.generate(
              url:        url,
              product_id: pid,
              fid:        fid,
              slug:       slug,
              status:     'stopped',
              error:      e.message
            )
            sf.flush
            stats[:blocked] += 1
            warn "  ✗ BLOCKED #{pid} (#{slug}): #{e.message}"
            # Harvest Policy: record stopped, continue to next URL — never bypass.
          rescue StandardError => e
            sf.puts JSON.generate(
              url:        url,
              product_id: pid,
              fid:        fid,
              slug:       slug,
              status:     'failed',
              error:      "#{e.class}: #{e.message}"
            )
            sf.flush
            stats[:failed] += 1
            warn "  ! #{pid} (#{slug}): #{e.class}: #{e.message}"
          end
        end
      end

      puts "DONE  done=#{stats[:done]}  blocked=#{stats[:blocked]}  failed=#{stats[:failed]}" \
           "  skipped_resumed=#{stats[:skipped]}"
      puts "Status file: #{status_file}"
      if stats[:blocked].positive?
        puts "  NOTE: #{stats[:blocked]} URL(s) stopped by polite-access block. " \
             'Re-run the same command to resume — done URLs are skipped.'
      end
    end

    # Read every staged JSON from storage/harvest/staging/www.fragrantica.com/*.json,
    # extract the fragrantica_id from the source_url, look up the matching product slug
    # via the manifest, and assemble an array of ingest-row objects that
    # labor:ingest_fragrantica_harvest can consume directly.
    #
    # Key mapping (parser output → ingest input):
    #   main_accords  → accords (color_hex: nil, weight kept as float — ingest does .to_i)
    #   notes_top/heart/base → notes.top/heart/base
    #   seasons_breakdown / time_breakdown / love_breakdown → seasons / time / love
    #   perfumer_names → perfumers
    #   source_description_raw → description_en (RAW — REWRITE REQUIRED before publishing)
    #   image_url: '' — images go through a separate analyze-gated task (Phase 5)
    #
    # Deduplicates: if multiple staged JSONs share the same fid, the latest (alphabetically
    # last fingerprint) wins. Logs every fid with no manifest match.
    #
    # Usage:
    #   docker exec labor-backend-1 bundle exec rake labor:harvest:build_ingest_file
    desc 'Assemble /tmp/fragrantica_harvest.json from staged harvest JSONs'
    task build_ingest_file: :environment do
      require 'json'

      staging_dir   = Rails.root.join('storage/harvest/staging/www.fragrantica.com')
      manifest_path = Rails.root.join('db/data/product_image_manifest.json')
      output_path   = ENV.fetch('OUTPUT', '/tmp/fragrantica_harvest.json')

      unless Dir.exist?(staging_dir)
        abort "Staging dir not found: #{staging_dir} — run labor:harvest:run_batch first"
      end
      abort "Manifest not found: #{manifest_path}" unless File.exist?(manifest_path)

      manifest = JSON.parse(File.read(manifest_path))

      # Build fid (String) → {product_id, slug} lookup using live product slugs from the DB.
      fid_to_meta = {}
      manifest.each do |row|
        fid = row['fragrantica_id']&.to_s
        pid = row['product_id']
        next unless fid && pid

        product = Spree::Product.find_by(id: pid)
        next unless product

        next if fid_to_meta[fid] # first match wins — canonical product appears first in manifest

        fid_to_meta[fid] = { product_id: pid, slug: product.slug }
      end

      # Collect staged JSONs, deduplicate per fid (last file wins — alphabetically latest
      # fingerprint corresponds to a re-parse of the same content, never stale data).
      fid_to_staging_path = {}
      Dir.glob(staging_dir.join('*.json')).sort.each do |path|
        begin
          payload  = JSON.parse(File.read(path), symbolize_names: false)
          src_url  = payload['source_url'].to_s
          fid      = src_url[/-(\d+)\.html\z/, 1]
          next unless fid

          fid_to_staging_path[fid] = path
        rescue JSON::ParserError => e
          warn "  · skipping malformed staging JSON #{path}: #{e.message}"
        end
      end

      rows    = []
      skipped = 0

      fid_to_staging_path.each do |fid, path|
        meta = fid_to_meta[fid]
        unless meta
          skipped += 1
          warn "  · fid=#{fid} has no manifest match (path=#{File.basename(path)})"
          next
        end

        slug = meta[:slug]
        unless slug
          skipped += 1
          warn "  · fid=#{fid} product has no slug"
          next
        end

        payload = JSON.parse(File.read(path), symbolize_names: false)

        accords = Array(payload['main_accords']).map do |a|
          { 'name' => a['name'], 'weight' => a['weight'], 'color_hex' => nil }
        end

        rows << {
          'slug'          => slug,
          'not_found'     => false,
          'brand'         => payload['brand_name'],
          'image_url'     => '',
          'accords'       => accords,
          'notes'         => {
            'top'   => Array(payload['notes_top']),
            'heart' => Array(payload['notes_heart']),
            'base'  => Array(payload['notes_base'])
          },
          'year'          => payload['release_year'],
          'gender'        => payload['gender'],
          'concentration' => payload['concentration'],
          'volume_ml'     => nil,
          'avg_rating'    => payload['avg_rating'],
          'avg_longevity' => payload['avg_longevity'],
          'avg_sillage'   => payload['avg_sillage'],
          'votes_count'   => payload['votes_count'],
          'seasons'       => payload['seasons_breakdown'],
          'time'          => payload['time_breakdown'],
          'love'          => payload['love_breakdown'],
          'perfumers'     => Array(payload['perfumer_names']),
          'description_en' => payload['source_description_raw']
        }
      end

      File.write(output_path, JSON.pretty_generate(rows))

      puts "DONE  rows=#{rows.size}  skipped_no_match=#{skipped}  output=#{output_path}"
      puts '  ⚠  description_en fields contain raw source copy — rewrite required before publishing.'
      puts "  ⚠  Ingest: bundle exec rake labor:ingest_fragrantica_harvest HARVEST_FILE=#{output_path}"
    end

    # Compare each harvested product_name + brand_name (from staged JSONs) against the
    # catalog product.name stored in the DB. When they differ beyond whitespace/case
    # normalization, write a correction row. NO DB writes — output is a review list only.
    #
    # The comparison strips the brand prefix from both sides before comparing, so a catalog
    # name of "Hugo Boss Boss Bottled" and a Fragrantica name of "Boss Bottled" are treated
    # as equal after normalization.
    #
    # Output row: {product_id, slug, your_name, fragrantica_name, brand, fid, url}
    #
    # Usage:
    #   docker exec labor-backend-1 bundle exec rake labor:harvest:name_diff_report
    desc 'Diff catalog names vs Fragrantica canonical names (read-only). Output: /tmp/name_corrections.jsonl'
    task name_diff_report: :environment do
      require 'json'

      staging_dir   = Rails.root.join('storage/harvest/staging/www.fragrantica.com')
      manifest_path = Rails.root.join('db/data/product_image_manifest.json')
      output_path   = ENV.fetch('OUTPUT', '/tmp/name_corrections.jsonl')

      unless Dir.exist?(staging_dir)
        abort "Staging dir not found: #{staging_dir} — run labor:harvest:run_batch first"
      end
      abort "Manifest not found: #{manifest_path}" unless File.exist?(manifest_path)

      manifest = JSON.parse(File.read(manifest_path))

      # Build fid → {product_id, slug, catalog_name} from the live DB.
      fid_to_catalog = {}
      manifest.each do |row|
        fid = row['fragrantica_id']&.to_s
        pid = row['product_id']
        next unless fid && pid

        product = Spree::Product.find_by(id: pid)
        next unless product

        fid_to_catalog[fid] = {
          product_id:   pid,
          slug:         product.slug,
          catalog_name: product.name.to_s
        }
      end

      # Normalise for comparison: lowercase, strip accents, collapse non-alnum to single space.
      normalize = lambda do |text|
        ActiveSupport::Inflector.transliterate(text.to_s)
          .downcase
          .gsub(/[^a-z0-9]+/, ' ')
          .strip
          .split
          .join(' ')
      end

      corrections = []

      Dir.glob(staging_dir.join('*.json')).sort.each do |path|
        begin
          payload    = JSON.parse(File.read(path), symbolize_names: false)
          source_url = payload['source_url'].to_s
          fid        = source_url[/-(\d+)\.html\z/, 1]
          next unless fid && fid_to_catalog.key?(fid)

          meta           = fid_to_catalog[fid]
          catalog_name   = meta[:catalog_name]
          brand_name     = payload['brand_name'].to_s
          frag_name      = payload['product_name'].to_s

          # Strip the brand prefix from the product-name portion before comparing.
          # Both sides may or may not include the brand as a prefix.
          strip_brand = lambda do |name|
            name.sub(/\A#{Regexp.escape(brand_name)}\s*/i, '').strip
          end

          catalog_norm = normalize.call(strip_brand.call(catalog_name))
          frag_norm    = normalize.call(strip_brand.call(frag_name))

          next if catalog_norm == frag_norm

          corrections << {
            'product_id'       => meta[:product_id],
            'slug'             => meta[:slug],
            'your_name'        => catalog_name,
            'fragrantica_name' => [brand_name, frag_name].reject(&:empty?).join(' '),
            'brand'            => brand_name,
            'fid'              => fid.to_i,
            'url'              => source_url
          }
        rescue JSON::ParserError => e
          warn "  · skipping malformed staging JSON #{path}: #{e.message}"
        end
      end

      File.open(output_path, 'w') do |f|
        corrections.each { |row| f.puts JSON.generate(row) }
      end

      puts "DONE  mismatches=#{corrections.size}  output=#{output_path}"
      puts '  No DB writes made — review the file and rename manually if corrections are right.'
    end
  end
end
