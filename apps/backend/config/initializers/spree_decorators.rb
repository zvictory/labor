# Spree's gem-side loader only globs decorators inside its own gem dir. Host
# decorators (app/**/*_decorator*.rb) need this explicit loader — otherwise
# Zeitwerk leaves them un-referenced in dev mode and the .prepend at the
# bottom of each file never runs.
Rails.application.config.to_prepare do
  Dir.glob(Rails.root.join('app/**/*_decorator*.rb')) do |c|
    Rails.application.config.cache_classes ? require(c) : load(c)
  end
end
