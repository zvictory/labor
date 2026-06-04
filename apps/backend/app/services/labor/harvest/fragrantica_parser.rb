require 'json'
require 'nokogiri'
require 'uri'

module Labor
  module Harvest
    class FragranticaParser
      SCHEMA_VERSION = 2
      REQUIRED_QUALITY_FIELDS = %w[
        brand_name product_name concentration gender release_year perfumer_names
        notes_top notes_heart notes_base main_accords source_description_raw
      ].freeze

      # Weighted-average scale maps for Fragrantica vote bars.
      # The bar widths are % of total voters per tier; the scale value weights them.
      LONGEVITY_SCALE = {
        'poor' => 1, 'weak' => 2, 'moderate' => 3, 'long lasting' => 4, 'eternal' => 5
      }.freeze
      SILLAGE_SCALE = {
        'intimate' => 1, 'moderate' => 2, 'strong' => 3, 'enormous' => 4
      }.freeze

      CONCENTRATIONS = {
        /extrait de parfum|extrait/i => 'extrait',
        /eau de parfum|edp/i => 'edp',
        /eau de toilette|edt/i => 'edt',
        /cologne/i => 'cologne',
        /parfum/i => 'parfum'
      }.freeze

      def initialize(html:, source_url:, content_hash:, fetched_at:)
        @html = html
        @source_url = source_url
        @content_hash = content_hash
        @fetched_at = fetched_at
        @doc = Nokogiri::HTML(html)
      end

      def call
        payload = {
          schema_version: SCHEMA_VERSION,
          source_url: @source_url,
          source_domain: URI.parse(@source_url).host,
          source_content_hash: @content_hash,
          source_fetched_at: @fetched_at.iso8601,
          brand_name: brand_name,
          product_name: product_name,
          concentration: concentration,
          gender: gender,
          release_year: release_year,
          perfumer_names: perfumer_names,
          notes_top: notes_for('top'),
          notes_heart: notes_for('middle') + notes_for('heart'),
          notes_base: notes_for('base'),
          main_accords: main_accords,
          avg_longevity: avg_longevity,
          avg_sillage: avg_sillage,
          seasons_breakdown: seasons_breakdown,
          time_breakdown: time_breakdown,
          love_breakdown: love_breakdown,
          votes_count: votes_count,
          source_description_raw: source_description_raw,
          source_description_rewrite_required: true
        }
        payload.merge(parse_quality: quality_for(payload))
      end

      private

      def json_ld
        @json_ld ||= @doc.css('script[type="application/ld+json"]').filter_map do |node|
          JSON.parse(node.text)
        rescue JSON::ParserError
          nil
        end
      end

      def product_json
        json_ld.find { |item| item.is_a?(Hash) && item['@type'].to_s.downcase == 'product' } || {}
      end

      def body_text
        @body_text ||= @doc.at('body')&.text.to_s.gsub(/\s+/, ' ').strip
      end

      def h1_text
        @h1_text ||= @doc.at('h1')&.text.to_s.gsub(/\s+/, ' ').strip
      end

      def brand_name
        # Primary: parse URL — Fragrantica no longer emits JSON-LD and itemprop tags
        # can be overwritten by ads/recommendations in the Vue SPA.
        url_brand = @source_url[%r{/perfume/([^/]+)/}, 1]
        return url_brand.gsub('-', ' ').strip if url_brand.present?

        brand = product_json['brand']
        return brand['name'].to_s.presence if brand.is_a?(Hash)
        return brand.to_s.presence if brand.present?

        title = @doc.at('title')&.text.to_s
        title[/\A.+?\s+(.+?)\s+(?:for|в)\s+/i, 1]&.strip
      end

      def product_name
        # Primary: strip fid and extension from last URL segment.
        url_product = @source_url[%r{/([^/]+)-\d+\.html\z}, 1]
        return url_product.gsub('-', ' ').strip if url_product.present?

        product_json['name'].to_s.presence || h1_text.sub(/\s+#{Regexp.escape(brand_name.to_s)}\z/i, '').presence
      end

      def concentration
        source = "#{h1_text} #{body_text}"
        CONCENTRATIONS.each do |pattern, value|
          return value if source.match?(pattern)
        end
        nil
      end

      def gender
        text = body_text.downcase
        return 'unisex' if text.match?(/for (women and men|men and women)|unisex/)
        return 'men' if text.include?('for men')
        return 'women' if text.include?('for women')

        nil
      end

      def release_year
        year = body_text[/launched in\s+(\d{4})/i, 1] || body_text[/released in\s+(\d{4})/i, 1]
        return nil unless year

        value = year.to_i
        value.between?(1800, Time.current.year + 1) ? value : nil
      end

      def perfumer_names
        names = body_text[/nose behind this fragrance is\s+(.+?)(?:\.|$)/i, 1] ||
                body_text[/noses behind this fragrance are\s+(.+?)(?:\.|$)/i, 1]
        return [] unless names

        names.split(/\s*(?:,| and )\s*/).map(&:strip).reject(&:blank?).uniq
      end

      def notes_for(label)
        heading = @doc.css('h4').find { |n| n.text.strip.downcase.include?("#{label} notes") }
        heading ||= @doc.css('h1,h2,h3,h5,strong,b').find { |n| n.text.strip.downcase.include?("#{label} notes") }
        return [] unless heading

        # Fragrantica's Tailwind HTML nests h4 inside a div.relative wrapper.
        # Note links are in the NEXT SIBLING of that wrapper, not siblings of h4 itself.
        search_root = heading.next_element
        if search_root.nil? && heading.parent&.name == 'div'
          search_root = heading.parent.next_element
        end
        return [] unless search_root

        search_root.css('a').map { |link| clean_text(link.text) }.reject(&:blank?).uniq
      end

      def main_accords
        marker = @doc.xpath("//*[contains(translate(normalize-space(text()), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'main accords')]").first
        return [] unless marker

        bars = marker.parent.css('[style*="width"]')
        if bars.any?
          # v2 path: read bar widths directly (style="width: NN.N%")
          bars.filter_map do |bar|
            width = bar['style'][/width:\s*([\d.]+)%/, 1]&.to_f
            name  = clean_text(bar.text)
            next if name.blank? || name.downcase == 'main accords'

            { name: name, weight: width }
          end.uniq { |a| a[:name] }.first(12)
        else
          # v1 fallback: no bar widths present — return nil weight
          marker.parent.css('span, div').map { |node| clean_text(node.text) }
            .reject { |text| text.blank? || text.downcase == 'main accords' }
            .uniq
            .first(12)
            .map { |name| { name: name, weight: nil } }
        end
      end

      # Returns a label→bar_width_percent hash for a named vote-bar section.
      # The section is identified by its text anchor (e.g. "Longevity").
      # Returns {} when the section is absent.
      def vote_bars_for(label_text)
        anchor = @doc.xpath(
          "//*[normalize-space(text())='#{label_text}']"
        ).first
        return {} unless anchor

        anchor.parent.css('[style*="width"]').each_with_object({}) do |bar, hash|
          pct  = bar['style'][/width:\s*([\d.]+)%/, 1]&.to_f
          text = clean_text(bar.text)
          hash[text] = pct if pct && text.present?
        end
      end

      # Weighted average longevity on the 1–5 Fragrantica scale.
      def avg_longevity
        weighted_avg(vote_bars_for('Longevity'), LONGEVITY_SCALE)
      end

      # Weighted average sillage on the 1–4 Fragrantica scale.
      def avg_sillage
        weighted_avg(vote_bars_for('Sillage'), SILLAGE_SCALE)
      end

      def seasons_breakdown
        vote_bars_for('Season').transform_keys(&:downcase)
      end

      def time_breakdown
        vote_bars_for('Time of Day').transform_keys(&:downcase)
      end

      def love_breakdown
        vote_bars_for('Rating').transform_keys(&:downcase)
      end

      def votes_count
        # itemprop=ratingCount carries the machine-readable count (no nbsp issues).
        node = @doc.css('[itemprop="ratingCount"]').first
        return node['content'].to_i if node&.attr('content')
        return node.text.gsub(/[^\d]/, '').to_i if node

        match = body_text[/(\d[\d,\s]+)\s+vote/i, 1]
        match&.gsub(/[^\d]/, '')&.to_i
      end

      # Computes (sum of scale_value * pct) / (sum of pct) for overlapping keys.
      def weighted_avg(bars, scale)
        return nil if bars.empty?

        total_pct   = 0.0
        weighted    = 0.0
        bars.each do |label, pct|
          scale_val = scale[label.downcase]
          next unless scale_val

          weighted  += scale_val * pct
          total_pct += pct
        end
        return nil if total_pct.zero?

        (weighted / total_pct).round(2)
      end

      def source_description_raw
        @doc.css('p').map { |node| clean_text(node.text) }.find { |text| text.include?(' by ') || text.include?(' fragrance ') } ||
          product_json['description'].to_s.presence
      end

      def quality_for(payload)
        found = REQUIRED_QUALITY_FIELDS.select { |field| present_field?(payload[field.to_sym]) }
        {
          found_fields: found,
          missing_fields: REQUIRED_QUALITY_FIELDS - found,
          warnings: warnings_for(payload)
        }
      end

      def warnings_for(payload)
        [].tap do |warnings|
          warnings << 'expressive_source_description_requires_rewrite' if payload[:source_description_raw].present?
          warnings << 'no_note_pyramid_found' if payload[:notes_top].empty? && payload[:notes_heart].empty? && payload[:notes_base].empty?
        end
      end

      def present_field?(value)
        value.respond_to?(:empty?) ? !value.empty? : !value.nil?
      end

      def clean_text(value)
        value.to_s.gsub(/\s+/, ' ').strip
      end
    end
  end
end
