module Spree
  module Api
    module V2
      module Storefront
        class PerfumersController < ::Spree::Api::V2::BaseController
          def index
            with_locale do
              perfumers = Labor::Perfumer.joins(:product_perfumers).distinct.order(:name)
              render json: { data: perfumers.map { |p| Labor::Storefront::PerfumerSerializer.call(p) } }
            end
          end

          def show
            with_locale do
              perfumer = Labor::Perfumer.find_by(slug: params[:slug])
              return render(json: { error: 'not_found' }, status: :not_found) unless perfumer
              render json: { data: Labor::Storefront::PerfumerSerializer.call(perfumer, with_products: true) }
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
