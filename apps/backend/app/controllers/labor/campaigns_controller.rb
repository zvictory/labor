module Labor
  class CampaignsController < Spree::Admin::BaseController
    before_action :load_campaign, only: %i[show edit update destroy broadcast]

    LOCALES = %w[ru en uz uzc].freeze unless defined?(LOCALES)

    def index
      @campaigns = Labor::Campaign.order(created_at: :desc)
    end

    def show
      redirect_to spree.edit_admin_labor_campaign_path(@campaign)
    end

    def new
      @campaign = Labor::Campaign.new(status: 'draft')
    end

    def create
      @campaign = Labor::Campaign.new(campaign_params)
      if @campaign.save
        sync_product_ids(@campaign)
        redirect_to spree.edit_admin_labor_campaign_path(@campaign), notice: 'Campaign created.'
      else
        flash.now[:error] = @campaign.errors.full_messages.to_sentence
        render :new, status: :unprocessable_content
      end
    end

    def edit
    end

    def update
      if @campaign.update(campaign_params)
        sync_product_ids(@campaign)
        redirect_to spree.edit_admin_labor_campaign_path(@campaign), notice: 'Campaign updated.'
      else
        flash.now[:error] = @campaign.errors.full_messages.to_sentence
        render :edit, status: :unprocessable_content
      end
    end

    def destroy
      if Labor::Campaign::STATUSES.include?('ended') && @campaign.status != 'ended'
        @campaign.update(status: 'ended')
        redirect_to spree.admin_labor_campaigns_path, notice: 'Campaign archived (set to ended).'
      else
        @campaign.destroy
        redirect_to spree.admin_labor_campaigns_path, notice: 'Campaign deleted.'
      end
    end

    def broadcast
      unless @campaign.broadcastable?
        respond_to do |format|
          format.html { redirect_back fallback_location: spree.admin_dashboard_path, alert: 'Campaign is not broadcastable.' }
          format.json { render json: { error: 'not_broadcastable' }, status: :unprocessable_content }
        end
        return
      end

      Labor::Campaigns::BroadcastWorker.perform_async(@campaign.id)

      respond_to do |format|
        format.html { redirect_back fallback_location: spree.admin_dashboard_path, notice: 'Broadcast enqueued.' }
        format.json { render json: { status: 'enqueued', campaign_id: @campaign.id }, status: :accepted }
      end
    end

    private

    def load_campaign
      @campaign = Labor::Campaign.find(params[:id])
    end

    def campaign_params
      permitted = [
        :slug, :status, :hero_image_url, :starts_at, :ends_at,
        :spree_promotion_id, :broadcast_to_telegram
      ]
      LOCALES.each do |loc|
        permitted += [:"title_#{loc}", :"subtitle_#{loc}", :"body_#{loc}", :"cta_label_#{loc}"]
      end
      params.require(:labor_campaign).permit(*permitted)
    end

    def sync_product_ids(campaign)
      ids = params.dig(:labor_campaign, :product_ids)
      return if ids.nil?

      ids = Array(ids).reject(&:blank?).map(&:to_i)
      campaign.product_ids = ids
    end
  end
end
