module Spree
  module ProductDecorator
    def self.prepended(base)
      base.has_one :labor_fragrance_detail,
                   class_name: 'Labor::ProductFragranceDetail',
                   foreign_key: :spree_product_id,
                   dependent: :destroy
      base.has_many :labor_product_notes,
                    class_name: 'Labor::ProductNote',
                    foreign_key: :spree_product_id,
                    dependent: :destroy
      base.has_many :labor_product_accords,
                    class_name: 'Labor::ProductAccord',
                    foreign_key: :spree_product_id,
                    dependent: :destroy
      base.has_one :labor_top_product_accord,
                   -> { order(weight: :desc, id: :asc) },
                   class_name: 'Labor::ProductAccord',
                   foreign_key: :spree_product_id
      base.has_many :labor_product_perfumers,
                    class_name: 'Labor::ProductPerfumer',
                    foreign_key: :spree_product_id,
                    dependent: :destroy

      # Products whose master variant has no attached images. Used by the
      # admin "Missing images" sidebar link so staff can triage manually.
      base.scope :missing_images, ->(flag = true) {
        next all unless ActiveModel::Type::Boolean.new.cast(flag)
        with_master_images = Spree::Variant.where(is_master: true).joins(:images).select(:product_id)
        where.not(id: with_master_images)
      }

      # ransackable_scopes is a class method on Spree::Product; defining it on
      # the decorator module alone doesn't expose it to the model — we have to
      # land it in base's singleton class so Ransack can find it.
      base.singleton_class.class_eval do
        define_method(:ransackable_scopes) do |_auth_object = nil|
          existing = begin
            method(:ransackable_scopes).super_method&.call(_auth_object) || []
          rescue StandardError
            []
          end
          existing + %i[missing_images]
        end
      end
    end
  end
end

Spree::Product.prepend(Spree::ProductDecorator)
