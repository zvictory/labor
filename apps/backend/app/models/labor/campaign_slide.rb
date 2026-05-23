module Labor
  class CampaignSlide < ApplicationRecord
    extend Mobility
    translates :title, :subtitle, :cta_label, backend: :table

    belongs_to :campaign,
               class_name: 'Labor::Campaign',
               foreign_key: :labor_campaign_id,
               inverse_of: :slides

    validates :position, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

    default_scope { order(position: :asc, id: :asc) }
  end

end
