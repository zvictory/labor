module Labor
  module Delivery
    # Translates a Spree::Order into the Yandex Delivery /check-price payload.
    #
    # Yandex needs two route points (pickup at warehouse, drop at customer) and
    # an items array with weight + dimensions. We default missing physical attrs
    # to small-perfume-box values so a quote can still be produced.
    class YandexQuoteBuilder
      WAREHOUSE = {
        coordinates: [
          ENV.fetch('LABOR_WAREHOUSE_LON', '69.279741').to_f,
          ENV.fetch('LABOR_WAREHOUSE_LAT', '41.311081').to_f
        ],
        fullname: ENV.fetch('LABOR_WAREHOUSE_ADDRESS', 'Tashkent, Labor warehouse'),
        contact: {
          name: ENV.fetch('LABOR_WAREHOUSE_CONTACT', 'Labor'),
          phone: ENV.fetch('LABOR_WAREHOUSE_PHONE', '+998000000000')
        }
      }.freeze

      DEFAULT_ITEM_WEIGHT_KG = 0.4
      DEFAULT_DIMENSIONS_M   = { length: 0.12, width: 0.10, height: 0.08 }.freeze

      def self.call(order:)
        new(order).call
      end

      def initialize(order)
        @order = order
      end

      def call
        {
          items: items_for(@order),
          route_points: [pickup_point, dropoff_point],
          requirements: { taxi_class: 'courier', cargo_options: ['thermobag'] }
        }
      end

      private

      def items_for(order)
        order.line_items.map do |li|
          {
            quantity: li.quantity,
            cost_value: li.amount.to_s,
            cost_currency: 'UZS',
            weight: DEFAULT_ITEM_WEIGHT_KG,
            size: DEFAULT_DIMENSIONS_M,
            title: li.variant.product.name
          }
        end
      end

      def pickup_point
        {
          point_id: 1,
          visit_order: 1,
          type: 'source',
          address: WAREHOUSE.slice(:coordinates, :fullname),
          contact: WAREHOUSE[:contact]
        }
      end

      def dropoff_point
        addr = @order.ship_address
        {
          point_id: 2,
          visit_order: 2,
          type: 'destination',
          address: {
            coordinates: [addr.try(:longitude).to_f, addr.try(:latitude).to_f],
            fullname: [addr&.city, addr&.address1, addr&.address2].compact.reject(&:empty?).join(', ')
          },
          contact: { name: [@order.bill_address&.firstname, @order.bill_address&.lastname].compact.join(' '), phone: @order.bill_address&.phone.to_s }
        }
      end
    end
  end
end
