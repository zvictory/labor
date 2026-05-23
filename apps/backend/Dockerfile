ARG RUBY_VERSION=3.3.5
FROM ruby:${RUBY_VERSION}-slim-bookworm AS base

ENV BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_JOBS=4 \
    BUNDLE_RETRY=3 \
    RAILS_ENV=production \
    LANG=C.UTF-8 \
    TZ=Asia/Tashkent

WORKDIR /app

RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    libpq-dev \
    libvips42 \
    libyaml-dev \
    libffi-dev \
    curl \
    tzdata \
  && rm -rf /var/lib/apt/lists/*

# ---- Dependencies ----
FROM base AS deps
COPY Gemfile Gemfile.lock* ./
RUN gem install bundler -v '~> 2.5' \
 && bundle config set --local without 'development test' \
 && bundle install

# ---- App ----
FROM base AS app
COPY --from=deps /usr/local/bundle /usr/local/bundle
COPY . .

# Spree 5.4 admin uses tailwindcss-ruby (standalone binary, no Node).
# SECRET_KEY_BASE_DUMMY lets us precompile without a real secret.
RUN SECRET_KEY_BASE_DUMMY=1 \
    bundle exec rails assets:precompile

RUN groupadd -r rails && useradd -r -g rails -d /app rails \
 && chown -R rails:rails /app
USER rails

EXPOSE 3000
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]

# ---- Dev target ----
FROM base AS dev
ENV RAILS_ENV=development \
    BUNDLE_PATH=/usr/local/bundle
RUN gem install bundler -v '~> 2.5'
COPY Gemfile Gemfile.lock* ./
RUN bundle install
COPY . .
# One-shot Tailwind build for the admin so dev boots with CSS ready.
RUN bundle exec rails spree:admin:tailwindcss:build || true
EXPOSE 3000
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0"]
