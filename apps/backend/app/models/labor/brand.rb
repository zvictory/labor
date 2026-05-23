module Labor
  class Brand < ApplicationRecord
    extend Mobility
    translates :description, :story, backend: :table

    has_many :product_fragrance_details, class_name: 'Labor::ProductFragranceDetail', foreign_key: :labor_brand_id, dependent: :restrict_with_error
    has_many :products, through: :product_fragrance_details, source: :product

    validates :slug, presence: true, uniqueness: true, format: { with: /\A[a-z0-9-]+\z/ }
    validates :name, presence: true

    scope :active,    -> { where(active: true) }
    scope :niche,     -> { where(niche: true) }
  end
end
