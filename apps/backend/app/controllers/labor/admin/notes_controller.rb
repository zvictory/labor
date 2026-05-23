module Labor
  module Admin
    class NotesController < Spree::Admin::BaseController
      helper Labor::AdminHelpers
      before_action :load_note, only: %i[show edit update destroy]

      def index
        @notes = Labor::Note.order(:family, :name)
      end

      def show
        redirect_to spree.edit_admin_labor_note_path(@note)
      end

      def new
        @note = Labor::Note.new
      end

      def create
        @note = Labor::Note.new(note_params)
        if @note.save
          redirect_to spree.edit_admin_labor_note_path(@note), notice: 'Note created.'
        else
          flash.now[:error] = @note.errors.full_messages.to_sentence
          render :new, status: :unprocessable_content
        end
      end

      def edit
      end

      def update
        if @note.update(note_params)
          redirect_to spree.edit_admin_labor_note_path(@note), notice: 'Note updated.'
        else
          flash.now[:error] = @note.errors.full_messages.to_sentence
          render :edit, status: :unprocessable_content
        end
      end

      def destroy
        if @note.destroy
          redirect_to spree.admin_labor_notes_path, notice: 'Note deleted.'
        else
          redirect_to spree.admin_labor_notes_path, alert: @note.errors.full_messages.to_sentence
        end
      end

      private

      def load_note
        @note = Labor::Note.find(params[:id])
      end

      def note_params
        params.require(:labor_note).permit(:slug, :name, :family, :icon_url)
      end
    end
  end
end
