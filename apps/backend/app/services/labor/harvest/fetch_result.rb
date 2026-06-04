module Labor
  module Harvest
    FetchResult = Data.define(:url, :body, :status, :headers, :fetched_at)
  end
end
