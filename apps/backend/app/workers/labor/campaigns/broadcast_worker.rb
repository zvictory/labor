module Labor
  module Campaigns
    class BroadcastWorker
      include Sidekiq::Job
      sidekiq_options queue: :broadcasts, retry: 3

      def perform(campaign_id)
        campaign = Labor::Campaign.find_by(id: campaign_id)
        return if campaign.nil?
        return if campaign.broadcast_sent_at.present?
        return unless campaign.broadcastable?

        chat_id = ENV['TELEGRAM_CHANNEL_CHAT_ID']
        if chat_id.blank?
          Rails.logger.warn("[campaign-broadcast] TELEGRAM_CHANNEL_CHAT_ID not configured; skipping campaign=#{campaign.id}")
          return
        end

        text = build_message(campaign)
        post_to_bot!(chat_id: chat_id, text: text)
        campaign.update!(broadcast_sent_at: Time.current)
      end

      private

      def build_message(campaign)
        Mobility.with_locale(:ru) do
          title    = ERB::Util.html_escape(campaign.title.to_s)
          body     = ERB::Util.html_escape(campaign.body.to_s)
          base_url = ENV['PUBLIC_URL'].presence || ENV.fetch('WEBAPP_URL', '')
          link     = "#{base_url}/ru/campaigns/#{campaign.slug}"
          parts = ["<b>#{title}</b>"]
          parts << body if body.present?
          parts << %(<a href="#{ERB::Util.html_escape(link)}">#{ERB::Util.html_escape(link)}</a>)
          parts.join("\n\n")
        end
      end

      def post_to_bot!(chat_id:, text:)
        Labor::Telegram::InternalNotifyClient.post!(
          event: 'channel',
          payload: { chat_id: chat_id, text: text, parse_mode: 'HTML' }
        )
      end
    end
  end
end
