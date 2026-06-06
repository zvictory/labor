# Generates 10 / 20 / 30 ml size options for every active perfume product.
#
# Design:
#   • One OptionType "size" + 3 OptionValues (10ml, 20ml, 30ml).
#   • 3 non-master Variants per product, keyed by deterministic SKU suffix for
#     idempotency: "<master_sku>-10ml", "<master_sku>-20ml", "<master_sku>-30ml".
#   • Images: variants inherit master images via Spree's image fallback — no copy needed.
#   • Pricing (UZS, rounded to nearest 1 000):
#       30 ml  = current master price  P
#       20 ml  = round(P × 2/3, 1 000)
#       10 ml  = round(P × 1/3, 1 000)
#   • Backfills volume_ml = 30 on ProductFragranceDetail where it is 0/nil (fixes
#     the "0 ml" display bug for the default/displayed size).
#   • Idempotent: find_or_create_by! on all stable keys; safe to re-run.
#
# Usage:
#   docker cp apps/backend/lib/tasks/labor_sizes.rake labor-backend-1:/app/lib/tasks/
#   docker exec labor-backend-1 bundle exec rake labor:sizes:generate

# Helper module — defined before the namespace block so it's callable inside tasks.
module Labor
  module Sizes
    SIZES = [
      { ml: 10, fraction: Rational(1, 3) },
      { ml: 20, fraction: Rational(2, 3) },
      { ml: 30, fraction: Rational(1, 1) },
    ].freeze

    def self.round_to_1000(amount)
      (amount / 1_000.0).round * 1_000
    end
  end
end

namespace :labor do
  namespace :sizes do
    desc 'Generate 10/20/30 ml size variants for all active perfume products (idempotent)'
    task generate: :environment do
      sizes     = Labor::Sizes::SIZES
      round1k   = Labor::Sizes.method(:round_to_1000)

      # ── Ensure option type + values exist ──────────────────────────────
      size_ot = Spree::OptionType.find_or_create_by!(name: 'size') do |ot|
        ot.presentation = 'Size'
        ot.position = 1
      end

      option_values = sizes.each_with_object({}) do |s, h|
        h[s[:ml]] = Spree::OptionValue.find_or_create_by!(
          option_type: size_ot,
          name:        "#{s[:ml]}ml",
        ) do |ov|
          ov.presentation = "#{s[:ml]} ml"
          ov.position     = sizes.index(s) + 1
        end
      end

      puts "OptionType 'size' id=#{size_ot.id}"
      puts "OptionValues: #{option_values.transform_values(&:id)}"

      # ── Scope: active products with a fragrance detail ──────────────────
      products = Spree::Product
        .active
        .joins(:labor_fragrance_detail)
        .includes(:master, :product_option_types, :option_types)

      total = products.count
      puts "Products to process: #{total}"

      created_variants = 0
      updated_prices   = 0
      updated_vol_ml   = 0
      errors           = []

      stock_location = Spree::StockLocation.active.first

      products.find_each do |product|
        begin
          # Link option type to product (idempotent)
          Spree::ProductOptionType.find_or_create_by!(
            product:     product,
            option_type: size_ot,
          ) { |pot| pot.position = 1 }

          master       = product.master
          master_sku   = master.sku.presence || "product-#{product.id}"
          master_price = master.default_price&.amount.to_i

          if master_price.nil? || master_price.zero?
            errors << "#{product.slug}: no master price, skipping"
            next
          end

          sizes.each do |size|
            sku = "#{master_sku}-#{size[:ml]}ml"
            ov  = option_values[size[:ml]]

            # Find existing variant by deterministic SKU, or build a new one.
            # IMPORTANT: option values must be assigned BEFORE save! because Spree
            # validates `option_values presence: true` on non-master variants.
            variant = Spree::Variant.find_by(sku: sku, product: product)

            if variant.nil?
              variant = product.variants.build(
                sku:             sku,
                is_master:       false,
                track_inventory: false,
              )
              variant.option_value_ids = [ov.id]   # assign before save
              variant.save!
              created_variants += 1
            elsif variant.option_values.exclude?(ov)
              variant.option_values << ov
            end

            # ── Price ────────────────────────────────────────────────────
            target_price = round1k.call(master_price * size[:fraction])

            price_rec = Spree::Price.find_or_initialize_by(
              variant:  variant,
              currency: 'UZS',
            )
            if price_rec.amount.to_i != target_price
              price_rec.amount = target_price
              price_rec.save!
              updated_prices += 1
            end

            # ── Stock item (required for Spree checkout) ─────────────────
            if stock_location
              si = Spree::StockItem.find_or_initialize_by(
                stock_location: stock_location,
                variant:        variant,
              )
              if si.new_record?
                si.count_on_hand = 9_999
                si.backorderable = true
                si.save!
              end
            end
          end

          # ── Backfill volume_ml = 30 where it's 0 / nil ────────────────
          detail = product.labor_fragrance_detail
          if detail && detail.volume_ml.to_i.zero?
            detail.update_columns(volume_ml: 30)
            updated_vol_ml += 1
          end
        rescue => e
          errors << "#{product.slug}: #{e.message}"
          Rails.logger.error "[labor:sizes] #{product.slug}: #{e.message}"
        end
      end

      puts "\n=== Done ==="
      puts "New variants created:   #{created_variants}"
      puts "Prices updated/created: #{updated_prices}"
      puts "volume_ml backfilled:   #{updated_vol_ml}"
      puts "Errors:                 #{errors.size}"
      errors.each { |e| puts "  ERROR: #{e}" }
    end

    desc 'Remove all size variants and OptionType (rollback labor:sizes:generate)'
    task rollback: :environment do
      size_ot = Spree::OptionType.find_by(name: 'size')
      unless size_ot
        puts 'No size OptionType found — nothing to roll back.'
        next
      end

      size_ov_ids = size_ot.option_values.pluck(:id)
      destroyed   = Spree::Variant
        .joins(:option_values)
        .where(spree_option_values: { id: size_ov_ids })
        .where(is_master: false)
        .destroy_all
        .size

      pot_count = Spree::ProductOptionType.where(option_type: size_ot).delete_all

      puts "Destroyed #{destroyed} size variants."
      puts "Removed #{pot_count} ProductOptionType links."
    end
  end
end
