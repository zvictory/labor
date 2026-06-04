module Labor
  module Storefront
    # Backs the storefront vote widget (apps/web .../pdp/vote-widget.tsx),
    # which POSTs to /api/v2/storefront/votes with a devise_token_auth token.
    #
    # One vote per (user, product): labor_votes has a unique index
    # `idx_votes_unique` on (spree_product_id, spree_user_id), so a repeat
    # vote is an UPDATE, not a duplicate row — this action is an upsert keyed
    # on the authenticated user.
    #
    # We deliberately load/save a real AR object (find_or_initialize_by + save)
    # rather than upsert_all so BOTH the model validations and the after_commit
    # that enqueues Labor::RefreshProductAggregatesJob (fix B-3) run — a bulk
    # upsert would skip callbacks and the aggregates would never refresh.
    class VotesController < ::Spree::Api::V2::BaseController
      before_action :require_authentication!

      # The widget seeds these to 0 ("not rated") and sends them even when the
      # user only set the headline rating. The model validates 1..5 (allow_nil),
      # so a 0 would 422 a legitimate partial vote — coerce 0 -> nil.
      RATING_FIELDS = %i[rating longevity sillage].freeze

      # A concurrent first-vote from the same user can lose the INSERT race on
      # idx_votes_unique; one retry turns the second pass into an UPDATE.
      MAX_UPSERT_RETRIES = 1

      def create
        attempts = 0
        begin
          vote = Labor::Vote.find_or_initialize_by(
            spree_product_id: params[:product_id],
            spree_user_id: current_user.id
          )
          vote.assign_attributes(vote_attributes)

          if vote.save
            render json: { data: serialize(vote) }
          else
            render json: { error: 'invalid', details: vote.errors.full_messages },
                   status: :unprocessable_entity
          end
        rescue ActiveRecord::RecordNotUnique
          attempts += 1
          retry if attempts <= MAX_UPSERT_RETRIES
          raise
        end
      end

      private

      def vote_attributes
        attrs = params.permit(
          :rating, :longevity, :sillage, :love_level,
          seasons: [], time_of_day: []
        ).to_h.symbolize_keys

        RATING_FIELDS.each { |f| attrs[f] = nil if attrs[f].to_i.zero? }
        attrs[:love_level] = nil if attrs[:love_level].blank?
        attrs
      end

      def serialize(vote)
        {
          id:          vote.id,
          product_id:  vote.spree_product_id,
          rating:      vote.rating,
          longevity:   vote.longevity,
          sillage:     vote.sillage,
          love_level:  vote.love_level,
          seasons:     vote.seasons,
          time_of_day: vote.time_of_day
        }
      end
    end
  end
end
