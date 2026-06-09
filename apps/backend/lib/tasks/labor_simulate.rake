# Commerce prerequisites for manual COD checkout simulation.
#
# Usage:
#   docker cp apps/backend/lib/tasks/labor_simulate.rake \
#             labor-backend-1:/app/lib/tasks/labor_simulate.rake
#   docker exec labor-backend-1 bundle exec rake labor:simulate:setup
#   docker exec labor-backend-1 bundle exec rake labor:simulate:status
#
# What it seeds (idempotent):
#   1. Zone "Uzbekistan" with a ZoneMember for the UZ country.
#      Without a zone that matches the ship address country, no shipping rate
#      computes and advance_order stalls at `delivery`.
#   2. ShippingMethod "Курьер (симуляция)" — flat-rate 0 UZS, covers the UZ
#      zone and the "Default" shipping category.
#   3. Shipping-category fix — any product whose shipping_category_id is nil gets
#      assigned "Default".  A rate only appears when the method's categories
#      intersect the variant's category; a nil category = no rate = stall at delivery.
#   4. COD PaymentMethod (Spree::PaymentMethod::Check, store-scoped) so a real
#      Spree::Order record appears in admin. The checkout_controller.rb `cod`
#      branch never creates a Spree::Payment; it just stamps payment_state:
#      balance_due directly, so no provider credentials are needed.

namespace :labor do
  namespace :simulate do

    desc 'Seed commerce prerequisites for manual COD checkout simulation (idempotent)'
    task setup: :environment do
      store = Spree::Store.default

      # ── 1. Zone + ZoneMember ─────────────────────────────────────────────────
      country = Spree::Country.find_by!(iso: 'UZ')
      zone = Spree::Zone.find_or_create_by!(name: 'Uzbekistan') do |z|
        z.description = 'Uzbekistan (labor simulate)'
      end
      Spree::ZoneMember.find_or_create_by!(zone: zone, zoneable: country)
      puts "Zone: #{zone.name} (id=#{zone.id}) ✓"

      # ── 2. ShippingMethod ────────────────────────────────────────────────────
      # Spree validates presence of: calculator, display_on (inclusion), and
      # at least one shipping_category.  Build all three in memory before save!
      shipping_category = Spree::ShippingCategory.find_by!(name: 'Default')
      sm = Spree::ShippingMethod.find_by(admin_name: 'labor_sim_courier')
      if sm.nil?
        sm = Spree::ShippingMethod.new(
          name:       'Курьер (симуляция)',
          admin_name: 'labor_sim_courier',
          display_on: 'both'
        )
        sm.calculator = Spree::Calculator::Shipping::FlatRate.new(
          preferences: { amount: 0, currency: 'UZS' }
        )
        sm.shipping_categories = [shipping_category]
        sm.save!
      end
      # Ensure zone membership idempotently (no validation requires zones, so safe post-save)
      sm.zone_ids = (sm.zone_ids + [zone.id]).uniq
      sm.save!
      puts "ShippingMethod: #{sm.name} (id=#{sm.id}) zones=#{sm.zone_ids.inspect} ✓"

      # ── 3. Shipping-category on all products ─────────────────────────────────
      null_count = Spree::Product.where(shipping_category_id: nil).count
      if null_count > 0
        Spree::Product.where(shipping_category_id: nil)
                      .update_all(shipping_category_id: shipping_category.id)
        puts "Assigned 'Default' shipping category to #{null_count} product(s) ✓"
      else
        puts 'All products already have a shipping category ✓'
      end

      # ── 4. COD PaymentMethod (store-scoped) ──────────────────────────────────
      cod = Spree::PaymentMethod.find_or_create_by!(
        type: 'Spree::PaymentMethod::Check',
        name: 'Наличными при получении'
      ) do |pm|
        pm.active     = true
        pm.display_on = 'both'
      end
      cod.update!(active: true) unless cod.active?
      cod.stores << store unless cod.stores.include?(store)
      puts "PaymentMethod: #{cod.name} (id=#{cod.id}) active=#{cod.active?} ✓"

      puts "\n✓ Setup complete. Run `labor:simulate:status` to verify."
    end

    desc 'Print status of simulation prerequisites (read-only)'
    task status: :environment do
      store = Spree::Store.default
      puts "=== Simulation prerequisites — store: #{store.name} ==="

      uz_country = Spree::Country.find_by(iso: 'UZ')
      zone_ok    = uz_country && Spree::ZoneMember.where(zoneable: uz_country).exists?
      puts "Zone containing UZ:             #{zone_ok ? '✓' : '✗ MISSING — run setup'}"

      sm_count = Spree::ShippingMethod.where(deleted_at: nil).count
      puts "ShippingMethod(s):             #{sm_count > 0 ? "✓ #{sm_count}" : '✗ NONE — run setup'}"

      null_sc = Spree::Product.where(shipping_category_id: nil).count
      puts "Products missing category:     #{null_sc.zero? ? '✓ 0' : "✗ #{null_sc} — run setup"}"

      cod_count = Spree::PaymentMethod
                    .joins(:stores)
                    .where(spree_stores: { id: store.id }, active: true)
                    .count
      puts "Active PaymentMethods (store): #{cod_count > 0 ? "✓ #{cod_count}" : '✗ NONE — run setup'}"
    end

  end
end
