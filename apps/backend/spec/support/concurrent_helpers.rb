require 'concurrent-ruby'

# The backend's HostAuthorization middleware rejects rack-test's default
# `www.example.com`. Force `localhost` on every request spec instead of
# poking config.hosts (which is captured at boot by the middleware).
RSpec.configure do |c|
  c.before(:each, type: :request) { host! 'localhost' }
end

# Helpers for race-condition specs. Each thread takes its own DB connection
# (so they don't serialize on a single shared one) and synchronises on a
# CyclicBarrier so the requests are released in lockstep.
module ConcurrentHelpers
  def run_in_parallel(count, &block)
    barrier = Concurrent::CyclicBarrier.new(count)
    results = Array.new(count)
    threads = (0...count).map do |i|
      Thread.new do
        ActiveRecord::Base.connection_pool.with_connection do
          barrier.wait
          results[i] = block.call(i)
        rescue => e
          results[i] = e
        end
      end
    end
    threads.each(&:join)
    results
  end
end

RSpec.configure { |c| c.include ConcurrentHelpers }
