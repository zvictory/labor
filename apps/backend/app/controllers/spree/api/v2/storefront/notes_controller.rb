module Spree
  module Api
    module V2
      module Storefront
        class NotesController < ::Spree::Api::V2::BaseController
          def index
            with_locale do
              notes = Labor::Note.joins(:product_notes).distinct.order(:name)
              render json: { data: notes.map { |n| Labor::Storefront::NoteSerializer.call(n) } }
            end
          end

          def show
            with_locale do
              note = Labor::Note.find_by(slug: params[:slug])
              return render(json: { error: 'not_found' }, status: :not_found) unless note
              render json: { data: Labor::Storefront::NoteSerializer.call(note, with_products: true) }
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
