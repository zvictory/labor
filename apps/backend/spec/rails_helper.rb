require 'spec_helper'
ENV['RAILS_ENV'] ||= 'test'
require_relative '../config/environment'
abort('The Rails environment is running in production mode!') if Rails.env.production?
require 'rspec/rails'
require 'database_cleaner/active_record'
Dir[Rails.root.join('spec/support/**/*.rb')].each { |f| require f }

# Backend test container talks to the test DB via DATABASE_URL — that
# triggers DatabaseCleaner's "remote URL" safeguard. Allow it explicitly.
DatabaseCleaner.allow_remote_database_url = true

begin
  ActiveRecord::Migration.maintain_test_schema!
rescue ActiveRecord::PendingMigrationError => e
  abort e.to_s.strip
end

RSpec.configure do |config|
  config.fixture_paths = [Rails.root.join('spec/fixtures').to_s]
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!

  # Concurrency specs tagged `concurrent: true` MUST run outside the
  # surrounding transaction — otherwise the test wraps both threads in a
  # single tx that PG serializes, defeating the race we want to expose.
  config.before(:each, concurrent: true) do
    self.use_transactional_tests = false if respond_to?(:use_transactional_tests=)
    DatabaseCleaner.strategy = :deletion
    DatabaseCleaner.start
  end

  config.after(:each, concurrent: true) do
    DatabaseCleaner.clean
  end
end
