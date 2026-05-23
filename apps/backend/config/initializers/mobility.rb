Mobility.configure do
  plugins do
    backend :table

    active_record
    reader
    writer

    locale_accessors
    fallbacks
    presence
    cache
    query
    default
  end
end
