module Labor
  class Accord < ApplicationRecord
    extend Mobility
    translates :name, backend: :table

    has_many :product_accords, class_name: 'Labor::ProductAccord', dependent: :destroy
    has_many :products, through: :product_accords, source: :product

    validates :slug, presence: true, uniqueness: true
    validates :color_hex, format: { with: /\A#?[0-9A-Fa-f]{6}\z/ }, allow_nil: true
  end

end
