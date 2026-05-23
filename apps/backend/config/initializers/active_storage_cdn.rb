# frozen_string_literal: true

# Active Storage + CDN (CloudFront / generic edge).
#
# When CDN_BASE_URL is set, Propshaft assets and Active Storage representations
# are served via the CDN host. `asset_host` covers `/rails/active_storage/...`
# proxy + redirect URLs too — the CDN must forward signed query params
# (e.g. `?response-content-disposition=...&X-Amz-Signature=...`) without
# stripping them, otherwise private blob URLs will 403.
#
# No-op in dev / when CDN_BASE_URL is unset.

if ENV['CDN_BASE_URL'].present?
  Rails.application.config.action_controller.asset_host = ENV['CDN_BASE_URL']
end
