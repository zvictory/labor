class AddTelegramToSpreeUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :spree_users, :telegram_id,        :bigint
    add_column :spree_users, :telegram_username,  :string
    add_column :spree_users, :telegram_first_name,:string
    add_column :spree_users, :telegram_last_name, :string
    add_column :spree_users, :telegram_photo_url, :string
    add_column :spree_users, :telegram_auth_date, :datetime
    add_column :spree_users, :preferred_locale,   :string, default: 'ru', null: false

    add_index :spree_users, :telegram_id, unique: true
    add_index :spree_users, :telegram_username
  end
end
