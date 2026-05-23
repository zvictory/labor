require 'rails_helper'

# Covers the warden-session bridge in
# `Spree::Admin::BaseControllerDecorator` (via `Labor::AdminAuth`). The
# decorator exists because devise-token-auth's `current_spree_user` returns
# nil on cookie-only admin requests. These specs lock in the two basic
# behaviors so a Devise/Warden upgrade can't silently break admin login.
RSpec.describe 'Spree::Admin auth', type: :request do
  describe 'GET /admin/login' do
    it 'renders the login page' do
      get '/admin/login'
      expect(response).to have_http_status(:ok)
    end
  end

  describe 'GET /admin' do
    it 'redirects to /admin/login when no session is present' do
      get '/admin'
      expect(response).to redirect_to('/admin/login')
    end
  end
end
