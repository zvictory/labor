module Spree
  module Api
    module V2
      module Storefront
        class CampaignsController < ::Spree::Api::V2::BaseController
          def index
            campaigns = Labor::Campaign.live.order(starts_at: :desc)
            render json: { data: campaigns.map { |c| summary(c) } }
          end

          def show
            campaign = Labor::Campaign.live.find_by!(slug: params[:slug])
            render json: { data: detail(campaign) }
          end

          private

          def summary(c)
            Mobility.with_locale(I18n.locale) do
              {
                slug: c.slug,
                title: c.title,
                description: c.body,
                banner_url: banner_url_for(c),
                starts_at: c.starts_at,
                ends_at: c.ends_at,
                products_count: c.products.count
              }
            end
          end

          def detail(c)
            Mobility.with_locale(I18n.locale) do
              {
                slug: c.slug,
                title: c.title,
                description: c.body,
                banner_url: banner_url_for(c),
                promo_code: c.promotion&.code,
                starts_at: c.starts_at,
                ends_at: c.ends_at,
                products: c.products.includes(:images, :master, labor_fragrance_detail: :brand).map { |p| product_payload(p) }
              }
            end
          end

          def product_payload(p)
            {
              id: p.id,
              slug: p.slug,
              name: p.name,
              brand: p.labor_fragrance_detail&.brand&.name,
              image: p.images.first&.url(:product),
              price: p.master.default_price.amount.to_i,
              sale_price: nil
            }
          end

          def banner_url_for(c)
            return nil unless c.respond_to?(:banner) && c.banner.attached?
            Rails.application.routes.url_helpers.rails_blob_url(c.banner, host: ENV.fetch('BACKEND_PUBLIC_URL', request.base_url))
          rescue StandardError
            nil
          end
        end
      end
    end
  end
end
