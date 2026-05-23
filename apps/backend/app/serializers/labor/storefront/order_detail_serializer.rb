module Labor
  module Storefront
    # Detailed payload for /storefront/account/orders/:number
    # (apps/web account → order detail). Flat JSON, NOT JSON:API.
    module OrderDetailSerializer
      module_function

      def call(order)
        {
          id: order.id,
          number: order.number,
          state: order.state,
          completed_at: order.completed_at&.iso8601,
          total: order.total.to_i,
          line_items: order.line_items.map { |li| line_item_hash(li) },
          ship_address: ship_address_hash(order.ship_address),
          shipments: order.shipments.map { |s| { state: s.state, tracking: s.tracking } },
          payments: order.payments.map { |p| payment_hash(p) }
        }
      end

      def line_item_hash(li)
        product = li.variant&.product
        {
          name: product&.name.to_s,
          slug: product&.slug.to_s,
          image: product ? first_image_url(product) : '',
          quantity: li.quantity,
          price: li.price.to_i,
          line_total: li.amount.to_i
        }
      end

      def ship_address_hash(addr)
        return nil unless addr

        {
          name: [addr.firstname, addr.lastname].compact.join(' '),
          phone: addr.phone,
          city: addr.city,
          address1: addr.address1,
          address2: addr.address2,
          zipcode: addr.zipcode
        }
      end

      def payment_hash(payment)
        method_label =
          if payment.payment_method
            payment.payment_method.type.presence || payment.payment_method.name.to_s
          else
            ''
          end
        { state: payment.state, method: method_label }
      end

      def first_image_url(product)
        img = product.images.first
        return '' unless img&.attachment&.attached?

        Rails.application.routes.url_helpers.rails_blob_url(
          img.attachment,
          host: ENV.fetch('PUBLIC_HOST', 'http://localhost:4000')
        )
      rescue StandardError
        ''
      end
    end
  end
end
