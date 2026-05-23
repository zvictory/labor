Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*Array(ENV.fetch('CORS_ORIGINS', 'http://localhost:3001')).flat_map { |o| o.split(',') })
    resource '/api/*',
      headers: :any,
      expose: %w[access-token expiry client uid token-type],
      methods: %i[get post put patch delete options head]
  end
end
