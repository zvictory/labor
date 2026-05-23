module Labor
  class Campaign < ApplicationRecord
    extend Mobility
    translates :title, :subtitle, :body, :cta_label, backend: :table

    STATUSES = %w[draft scheduled active ended].freeze

    belongs_to :promotion, class_name: 'Spree::Promotion', foreign_key: :spree_promotion_id, optional: true
    has_many :campaign_products, class_name: 'Labor::CampaignProduct', foreign_key: :labor_campaign_id, dependent: :destroy
    has_many :products, through: :campaign_products, source: :product
    has_many :slides,
             -> { order(position: :asc, id: :asc) },
             class_name: 'Labor::CampaignSlide',
             foreign_key: :labor_campaign_id,
             inverse_of: :campaign,
             dependent: :destroy
    accepts_nested_attributes_for :slides, allow_destroy: true

    validates :slug, presence: true, uniqueness: true
    validates :status, inclusion: { in: STATUSES }

    scope :live, -> { where(status: 'active').where('starts_at IS NULL OR starts_at <= ?', Time.current).where('ends_at IS NULL OR ends_at >= ?', Time.current) }

    has_one_attached :banner if respond_to?(:has_one_attached)

    def broadcastable?
      %w[active scheduled].include?(status) && broadcast_to_telegram && broadcast_sent_at.blank?
    end
  end

  class CampaignProduct < ApplicationRecord
    belongs_to :campaign, class_name: 'Labor::Campaign',   foreign_key: :labor_campaign_id
    belongs_to :product,  class_name: 'Spree::Product',    foreign_key: :spree_product_id
  end
end
