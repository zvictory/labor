module Spree
  module Api
    module V2
      # Spree 5.4 removed the V2 namespace from spree_api. Labor's storefront
      # routes still live under /api/v2/... and inheriting controllers expect
      # this constant. This shim re-introduces it as an alias of V3::BaseController
      # (not V3::Store::BaseController, which would require a publishable API key
      # that apps/web and apps/bot do not send).
      class BaseController < ::Spree::Api::V3::BaseController
      end
    end
  end
end
