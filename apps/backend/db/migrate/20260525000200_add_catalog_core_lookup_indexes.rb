class AddCatalogCoreLookupIndexes < ActiveRecord::Migration[7.1]
  disable_ddl_transaction!

  def up
    enable_extension 'pg_trgm' if supports_extensions? && extension_available?('pg_trgm') && !extension_enabled?('pg_trgm')

    add_index_unless_exists :labor_product_fragrance_details,
                            [:gender, :spree_product_id],
                            name: 'idx_pfd_gender_product',
                            algorithm: :concurrently

    add_index_unless_exists :labor_product_fragrance_details,
                            [:avg_rating, :spree_product_id],
                            name: 'idx_pfd_rating_product',
                            order: { avg_rating: :desc, spree_product_id: :desc },
                            algorithm: :concurrently

    add_trgm_index_unless_exists :spree_products, :name, 'idx_spree_products_name_trgm'
    add_trgm_index_unless_exists :spree_product_translations, :name, 'idx_product_translations_name_trgm'
    add_trgm_index_unless_exists :labor_brands, :name, 'idx_labor_brands_name_trgm'
    add_trgm_index_unless_exists :labor_note_translations, :name, 'idx_note_translations_name_trgm'
    add_trgm_index_unless_exists :labor_notes, :family, 'idx_labor_notes_family_trgm'
    add_trgm_index_unless_exists :labor_perfumers, :name, 'idx_labor_perfumers_name_trgm'
  end

  def down
    remove_index_if_exists :labor_perfumers, name: 'idx_labor_perfumers_name_trgm'
    remove_index_if_exists :labor_notes, name: 'idx_labor_notes_family_trgm'
    remove_index_if_exists :labor_note_translations, name: 'idx_note_translations_name_trgm'
    remove_index_if_exists :labor_brands, name: 'idx_labor_brands_name_trgm'
    remove_index_if_exists :spree_product_translations, name: 'idx_product_translations_name_trgm'
    remove_index_if_exists :spree_products, name: 'idx_spree_products_name_trgm'
    remove_index_if_exists :labor_product_fragrance_details, name: 'idx_pfd_rating_product'
    remove_index_if_exists :labor_product_fragrance_details, name: 'idx_pfd_gender_product'
  end

  private

  def add_trgm_index_unless_exists(table_name, column_name, index_name)
    return if index_name_exists?(table_name, index_name)

    add_index table_name,
              column_name,
              name: index_name,
              using: :gin,
              opclass: :gin_trgm_ops,
              where: "#{column_name} IS NOT NULL",
              algorithm: :concurrently
  end

  def add_index_unless_exists(table_name, columns, options)
    return if index_name_exists?(table_name, options.fetch(:name))

    add_index table_name, columns, **options
  end

  def remove_index_if_exists(table_name, options)
    return unless index_name_exists?(table_name, options.fetch(:name))

    remove_index table_name, **options, algorithm: :concurrently
  end
end
