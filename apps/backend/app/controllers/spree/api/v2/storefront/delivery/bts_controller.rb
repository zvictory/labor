module Spree
  module Api
    module V2
      module Storefront
        module Delivery
          # BTS Express CSV export endpoint for ops dashboard.
          # Auth: relies on devise_token_auth headers + admin role.
          class BtsController < ::Spree::Api::V2::BaseController
            before_action :require_admin!

            def export
              csv = Labor::Delivery::BtsCsvExporter.call
              filename = "bts_export_#{Time.current.strftime('%Y%m%d_%H%M')}.csv"
              send_data csv, type: 'text/csv; charset=utf-8', disposition: "attachment; filename=#{filename}"
            end

            private

            def require_admin!
              return if try_spree_current_user&.has_spree_role?('admin')
              render json: { error: 'forbidden' }, status: :forbidden
            end
          end
        end
      end
    end
  end
end
