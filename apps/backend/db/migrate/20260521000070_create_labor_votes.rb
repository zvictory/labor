class CreateLaborVotes < ActiveRecord::Migration[7.1]
  def change
    create_table :labor_votes do |t|
      t.references :spree_product, null: false, foreign_key: { to_table: :spree_products }, index: { name: 'idx_votes_product' }
      t.references :spree_user,    null: false, foreign_key: { to_table: :spree_users },    index: { name: 'idx_votes_user' }

      t.integer :rating       # 1..5
      t.integer :longevity    # 1..5 (poor, weak, moderate, long, very long)
      t.integer :sillage      # 1..5 (intimate, moderate, strong, enormous)
      t.string  :love_level   # love, like, neutral, dislike, hate
      t.jsonb   :seasons, default: [] # [winter, spring, summer, autumn]
      t.jsonb   :time_of_day, default: [] # [day, evening, night]

      t.timestamps
    end
    add_index :labor_votes, [:spree_product_id, :spree_user_id], unique: true, name: 'idx_votes_unique'
  end
end
