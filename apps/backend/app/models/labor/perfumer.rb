module Labor
  class Perfumer < ApplicationRecord
    extend Mobility
    translates :bio, backend: :table

    has_many :product_perfumers, class_name: 'Labor::ProductPerfumer', foreign_key: :labor_perfumer_id, dependent: :destroy
    has_many :products, through: :product_perfumers, source: :product

    validates :slug, presence: true, uniqueness: true, format: { with: /\A[a-z0-9-]+\z/ }
    validates :name, presence: true
  end

end
