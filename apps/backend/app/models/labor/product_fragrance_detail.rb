module Labor
  class ProductFragranceDetail < ApplicationRecord
    GENDERS = %w[men women unisex].freeze
    CONCENTRATIONS = %w[edc edt edp parfum extrait cologne].freeze

    belongs_to :product, class_name: 'Spree::Product', foreign_key: :spree_product_id
    belongs_to :brand,   class_name: 'Labor::Brand',   foreign_key: :labor_brand_id, optional: true

    validates :gender, inclusion: { in: GENDERS }
    validates :concentration, inclusion: { in: CONCENTRATIONS }, allow_nil: true

    def recompute_aggregates!
      votes = Labor::Vote.where(spree_product_id: spree_product_id)
      cnt = votes.count

      if cnt.zero?
        update!(
          avg_rating: 0, avg_longevity: 0, avg_sillage: 0,
          votes_count: 0,
          seasons_breakdown: {}, time_breakdown: {}, love_breakdown: {}
        )
        return
      end

      update!(
        avg_rating:    (votes.where.not(rating: nil).average(:rating)    || 0).round(2),
        avg_longevity: (votes.where.not(longevity: nil).average(:longevity) || 0).round(2),
        avg_sillage:   (votes.where.not(sillage: nil).average(:sillage)   || 0).round(2),
        votes_count:   cnt,
        seasons_breakdown: aggregate_array(votes, :seasons),
        time_breakdown:    aggregate_array(votes, :time_of_day),
        love_breakdown:    aggregate_enum(votes, :love_level)
      )
    end

    private

    def aggregate_array(votes, column)
      counts = Hash.new(0)
      total = 0
      votes.find_each do |v|
        arr = Array(v[column])
        next if arr.empty?
        total += 1
        arr.each { |k| counts[k.to_s] += 1 }
      end
      return {} if total.zero?
      counts.transform_values { |n| (n.to_f / total).round(3) }
    end

    def aggregate_enum(votes, column)
      total = votes.where.not(column => nil).count
      return {} if total.zero?
      votes.where.not(column => nil).group(column).count
        .transform_values { |n| (n.to_f / total).round(3) }
    end
  end
end
