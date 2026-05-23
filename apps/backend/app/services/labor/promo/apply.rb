module Labor
  module Promo
    class Apply
      Result = Struct.new(:success?, :promotion, :discount_uzs, :error_code, keyword_init: true)

      def self.call(order:, code:)
        new(order, code).call
      end

      def initialize(order, code)
        @order = order
        @code = code.to_s.strip.upcase
      end

      def call
        return failure(:blank) if @code.empty?

        promotion = Spree::Promotion.active.find_by('UPPER(code) = ?', @code)
        return failure(:not_found) unless promotion
        return failure(:limit_reached) if promotion.usage_limit_exceeded?
        return failure(:not_eligible) unless promotion.eligible?(@order)

        promotion.activate(order: @order)
        @order.update_with_updater!

        discount = (@order.adjustment_total.abs).to_d
        Result.new(success?: true, promotion: promotion, discount_uzs: discount.to_i)
      end

      private

      def failure(code)
        Result.new(success?: false, error_code: code, discount_uzs: 0)
      end
    end
  end
end
