# Labor — Tasks & Verification Todo

- [x] Unzip codebase archive
- [x] Configure local Docker environment overrides (`docker-compose.override.yml`)
- [x] Build and start local backing services (Postgres, Redis, Sidekiq, Rails backend)
- [x] Restore database backup (`db/labor_development.sql`)
- [x] Populate backend container storage with Active Storage assets (`storage/`)
- [x] Install project package dependencies (`npm install`)
- [x] Audit development environment versions and establish project rules
- [x] Verify frontend storefront pages render properly on local host (`http://localhost:3001`)
- [x] Check console/network logs in storefront for any API connection errors
- [x] Verify that brand/note/perfumer filters successfully route to unified catalog and filter products properly
- [x] Preserve search query params when switching active locale (`LocaleSwitcher`)
- [x] Implement FallbackImage component to defensively render fallback content on missing or failing image assets for brands, perfumers, and notes
- [x] Create and execute catalog validation Rake task to verify catalog product relationships in database
