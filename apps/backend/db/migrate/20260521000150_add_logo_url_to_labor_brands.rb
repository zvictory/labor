class AddLogoUrlToLaborBrands < ActiveRecord::Migration[7.1]
  def change
    add_column :labor_brands, :logo_url, :string
  end
end
