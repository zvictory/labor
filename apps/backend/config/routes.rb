Rails.application.routes.draw do
  mount_devise_token_auth_for 'Spree::User', at: 'api/v2/auth', controllers: {
    sessions: 'spree/api/v2/auth/sessions'
  }, skip: [:omniauth_callbacks]

  mount Spree::Core::Engine, at: '/'

  Spree::Core::Engine.routes.draw do
    devise_scope :spree_user do
      get    'admin/login',  to: '/spree/admin/user_sessions#new',     as: :admin_login
      post   'admin/login',  to: '/spree/admin/user_sessions#create',  as: :admin_login_post
      delete 'admin/logout', to: '/spree/admin/user_sessions#destroy', as: :admin_logout
    end

    namespace :admin do
      resources :labor_campaigns, controller: '/labor/campaigns' do
        member do
          post :broadcast
        end
        resources :slides,
                  controller: '/labor/campaign_slides',
                  except: :show
      end

      get 'debug', to: '/spree/admin/debug#show'
      resources :labor_brands,    controller: '/labor/admin/brands'
      resources :labor_notes,     controller: '/labor/admin/notes'
      resources :labor_perfumers, controller: '/labor/admin/perfumers'
    end

    namespace :api do
      namespace :v2 do
        namespace :storefront do
          post 'auth/telegram/widget', to: 'telegram_auth#widget'
          post 'auth/telegram/webapp', to: 'telegram_auth#webapp'

          resources :payments, only: [] do
            collection do
              post 'click/prepare', to: 'payments/click#prepare'
              post 'click/complete', to: 'payments/click#complete'
              post 'payme/rpc',     to: 'payments/payme#rpc'
              post 'uzum/callback', to: 'payments/uzum#callback'
            end
          end

          resources :delivery, only: [] do
            collection do
              post 'yandex/quote',      to: 'delivery/yandex#quote'
              post 'yandex/webhook',    to: 'delivery/yandex#webhook'
              post 'express24/quote',   to: 'delivery/express24#quote'
              post 'express24/webhook', to: 'delivery/express24#webhook'
              get  'bts/export.csv',    to: 'delivery/bts#export'
            end
          end

          resources :campaigns, only: %i[index show], param: :slug
          resources :brands,    only: %i[index show], param: :slug
          resources :notes,     only: %i[index show], param: :slug
          resources :perfumers, only: %i[index show], param: :slug
          get 'filter_facets', to: 'filter_facets#index'
          get 'search', to: 'search#index'
          post 'checkout',          to: 'checkout#create'
          post 'promo/apply',       to: 'promo#apply'
          get   'account/orders',         to: '/labor/storefront/account#orders'
          get   'account/orders/:number', to: '/labor/storefront/account#order'
          patch 'account/locale',         to: 'account_locale#update'

          # Labor flat-DTO products (Spree 5 port of the products decorator).
          get 'products',         to: '/labor/storefront/products#index'
          get 'products/:slug',   to: '/labor/storefront/products#show'
        end
      end
    end
  end

  get 'up', to: 'rails/health#show', as: :rails_health_check
  get '__debug_session', to: 'debug_session#show'
end
