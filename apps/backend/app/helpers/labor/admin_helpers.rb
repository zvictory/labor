module Labor
  module AdminHelpers
    def admin_breadcrumb(*args, &block)
      content_for :page_title do
        args.first.to_s
      end
      nil
    end
  end
end
