module Spree
  module Api
    module V2
      module Storefront
        # Spree 5 port: V2::BaseController was removed. Inherit from V3::BaseController
        # (not V3::Store::BaseController) so we don't require the publishable API key —
        # apps/web and apps/bot don't send one and we keep public URLs unchanged.
        class BrandsController < ::Spree::Api::V2::BaseController
          def index
            with_locale do
              brands = Labor::Brand.joins(:product_fragrance_details).distinct.order(:name)
              render json: { data: brands.map { |b| Labor::Storefront::BrandSerializer.call(b) } }
            end
          end

          def show
            with_locale do
              brand = Labor::Brand.find_by(slug: params[:slug])
              return render(json: { error: 'not_found' }, status: :not_found) unless brand
              render json: { data: Labor::Storefront::BrandSerializer.call(brand, with_products: true) }
            end
          end

          private

          def with_locale(&blk)
            lang = (request.headers['Accept-Language'] || I18n.default_locale).to_s.split(/[,;]/).first.to_s.split('-').first
            locale = lang.presence || I18n.default_locale
            Mobility.with_locale(locale, &blk)
          end
        end
      end
    end
  end
end
