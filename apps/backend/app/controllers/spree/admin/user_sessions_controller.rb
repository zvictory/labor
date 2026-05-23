module Spree
  module Admin
    class UserSessionsController < Devise::SessionsController
      layout false

      def new
        @spree_user = Spree::User.new
        super
      end

      def create
        user = Spree::User.find_for_database_authentication(email: params.dig(:spree_user, :email))
        unless user&.valid_password?(params.dig(:spree_user, :password))
          flash.now[:error] = 'Invalid email or password.'
          @spree_user = Spree::User.new(email: params.dig(:spree_user, :email))
          render :new, status: :unauthorized and return
        end

        unless user.has_spree_role?('admin')
          flash.now[:error] = 'You are not authorized to access the admin area.'
          @spree_user = Spree::User.new(email: params.dig(:spree_user, :email))
          render :new, status: :forbidden and return
        end

        warden.set_user(user, scope: :spree_user, store: true)
        sign_in(:spree_user, user, force: true)
        Rails.logger.info "[admin-login] signed in spree_user##{user.id}, warden.user(:spree_user)=#{warden.user(:spree_user)&.id.inspect}"
        redirect_to(session.delete('spree_user_return_to') || spree.admin_path)
      end

      def destroy
        sign_out(:spree_user)
        redirect_to spree.admin_login_path
      end
    end
  end
end
