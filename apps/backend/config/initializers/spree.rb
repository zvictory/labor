# Headless Spree (no spree_auth_devise) — declare the user class ourselves so
# Spree.user_class.new in Spree::Ability#initialize has a real constant.
Spree.user_class = 'Spree::User'
# Spree 5 split user_class (storefront customers) from admin_user_class (staff).
# In our headless setup both are still `Spree::User`: staff just have an
# admin role on the same model. This must be set BEFORE the engine boots,
# so migrations that call Spree.admin_user_class.table_name don't crash.
Spree.admin_user_class = 'Spree::User'

# All previous `Spree.config { ... }` keys (currency, checkout_zone,
# allow_guest_checkout, address_requires_state, always_put_site_name_in_title)
# are deprecated in Spree 5.4 and removed in 5.5+. Their behavior now comes
# from per-record settings:
#   - `currency` → Spree::Store#default_currency (already "UZS" on store id=3)
#   - `checkout_zone` → Markets (we don't need one; storefront only ships UZ
#     and validates city in Labor::Storefront::Express24Controller)
#   - `address_requires_state` → Spree::Country#states_required
#     (Spree::Country.find_by(iso: 'UZ').states_required = false)
#   - `allow_guest_checkout` → enforced at controller level; Labor requires
#     Telegram auth before /checkout regardless
#   - `always_put_site_name_in_title` → not applicable (headless, no
#     Spree views render <title>)
# Leaving the block empty keeps the file as the documented config entry point
# for the next person without firing deprecation warnings on every boot.
