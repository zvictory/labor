class CreateLaborCampaignSlides < ActiveRecord::Migration[7.1]
  def change
    create_table :labor_campaign_slides do |t|
      t.references :labor_campaign, null: false, foreign_key: true, index: { name: 'idx_camp_slide_camp' }
      t.string :image_url
      t.string :link_url
      t.integer :position, default: 0, null: false
      t.timestamps
    end
    add_index :labor_campaign_slides, [:labor_campaign_id, :position], name: 'idx_camp_slide_position'

    create_table :labor_campaign_slide_translations do |t|
      t.references :labor_campaign_slide, null: false, foreign_key: true, index: { name: 'idx_camp_slide_trans_slide' }
      t.string :locale, null: false
      t.string :title
      t.text   :subtitle
      t.string :cta_label
      t.timestamps
    end
    add_index :labor_campaign_slide_translations,
              [:labor_campaign_slide_id, :locale],
              unique: true,
              name: 'idx_camp_slide_trans_locale'
  end
end
