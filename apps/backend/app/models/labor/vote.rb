module Labor
  class Vote < ApplicationRecord
    LOVE_LEVELS = %w[love like neutral dislike hate].freeze
    SEASONS     = %w[winter spring summer autumn].freeze
    TIME_BANDS  = %w[day evening night].freeze

    belongs_to :product, class_name: 'Spree::Product', foreign_key: :spree_product_id
    belongs_to :user,    class_name: 'Spree::User',    foreign_key: :spree_user_id

    validates :rating,    numericality: { in: 1..5 }, allow_nil: true
    validates :longevity, numericality: { in: 1..5 }, allow_nil: true
    validates :sillage,   numericality: { in: 1..5 }, allow_nil: true
    validates :love_level, inclusion: { in: LOVE_LEVELS }, allow_nil: true
    validate  :validate_seasons
    validate  :validate_time_of_day

    after_commit :enqueue_product_aggregates_refresh

    private

    def validate_seasons
      bad = Array(seasons) - SEASONS
      errors.add(:seasons, "invalid: #{bad.join(',')}") if bad.any?
    end

    def validate_time_of_day
      bad = Array(time_of_day) - TIME_BANDS
      errors.add(:time_of_day, "invalid: #{bad.join(',')}") if bad.any?
    end

    def enqueue_product_aggregates_refresh
      Labor::RefreshProductAggregatesJob.perform_later(spree_product_id)
    end
  end
end
