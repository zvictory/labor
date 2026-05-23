module Labor
  class Note < ApplicationRecord
    extend Mobility
    translates :name, :description, backend: :table

    FAMILIES = %w[citrus floral woody oriental fougere chypre gourmand aromatic aquatic green leather smoky].freeze

    has_many :product_notes, class_name: 'Labor::ProductNote', foreign_key: :labor_note_id, dependent: :destroy
    has_many :products, through: :product_notes, source: :product

    validates :slug, presence: true, uniqueness: true, format: { with: /\A[a-z0-9-]+\z/ }
    validates :family, inclusion: { in: FAMILIES }, allow_nil: true
  end
end
