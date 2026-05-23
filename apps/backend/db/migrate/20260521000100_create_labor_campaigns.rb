class CreateLaborCampaigns < ActiveRecord::Migration[7.1]
  def change
    create_table :labor_campaigns do |t|
      t.string :slug, null: false
      t.string :status, null: false, default: 'draft' # draft, scheduled, active, ended
      t.string :hero_image_url
      t.datetime :starts_at
      t.datetime :ends_at
      t.references :spree_promotion, foreign_key: { to_table: :spree_promotions }, index: { name: 'idx_camp_promo' }
      t.boolean :broadcast_to_telegram, default: false, null: false
      t.datetime :broadcast_sent_at
      t.timestamps
    end
    add_index :labor_campaigns, :slug, unique: true
    add_index :labor_campaigns, :status

    create_table :labor_campaign_translations do |t|
      t.references :labor_campaign, null: false, foreign_key: true, index: { name: 'idx_camp_trans_camp' }
      t.string :locale, null: false
      t.string :title
      t.text   :subtitle
      t.text   :body
      t.string :cta_label
      t.timestamps
    end
    add_index :labor_campaign_translations, [:labor_campaign_id, :locale], unique: true, name: 'idx_camp_trans_locale'

    create_table :labor_campaign_products do |t|
      t.references :labor_campaign, null: false, foreign_key: true, index: { name: 'idx_camp_prod_camp' }
      t.references :spree_product,  null: false, foreign_key: { to_table: :spree_products }, index: { name: 'idx_camp_prod_prod' }
      t.integer :position, default: 0, null: false
    end
    add_index :labor_campaign_products, [:labor_campaign_id, :spree_product_id], unique: true, name: 'idx_camp_prod_unique'
  end
end
