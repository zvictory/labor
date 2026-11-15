# Labor — agent rules

The project rules live in [CLAUDE.md](CLAUDE.md): stack, where things live, how to run
the store locally without Docker, conventions and don'ts. Read it before changing code.

In short: one Next.js app, `apps/store`, with its own Postgres through Prisma. The
earlier Spree stack (Rails backend, old storefront, old bot, shared packages) has been
removed; there is no Spree, Rails, Redis or Sidekiq anywhere in this repository.
