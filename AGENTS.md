# Labor — agent rules

The project rules live in [CLAUDE.md](CLAUDE.md): stack, where things live, how to run
the store locally without Docker, conventions and don'ts. Read it before changing code.

In short: one Next.js app, `apps/store`, with its own Postgres through Prisma, plus the
live Telegram bot in `apps/bot`, which is connected to Billz and must be left as it is.
The earlier Spree stack (Rails backend, old storefront, shared packages) has been
removed; there is no Spree, Rails, Redis or Sidekiq anywhere in this repository.
