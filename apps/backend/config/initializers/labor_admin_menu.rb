# Adds Labor's custom admin sidebar items: Brands, Notes, Perfumers,
# Campaigns, and a "Missing images" filter shortcut under Products.
#
# Spree 5.x dropped the MainMenu/ItemBuilder DSL from spree_backend and
# moved menu registration to spree_admin's `Spree.admin.navigation.sidebar`
# Navigation registry (a wrapper around simple-navigation). Items are
# registered in an `after_initialize` block — see spree_admin's own
# spree_admin_navigation.rb initializer for the upstream pattern we mirror.
#
# Submenu items pass `parent: :products` to attach under the existing
# Products section. Top-level items use the open position range 200+ to
# stay below Spree's stock items (10..120).
Rails.application.config.after_initialize do
  next unless Spree.respond_to?(:admin) && Spree.admin.respond_to?(:navigation)

  sidebar_nav = Spree.admin.navigation.sidebar

  # Missing images: shortcut under Products for the triage view.
  sidebar_nav.add :missing_images,
                  parent: :products,
                  label: 'admin.missing_images',
                  url: -> { spree.admin_products_path(q: { missing_images: 1 }) },
                  position: 50,
                  active: -> { controller_name == 'products' && params.dig(:q, :missing_images).present? },
                  if: -> { can?(:manage, Spree::Product) }

  # Brands (catalog metadata, top-level).
  sidebar_nav.add :labor_brands,
                  label: 'admin.tabs.labor_brands',
                  url: :admin_labor_brands_path,
                  icon: 'tag',
                  position: 200,
                  active: -> { controller_path.start_with?('labor/admin/brands') },
                  if: -> { can?(:manage, Spree::Product) }

  # Fragrance notes (catalog metadata).
  sidebar_nav.add :labor_notes,
                  label: 'admin.tabs.labor_notes',
                  url: :admin_labor_notes_path,
                  icon: 'leaf',
                  position: 210,
                  active: -> { controller_path.start_with?('labor/admin/notes') },
                  if: -> { can?(:manage, Spree::Product) }

  # Perfumers (catalog metadata).
  sidebar_nav.add :labor_perfumers,
                  label: 'admin.tabs.labor_perfumers',
                  url: :admin_labor_perfumers_path,
                  icon: 'user',
                  position: 220,
                  active: -> { controller_path.start_with?('labor/admin/perfumers') },
                  if: -> { can?(:manage, Spree::Product) }

  # Telegram broadcast campaigns.
  sidebar_nav.add :labor_campaigns,
                  label: 'admin.tabs.labor_campaigns',
                  url: :admin_labor_campaigns_path,
                  icon: 'megaphone',
                  position: 230,
                  active: -> { controller_path.start_with?('labor/admin/campaigns') },
                  if: -> { can?(:manage, Spree::Order) }
end
