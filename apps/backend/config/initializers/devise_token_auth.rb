DeviseTokenAuth.setup do |config|
  config.change_headers_on_each_request = false
  config.token_lifespan = 30.days
  config.batch_request_buffer_throttle = 5.seconds
  config.headers_names = {
    'access-token' => 'access-token',
    'client' => 'client',
    'expiry' => 'expiry',
    'uid' => 'uid',
    'token-type' => 'token-type'
  }
  config.bypass_sign_in = true
  config.default_callbacks = false
end
