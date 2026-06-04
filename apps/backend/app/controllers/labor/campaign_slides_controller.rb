module Labor
  class CampaignSlidesController < Spree::Admin::BaseController
    before_action :load_campaign
    before_action :load_slide, only: %i[edit update destroy]

    LOCALES = %w[ru en uz].freeze unless defined?(LOCALES)

    def index
      redirect_to spree.edit_admin_labor_campaign_path(@campaign)
    end

    def new
      @slide = @campaign.slides.build(position: next_position)
    end

    def create
      @slide = @campaign.slides.build(slide_params)
      if @slide.save
        redirect_to spree.edit_admin_labor_campaign_path(@campaign), notice: 'Slide created.'
      else
        flash.now[:error] = @slide.errors.full_messages.to_sentence
        render :new, status: :unprocessable_content
      end
    end

    def edit
    end

    def update
      if @slide.update(slide_params)
        redirect_to spree.edit_admin_labor_campaign_path(@campaign), notice: 'Slide updated.'
      else
        flash.now[:error] = @slide.errors.full_messages.to_sentence
        render :edit, status: :unprocessable_content
      end
    end

    def destroy
      @slide.destroy
      redirect_to spree.edit_admin_labor_campaign_path(@campaign), notice: 'Slide deleted.'
    end

    private

    def load_campaign
      @campaign = Labor::Campaign.find(params[:labor_campaign_id])
    end

    def load_slide
      @slide = @campaign.slides.find(params[:id])
    end

    def next_position
      (@campaign.slides.maximum(:position) || -1) + 1
    end

    def slide_params
      permitted = [:image_url, :link_url, :position]
      LOCALES.each do |loc|
        permitted += [:"title_#{loc}", :"subtitle_#{loc}", :"cta_label_#{loc}"]
      end
      params.require(:labor_campaign_slide).permit(*permitted)
    end
  end
end
